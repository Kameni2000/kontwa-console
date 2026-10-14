using Kontwa.Api.Domain;

namespace Kontwa.Api.Data;

/// <summary>Données de démonstration fictives (aucune donnée réelle de client).</summary>
public static class DemoData
{
    public const string DemoEmail = "demo@kontwa.app";
    public const string DemoPassword = "demo1234";
    public static readonly UserInfo DemoUser = new("Compte démo", DemoEmail, "Saveurs de Douala (démo)");

    public static readonly IReadOnlyList<Product> Products =
    [
        new("p1", "Ndolé crevettes", "Plats", 3500, true, "Servi avec miondo ou plantain."),
        new("p2", "Poulet DG", "Plats", 4500, true, null),
        new("p3", "Poisson braisé", "Plats", 5000, true, "Bar braisé, bâton de manioc."),
        new("p4", "Eru", "Plats", 3000, true, null),
        new("p5", "Koki", "Entrées", 1500, true, null),
        new("p6", "Beignets haricots bouillie", "Entrées", 1000, true, null),
        new("p7", "Jus de foléré", "Boissons", 700, true, null),
        new("p8", "Jus de gingembre", "Boissons", 700, false, null),
    ];

    private static readonly string[] FirstNames =
        ["Aïcha", "Brice", "Carine", "Daniel", "Estelle", "Franck", "Grâce", "Hervé", "Inès", "Junior", "Larissa", "Marcel"];
    private static readonly string[] Initials = ["N.", "T.", "M.", "K.", "F.", "E."];
    private static readonly string?[] Notes = ["Sans piment svp", "Livrer à Bonamoussadi", "Ajouter des couverts", null, null, null];

    public static List<Order> GenerateOrders(DateTimeOffset now, Random random, IReadOnlyList<Product> products)
    {
        var orders = new List<Order>();
        var number = 1001;
        for (var daysAgo = 6; daysAgo >= 0; daysAgo--)
        {
            var perDay = 5 + random.Next(6);
            for (var i = 0; i < perDay; i++)
            {
                var day = now.Date.AddDays(-daysAgo);
                var created = new DateTimeOffset(day.AddHours(10 + random.Next(10)).AddMinutes(random.Next(60)), now.Offset);
                if (created > now) created = now.AddMinutes(-(i + 1) * 7);

                var status = random.NextDouble() < 0.08 ? OrderStatus.Annulee : OrderStatus.Livree;
                if (daysAgo == 0 && i >= perDay - 4)
                {
                    status = new[] { OrderStatus.Recue, OrderStatus.Recue, OrderStatus.Preparation, OrderStatus.Prete }[perDay - 1 - i];
                }
                orders.Add(RandomOrder(random, products, number++, created, status));
            }
        }
        return orders.OrderByDescending(o => o.CreatedAt).ToList();
    }

    public static Order RandomOrder(Random random, IReadOnlyList<Product> products, int number, DateTimeOffset createdAt, OrderStatus status)
    {
        var available = products.Where(p => p.Available).ToList();
        var items = new Dictionary<string, OrderItem>();
        var count = 1 + random.Next(3);
        for (var i = 0; i < count; i++)
        {
            var p = available[random.Next(available.Count)];
            items[p.Id] = items.TryGetValue(p.Id, out var existing)
                ? existing with { Quantity = existing.Quantity + 1 }
                : new OrderItem(p.Id, p.Name, 1 + random.Next(2), p.Price);
        }

        return new Order
        {
            Id = $"o{number}",
            Number = $"CMD-{number}",
            CustomerName = $"{FirstNames[random.Next(FirstNames.Length)]} {Initials[random.Next(Initials.Length)]}",
            // Numéro masqué : l'API n'expose jamais un numéro complet.
            CustomerPhone = $"+237 6•• ••• {random.Next(10, 100)} {random.Next(10, 100)}",
            Items = items.Values.ToList(),
            Status = status,
            Note = Notes[random.Next(Notes.Length)],
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };
    }
}
