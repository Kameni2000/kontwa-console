namespace Kontwa.Api.Domain;

/// <summary>Indicateurs du tableau de bord. Les commandes annulées ne comptent pas.</summary>
public static class StatsCalculator
{
    public static Stats Compute(IEnumerable<Order> orders, DateTimeOffset now, int days = 7)
    {
        if (days is < 1 or > 90) throw new DomainException(400, "La période doit être comprise entre 1 et 90 jours.");

        var all = orders.ToList();
        var counted = all.Where(o => o.Status != OrderStatus.Annulee).ToList();
        // Les jours sont calculés dans le fuseau horaire de « now » (celui du commerce).
        DateOnly DayOf(DateTimeOffset d) => DateOnly.FromDateTime(d.ToOffset(now.Offset).DateTime);
        var today = DayOf(now);

        var byDay = Enumerable.Range(0, days)
            .Select(i => today.AddDays(i - days + 1))
            .Select(day =>
            {
                var ofDay = counted.Where(o => DayOf(o.CreatedAt) == day).ToList();
                return new DayStat(day.ToString("yyyy-MM-dd"), ofDay.Sum(o => o.Total), ofDay.Count);
            })
            .ToList();

        var todayStat = byDay[^1];
        var top = counted
            .SelectMany(o => o.Items)
            .GroupBy(i => i.Name)
            .Select(g => new TopProduct(g.Key, g.Sum(i => i.Quantity)))
            .OrderByDescending(p => p.Quantity)
            .ThenBy(p => p.Name)
            .Take(5)
            .ToList();

        return new Stats(
            RevenueToday: todayStat.Revenue,
            OrdersToday: todayStat.Orders,
            AverageBasket: todayStat.Orders == 0 ? 0 : (int)Math.Round((double)todayStat.Revenue / todayStat.Orders),
            PendingOrders: all.Count(o => OrderRules.IsActive(o.Status)),
            ByDay: byDay,
            TopProducts: top);
    }
}
