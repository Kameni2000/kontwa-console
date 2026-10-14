import { Order, OrderItem, OrderStatus, Product } from '../models';

/**
 * Données de démonstration (fictives).
 * Aucune donnée réelle de client ou de commerce n'est utilisée.
 */
export const DEMO_USER = {
  email: 'demo@kontwa.app',
  password: 'demo1234',
  name: 'Compte démo',
  shop: 'Saveurs de Douala (démo)',
};

export const DEMO_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Ndolé crevettes', category: 'Plats', price: 3500, available: true, description: 'Servi avec miondo ou plantain.' },
  { id: 'p2', name: 'Poulet DG', category: 'Plats', price: 4500, available: true },
  { id: 'p3', name: 'Poisson braisé', category: 'Plats', price: 5000, available: true, description: 'Bar braisé, bâton de manioc.' },
  { id: 'p4', name: 'Eru', category: 'Plats', price: 3000, available: true },
  { id: 'p5', name: 'Koki', category: 'Entrées', price: 1500, available: true },
  { id: 'p6', name: 'Beignets haricots bouillie', category: 'Entrées', price: 1000, available: true },
  { id: 'p7', name: 'Jus de foléré', category: 'Boissons', price: 700, available: true },
  { id: 'p8', name: 'Jus de gingembre', category: 'Boissons', price: 700, available: false },
];

const FIRST_NAMES = ['Aïcha', 'Brice', 'Carine', 'Daniel', 'Estelle', 'Franck', 'Grâce', 'Hervé', 'Inès', 'Junior', 'Larissa', 'Marcel', 'Nadège', 'Olivier', 'Patricia', 'Roméo'];
const LAST_INITIALS = ['N.', 'T.', 'M.', 'K.', 'F.', 'E.', 'B.', 'D.'];
const NOTES = ['Sans piment svp', 'Livrer à Bonamoussadi', 'Je passe récupérer à midi', 'Ajouter des couverts', undefined, undefined, undefined];

/** Générateur pseudo-aléatoire déterministe (mulberry32) : mêmes données à chaque génération. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length)];
}

export function randomItems(rand: () => number, products: Product[]): OrderItem[] {
  const available = products.filter((p) => p.available);
  const count = 1 + Math.floor(rand() * 3);
  const items = new Map<string, OrderItem>();
  for (let i = 0; i < count; i++) {
    const p = pick(rand, available);
    const existing = items.get(p.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.set(p.id, { productId: p.id, name: p.name, quantity: 1 + Math.floor(rand() * 2), unitPrice: p.price });
    }
  }
  return [...items.values()];
}

export function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

export function randomCustomer(rand: () => number): { name: string; phone: string } {
  const digits = Array.from({ length: 4 }, () => Math.floor(rand() * 10)).join('');
  return {
    name: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_INITIALS)}`,
    // Numéro masqué : la console n'affiche jamais un numéro complet.
    phone: `+237 6•• ••• ${digits.slice(0, 2)} ${digits.slice(2)}`,
  };
}

export function randomNote(rand: () => number): string | undefined {
  return pick(rand, NOTES);
}

/** Génère ~7 jours d'historique, avec des commandes encore en cours aujourd'hui. */
export function generateDemoOrders(now: Date = new Date(), seed = 2026): Order[] {
  const rand = seededRandom(seed);
  const orders: Order[] = [];
  let counter = 1000;

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const perDay = 5 + Math.floor(rand() * 6);
    for (let i = 0; i < perDay; i++) {
      const created = new Date(now);
      created.setDate(now.getDate() - daysAgo);
      created.setHours(10 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
      if (created > now) {
        created.setTime(now.getTime() - (i + 1) * 7 * 60_000);
      }

      let status: OrderStatus = rand() < 0.08 ? 'annulee' : 'livree';
      if (daysAgo === 0 && i >= perDay - 4) {
        status = (['recue', 'recue', 'preparation', 'prete'] as OrderStatus[])[perDay - 1 - i];
      }

      const items = randomItems(rand, DEMO_PRODUCTS);
      const customer = randomCustomer(rand);
      counter++;
      orders.push({
        id: `o${counter}`,
        number: `CMD-${counter}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        items,
        total: orderTotal(items),
        status,
        channel: 'whatsapp',
        note: randomNote(rand),
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
      });
    }
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
