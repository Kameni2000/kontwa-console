using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Kontwa.Api.Auth;
using Kontwa.Api.Data;
using Kontwa.Api.Domain;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

// JSON : camelCase et statuts en texte ("recue", "preparation"…), comme le front Angular.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IConsoleStore>(sp => new InMemoryConsoleStore(sp.GetRequiredService<TimeProvider>().GetLocalNow()));

// Clé de signature : lue dans la configuration (variable d'environnement en production),
// sinon générée au démarrage (les sessions expirent alors à chaque redémarrage).
var configuredKey = builder.Configuration["Auth:SigningKey"];
var signingKey = string.IsNullOrEmpty(configuredKey) ? RandomNumberGenerator.GetBytes(32) : Convert.FromBase64String(configuredKey);
builder.Services.AddSingleton(sp => new TokenService(signingKey, sp.GetRequiredService<TimeProvider>()));

builder.Services
    .AddAuthentication(TokenAuthenticationHandler.SchemeName)
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, TokenAuthenticationHandler>(TokenAuthenticationHandler.SchemeName, null);
builder.Services.AddAuthorization();

// Limite les tentatives de connexion : 10 par minute et par adresse IP.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "inconnu",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Les erreurs métier deviennent des réponses JSON { message } avec le bon code HTTP.
app.Use(async (ctx, next) =>
{
    try
    {
        await next(ctx);
    }
    catch (DomainException e)
    {
        ctx.Response.StatusCode = e.StatusCode;
        await ctx.Response.WriteAsJsonAsync(new { message = e.Message });
    }
    catch (BadHttpRequestException)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { message = "Requête invalide." });
    }
});

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Mot de passe de démo : on ne garde que son empreinte (hash), jamais le texte clair.
var hasher = new PasswordHasher<UserInfo>();
var demoHash = hasher.HashPassword(DemoData.DemoUser, DemoData.DemoPassword);

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new { status = "ok" }));

api.MapPost("/auth/login", (LoginRequest req, TokenService tokens) =>
{
    var emailOk = string.Equals(req.Email?.Trim(), DemoData.DemoEmail, StringComparison.OrdinalIgnoreCase);
    var passwordOk = emailOk && hasher.VerifyHashedPassword(DemoData.DemoUser, demoHash, req.Password ?? "") != PasswordVerificationResult.Failed;
    return passwordOk
        ? Results.Ok(new LoginResponse(tokens.Issue(DemoData.DemoEmail), DemoData.DemoUser))
        : Results.Json(new { message = "Courriel ou mot de passe incorrect." }, statusCode: StatusCodes.Status401Unauthorized);
}).RequireRateLimiting("login");

var secured = api.MapGroup("").RequireAuthorization();

secured.MapGet("/orders", (string? status, string? q, IConsoleStore store) =>
{
    OrderStatus? filter = null;
    if (!string.IsNullOrEmpty(status))
    {
        if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
            throw new DomainException(400, $"Statut inconnu : {status}");
        filter = parsed;
    }
    return store.ListOrders(filter, q);
});

secured.MapGet("/orders/{id}", (string id, IConsoleStore store) => store.GetOrder(id));

secured.MapPatch("/orders/{id}/status", (string id, StatusChange body, IConsoleStore store, TimeProvider clock) =>
    store.ChangeStatus(id, body.Status, clock.GetLocalNow()));

// Démo : simule l'arrivée d'une commande WhatsApp.
secured.MapPost("/orders/simulate", (IConsoleStore store, TimeProvider clock) =>
{
    var order = store.AddRandomOrder(clock.GetLocalNow());
    return Results.Created($"/api/orders/{order.Id}", order);
});

secured.MapGet("/products", (IConsoleStore store) => store.ListProducts());

secured.MapPost("/products", (ProductInput input, IConsoleStore store) =>
{
    var product = store.CreateProduct(input);
    return Results.Created($"/api/products/{product.Id}", product);
});

secured.MapPut("/products/{id}", (string id, ProductInput input, IConsoleStore store) => store.UpdateProduct(id, input));

secured.MapDelete("/products/{id}", (string id, IConsoleStore store) =>
{
    store.DeleteProduct(id);
    return Results.NoContent();
});

secured.MapGet("/stats", (int? days, IConsoleStore store, TimeProvider clock) =>
    StatsCalculator.Compute(store.ListOrders(), clock.GetLocalNow(), days ?? 7));

app.Run();

/// <summary>Rendue publique pour les tests d'intégration.</summary>
public partial class Program;
