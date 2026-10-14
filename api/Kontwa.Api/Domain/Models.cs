namespace Kontwa.Api.Domain;

/// <summary>Statuts d'une commande. Sérialisés en camelCase : "recue", "preparation"…</summary>
public enum OrderStatus
{
    Recue,
    Preparation,
    Prete,
    Livree,
    Annulee,
}

public sealed record OrderItem(string ProductId, string Name, int Quantity, int UnitPrice);

public sealed class Order
{
    public required string Id { get; init; }
    public required string Number { get; init; }
    public required string CustomerName { get; init; }
    public required string CustomerPhone { get; init; }
    public required IReadOnlyList<OrderItem> Items { get; init; }
    public int Total => Items.Sum(i => i.Quantity * i.UnitPrice);
    public OrderStatus Status { get; set; }
    public string Channel { get; init; } = "whatsapp";
    public string? Note { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Copie indépendante : les appelants ne modifient jamais l'objet stocké.</summary>
    public Order Clone() => new()
    {
        Id = Id,
        Number = Number,
        CustomerName = CustomerName,
        CustomerPhone = CustomerPhone,
        Items = Items.ToList(),
        Status = Status,
        Channel = Channel,
        Note = Note,
        CreatedAt = CreatedAt,
        UpdatedAt = UpdatedAt,
    };
}

public sealed record Product(string Id, string Name, string Category, int Price, bool Available, string? Description);

public sealed record ProductInput(string Name, string Category, int Price, bool Available, string? Description);

public sealed record UserInfo(string Name, string Email, string Shop);

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(string Token, UserInfo User);

public sealed record StatusChange(OrderStatus Status);

public sealed record DayStat(string Date, int Revenue, int Orders);

public sealed record TopProduct(string Name, int Quantity);

public sealed record Stats(
    int RevenueToday,
    int OrdersToday,
    int AverageBasket,
    int PendingOrders,
    IReadOnlyList<DayStat> ByDay,
    IReadOnlyList<TopProduct> TopProducts);

/// <summary>Erreur métier traduite en réponse HTTP (400, 404, 409…).</summary>
public sealed class DomainException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
