namespace Kontwa.Api.Domain;

/// <summary>
/// Cycle de vie d'une commande. Mêmes règles que le front (order-status.ts) :
/// reçue → préparation → prête → livrée, annulation possible avant « prête ».
/// </summary>
public static class OrderRules
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Transitions = new()
    {
        [OrderStatus.Recue] = [OrderStatus.Preparation, OrderStatus.Annulee],
        [OrderStatus.Preparation] = [OrderStatus.Prete, OrderStatus.Annulee],
        [OrderStatus.Prete] = [OrderStatus.Livree],
        [OrderStatus.Livree] = [],
        [OrderStatus.Annulee] = [],
    };

    public static IReadOnlyList<OrderStatus> NextStatuses(OrderStatus status) => Transitions[status];

    public static bool CanTransition(OrderStatus from, OrderStatus to) => Transitions[from].Contains(to);

    public static string Label(OrderStatus status) => status switch
    {
        OrderStatus.Recue => "reçue",
        OrderStatus.Preparation => "en préparation",
        OrderStatus.Prete => "prête",
        OrderStatus.Livree => "livrée",
        _ => "annulée",
    };

    public static bool IsActive(OrderStatus status) =>
        status is OrderStatus.Recue or OrderStatus.Preparation or OrderStatus.Prete;
}
