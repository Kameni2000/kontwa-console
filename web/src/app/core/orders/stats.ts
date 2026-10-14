import { DayStat, Order, Stats } from '../models';
import { isActive } from './order-status';

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcule les indicateurs du tableau de bord.
 * Seules les commandes non annulées comptent dans le chiffre d'affaires.
 * (Même calcul côté API : StatsService.cs.)
 */
export function computeStats(orders: Order[], now: Date = new Date(), days = 7): Stats {
  const counted = orders.filter((o) => o.status !== 'annulee');
  const todayKey = dayKey(now);

  const byDay: DayStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    byDay.push({ date: dayKey(d), revenue: 0, orders: 0 });
  }
  const index = new Map(byDay.map((s) => [s.date, s]));
  for (const o of counted) {
    const stat = index.get(dayKey(new Date(o.createdAt)));
    if (stat) {
      stat.revenue += o.total;
      stat.orders += 1;
    }
  }

  const today = index.get(todayKey) ?? { revenue: 0, orders: 0 };
  const quantities = new Map<string, number>();
  for (const o of counted) {
    for (const item of o.items) {
      quantities.set(item.name, (quantities.get(item.name) ?? 0) + item.quantity);
    }
  }

  return {
    revenueToday: today.revenue,
    ordersToday: today.orders,
    averageBasket: today.orders ? Math.round(today.revenue / today.orders) : 0,
    pendingOrders: orders.filter((o) => isActive(o.status)).length,
    byDay,
    topProducts: [...quantities.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
  };
}
