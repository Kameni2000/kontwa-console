using System.Security.Cryptography;
using Kontwa.Api.Auth;

namespace Kontwa.Api.Tests;

public class TokenServiceTests
{
    /// <summary>Horloge contrôlable pour tester l'expiration sans attendre.</summary>
    private sealed class FakeClock(DateTimeOffset now) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = now;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private readonly FakeClock _clock = new(new DateTimeOffset(2026, 10, 14, 12, 0, 0, TimeSpan.Zero));
    private readonly byte[] _key = RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void Un_jeton_emis_est_valide()
    {
        var service = new TokenService(_key, _clock);
        Assert.Equal("demo@kontwa.app", service.Validate(service.Issue("demo@kontwa.app")));
    }

    [Fact]
    public void Un_jeton_modifie_est_refuse()
    {
        var service = new TokenService(_key, _clock);
        var token = service.Issue("demo@kontwa.app");
        var tampered = (token[0] == 'A' ? "B" : "A") + token[1..];

        Assert.Null(service.Validate(tampered));
        Assert.Null(service.Validate(token + "x"));
        Assert.Null(service.Validate("n'importe quoi"));
        Assert.Null(service.Validate(null));
    }

    [Fact]
    public void Un_jeton_signe_avec_une_autre_cle_est_refuse()
    {
        var token = new TokenService(RandomNumberGenerator.GetBytes(32), _clock).Issue("demo@kontwa.app");
        Assert.Null(new TokenService(_key, _clock).Validate(token));
    }

    [Fact]
    public void Un_jeton_expire_est_refuse()
    {
        var service = new TokenService(_key, _clock);
        var token = service.Issue("demo@kontwa.app");

        _clock.Now = _clock.Now.Add(TokenService.Lifetime).AddSeconds(1);

        Assert.Null(service.Validate(token));
    }
}
