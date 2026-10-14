using Kontwa.Api.Domain;

namespace Kontwa.Api.Tests;

public class OrderRulesTests
{
    [Theory]
    [InlineData(OrderStatus.Recue, OrderStatus.Preparation)]
    [InlineData(OrderStatus.Preparation, OrderStatus.Prete)]
    [InlineData(OrderStatus.Prete, OrderStatus.Livree)]
    [InlineData(OrderStatus.Recue, OrderStatus.Annulee)]
    [InlineData(OrderStatus.Preparation, OrderStatus.Annulee)]
    public void Accepte_les_transitions_valides(OrderStatus from, OrderStatus to)
    {
        Assert.True(OrderRules.CanTransition(from, to));
    }

    [Theory]
    [InlineData(OrderStatus.Recue, OrderStatus.Livree)]
    [InlineData(OrderStatus.Prete, OrderStatus.Preparation)]
    [InlineData(OrderStatus.Prete, OrderStatus.Annulee)]
    [InlineData(OrderStatus.Livree, OrderStatus.Recue)]
    [InlineData(OrderStatus.Annulee, OrderStatus.Recue)]
    public void Refuse_les_transitions_invalides(OrderStatus from, OrderStatus to)
    {
        Assert.False(OrderRules.CanTransition(from, to));
    }

    [Fact]
    public void Une_commande_terminee_na_plus_d_action()
    {
        Assert.Empty(OrderRules.NextStatuses(OrderStatus.Livree));
        Assert.Empty(OrderRules.NextStatuses(OrderStatus.Annulee));
    }
}
