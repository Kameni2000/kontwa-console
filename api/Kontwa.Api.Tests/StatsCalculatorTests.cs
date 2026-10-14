using Kontwa.Api.Domain;

namespace Kontwa.Api.Tests;

public class StatsCalculatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 14, 18, 0, 0, TimeSpan.FromHours(-4));

    private static Order MakeOrder(string id, DateTimeOffset createdAt, int total, OrderStatus status = OrderStatus.Livree, string product = "Ndolé", int quantity = 1) => new()
    {
        Id = id,
        Number = $"CMD-{id}",
        CustomerName = "Client",
        CustomerPhone = "+237",
        Items = [new OrderItem("p1", product, quantity, total / quantity)],
        Status = status,
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
    };

    [Fact]
    public void Calcule_le_chiffre_du_jour_et_le_panier_moyen()
    {
        var stats = StatsCalculator.Compute(
            [MakeOrder("1", Now.AddHours(-3), 3000), MakeOrder("2", Now.AddHours(-2), 5000)], Now);

        Assert.Equal(8000, stats.RevenueToday);
        Assert.Equal(2, stats.OrdersToday);
        Assert.Equal(4000, stats.AverageBasket);
    }

    [Fact]
    public void Ignore_les_commandes_annulees()
    {
        var stats = StatsCalculator.Compute([MakeOrder("1", Now.AddHours(-1), 3000, OrderStatus.Annulee)], Now);

        Assert.Equal(0, stats.RevenueToday);
        Assert.Equal(0, stats.AverageBasket);
    }

    [Fact]
    public void Compte_les_commandes_en_cours()
    {
        var stats = StatsCalculator.Compute(
            [
                MakeOrder("1", Now, 1000, OrderStatus.Recue),
                MakeOrder("2", Now, 1000, OrderStatus.Prete),
                MakeOrder("3", Now, 1000, OrderStatus.Livree),
            ],
            Now);

        Assert.Equal(2, stats.PendingOrders);
    }

    [Fact]
    public void Produit_une_serie_par_jour_avec_aujourdhui_en_dernier()
    {
        var stats = StatsCalculator.Compute([MakeOrder("1", Now.AddDays(-2), 2000)], Now, days: 7);

        Assert.Equal(7, stats.ByDay.Count);
        Assert.Equal("2026-10-14", stats.ByDay[^1].Date);
        Assert.Equal(2000, stats.ByDay.Single(d => d.Date == "2026-10-12").Revenue);
    }

    [Fact]
    public void Classe_les_produits_par_quantite()
    {
        var stats = StatsCalculator.Compute(
            [MakeOrder("1", Now, 1500, product: "Koki"), MakeOrder("2", Now, 3000, product: "Ndolé", quantity: 3)], Now);

        Assert.Equal(new TopProduct("Ndolé", 3), stats.TopProducts[0]);
    }

    [Fact]
    public void Refuse_une_periode_hors_limites()
    {
        var error = Assert.Throws<DomainException>(() => StatsCalculator.Compute([], Now, days: 500));
        Assert.Equal(400, error.StatusCode);
    }
}
