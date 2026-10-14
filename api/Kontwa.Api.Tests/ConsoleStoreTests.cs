using Kontwa.Api.Data;
using Kontwa.Api.Domain;

namespace Kontwa.Api.Tests;

public class ConsoleStoreTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 14, 18, 0, 0, TimeSpan.FromHours(-4));
    private readonly InMemoryConsoleStore _store = new(Now);

    [Fact]
    public void Genere_des_commandes_de_demo_dont_certaines_en_cours()
    {
        var orders = _store.ListOrders();
        Assert.NotEmpty(orders);
        Assert.Contains(orders, o => o.Status == OrderStatus.Recue);
    }

    [Fact]
    public void Change_le_statut_selon_les_regles()
    {
        var order = _store.ListOrders(OrderStatus.Recue)[0];

        var updated = _store.ChangeStatus(order.Id, OrderStatus.Preparation, Now);

        Assert.Equal(OrderStatus.Preparation, updated.Status);
        Assert.Equal(OrderStatus.Preparation, _store.GetOrder(order.Id).Status);
    }

    [Fact]
    public void Refuse_une_transition_invalide_avec_409()
    {
        var order = _store.ListOrders(OrderStatus.Livree)[0];

        var error = Assert.Throws<DomainException>(() => _store.ChangeStatus(order.Id, OrderStatus.Recue, Now));

        Assert.Equal(409, error.StatusCode);
    }

    [Fact]
    public void Renvoie_404_pour_une_commande_inconnue()
    {
        var error = Assert.Throws<DomainException>(() => _store.GetOrder("inexistante"));
        Assert.Equal(404, error.StatusCode);
    }

    [Fact]
    public void Les_copies_renvoyees_ne_modifient_pas_le_stockage()
    {
        var order = _store.ListOrders(OrderStatus.Recue)[0];
        order.Status = OrderStatus.Livree;

        Assert.Equal(OrderStatus.Recue, _store.GetOrder(order.Id).Status);
    }

    [Fact]
    public void Recherche_par_nom_ou_numero_sans_tenir_compte_de_la_casse()
    {
        var target = _store.ListOrders()[0];

        Assert.Contains(_store.ListOrders(query: target.Number.ToLowerInvariant()), o => o.Id == target.Id);
    }

    [Theory]
    [InlineData("A", "Plats", 1000)]
    [InlineData("Plantain", "", 1000)]
    [InlineData("Plantain", "Plats", 10)]
    public void Refuse_un_produit_invalide(string name, string category, int price)
    {
        var error = Assert.Throws<DomainException>(() => _store.CreateProduct(new ProductInput(name, category, price, true, null)));
        Assert.Equal(400, error.StatusCode);
    }

    [Fact]
    public void Cree_un_produit_en_nettoyant_les_espaces()
    {
        var product = _store.CreateProduct(new ProductInput("  Plantain frit ", "Plats", 1000, true, "  "));

        Assert.Equal("Plantain frit", product.Name);
        Assert.Null(product.Description);
        Assert.Contains(_store.ListProducts(), p => p.Id == product.Id);
    }

    [Fact]
    public void Une_commande_simulee_arrive_au_statut_recue()
    {
        var before = _store.ListOrders().Count;

        var order = _store.AddRandomOrder(Now);

        Assert.Equal(OrderStatus.Recue, order.Status);
        Assert.True(order.Total > 0);
        Assert.Equal(before + 1, _store.ListOrders().Count);
    }
}
