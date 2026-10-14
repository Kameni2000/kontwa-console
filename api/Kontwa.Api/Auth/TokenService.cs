using System.Security.Cryptography;
using System.Text;

namespace Kontwa.Api.Auth;

/// <summary>
/// Jetons signés HMAC-SHA256 : « email|expiration|signature » encodé en base64url.
/// Volontairement simple pour la démo ; en production on utiliserait des JWT
/// (Microsoft.AspNetCore.Authentication.JwtBearer) et une clé gardée hors du code.
/// </summary>
public sealed class TokenService(byte[] key, TimeProvider clock)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    public string Issue(string email)
    {
        var expires = clock.GetUtcNow().Add(Lifetime).ToUnixTimeSeconds();
        var payload = $"{email}|{expires}";
        return $"{Encode(Encoding.UTF8.GetBytes(payload))}.{Encode(Sign(payload))}";
    }

    /// <summary>Retourne le courriel si le jeton est authentique et non expiré, sinon null.</summary>
    public string? Validate(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        try
        {
            var payload = Encoding.UTF8.GetString(Decode(parts[0]));
            // Comparaison en temps constant : évite de deviner la signature octet par octet.
            if (!CryptographicOperations.FixedTimeEquals(Sign(payload), Decode(parts[1]))) return null;

            var fields = payload.Split('|');
            if (fields.Length != 2 || !long.TryParse(fields[1], out var expires)) return null;
            return clock.GetUtcNow().ToUnixTimeSeconds() < expires ? fields[0] : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private byte[] Sign(string payload) => HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(payload));

    private static string Encode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Decode(string text)
    {
        var s = text.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
