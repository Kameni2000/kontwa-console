import { Order, OrderStatus } from '../models';
import { computeStats } from './stats';

function order(id: string, createdAt: string, total: number, status: OrderStatus = 'livree', qty = 1): Order {
  return {
    id,
    number: `CMD-${id}`,
    customerName: 'Client',
    customerPhone: '+237',
    items: [{ productId: 'p1', name: 'Ndolé', quantity: qty, unitPrice: total / qty }],
    total,
    status,
    channel: 'whatsapp',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('computeStats', () => {
  const now = new Date(2026, 9, 14, 18, 0); // 14 octobre 2026, 18 h

  it("calcule le chiffre d'affaires et le panier moyen du jour", () => {
    const stats = computeStats(
      [order('1', new Date(2026, 9, 14, 12).toISOString(), 3000), order('2', new Date(2026, 9, 14, 13).toISOString(), 5000)],
      now,
    );
    expect(stats.revenueToday).toBe(8000);
    expect(stats.ordersToday).toBe(2);
    expect(stats.averageBasket).toBe(4000);
  });

  it('ignore les commandes annulées dans les montants', () => {
    const stats = computeStats([order('1', new Date(2026, 9, 14, 12).toISOString(), 3000, 'annulee')], now);
    expect(stats.revenueToday).toBe(0);
    expect(stats.averageBasket).toBe(0);
  });

  it('compte les commandes encore en cours', () => {
    const stats = computeStats(
      [order('1', now.toISOString(), 1000, 'recue'), order('2', now.toISOString(), 1000, 'prete'), order('3', now.toISOString(), 1000, 'livree')],
      now,
    );
    expect(stats.pendingOrders).toBe(2);
  });

  it('produit une série par jour sur la période demandée, aujourd’hui en dernier', () => {
    const stats = computeStats([order('1', new Date(2026, 9, 12, 12).toISOString(), 2000)], now, 7);
    expect(stats.byDay.length).toBe(7);
    expect(stats.byDay[6].date).toBe('2026-10-14');
    expect(stats.byDay.find((d) => d.date === '2026-10-12')?.revenue).toBe(2000);
  });

  it('classe les produits par quantité vendue', () => {
    const a = order('1', now.toISOString(), 3000, 'livree', 3);
    const b = { ...order('2', now.toISOString(), 1000), items: [{ productId: 'p2', name: 'Koki', quantity: 1, unitPrice: 1000 }] };
    const stats = computeStats([b, a], now);
    expect(stats.topProducts[0]).toEqual({ name: 'Ndolé', quantity: 3 });
  });
});
