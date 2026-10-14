import { Injectable } from '@angular/core';
import { Order, OrderStatus, Product, ProductInput } from '../models';
import { STATUS_LABELS, canTransition } from '../orders/order-status';
import { safeStorage } from '../storage';
import { DEMO_PRODUCTS, generateDemoOrders, orderTotal, randomCustomer, randomItems, randomNote, seededRandom } from './demo-data';

const STORAGE_KEY = 'kontwa-demo-db-v1';

interface DbState {
  orders: Order[];
  products: Product[];
  nextOrder: number;
  nextProduct: number;
}

export class DomainError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/**
 * Base de données en mémoire du mode démo (persistée dans le navigateur).
 * Elle reproduit le comportement de l'API ASP.NET Core.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private state: DbState = this.load();
  private rand = seededRandom(Date.now() % 100000);

  private load(): DbState {
    const raw = safeStorage.get(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DbState;
      } catch {
        /* données corrompues : on régénère */
      }
    }
    const orders = generateDemoOrders();
    const max = Math.max(...orders.map((o) => Number(o.number.replace('CMD-', ''))));
    return { orders, products: structuredClone(DEMO_PRODUCTS), nextOrder: max + 1, nextProduct: DEMO_PRODUCTS.length + 1 };
  }

  private save(): void {
    safeStorage.set(STORAGE_KEY, JSON.stringify(this.state));
  }

  reset(): void {
    safeStorage.remove(STORAGE_KEY);
    this.state = this.load();
  }

  listOrders(status?: string | null, q?: string | null): Order[] {
    const query = (q ?? '').trim().toLowerCase();
    return this.state.orders.filter(
      (o) =>
        (!status || o.status === status) &&
        (!query || o.number.toLowerCase().includes(query) || o.customerName.toLowerCase().includes(query)),
    );
  }

  getOrder(id: string): Order {
    const order = this.state.orders.find((o) => o.id === id);
    if (!order) throw new DomainError(404, 'Commande introuvable');
    return order;
  }

  updateStatus(id: string, status: OrderStatus): Order {
    const order = this.getOrder(id);
    if (!canTransition(order.status, status)) {
      throw new DomainError(409, `Impossible de passer une commande ${STATUS_LABELS[order.status].toLowerCase()} à « ${STATUS_LABELS[status].toLowerCase()} ».`);
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  /** Simule l'arrivée d'une nouvelle commande WhatsApp. */
  addRandomOrder(): Order {
    const items = randomItems(this.rand, this.state.products);
    const customer = randomCustomer(this.rand);
    const n = this.state.nextOrder++;
    const now = new Date().toISOString();
    const order: Order = {
      id: `o${n}`,
      number: `CMD-${n}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      items,
      total: orderTotal(items),
      status: 'recue',
      channel: 'whatsapp',
      note: randomNote(this.rand),
      createdAt: now,
      updatedAt: now,
    };
    this.state.orders.unshift(order);
    this.save();
    return order;
  }

  listProducts(): Product[] {
    return [...this.state.products].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  createProduct(input: ProductInput): Product {
    this.validateProduct(input);
    const product: Product = { ...input, id: `p${this.state.nextProduct++}` };
    this.state.products.push(product);
    this.save();
    return product;
  }

  updateProduct(id: string, input: ProductInput): Product {
    this.validateProduct(input);
    const index = this.state.products.findIndex((p) => p.id === id);
    if (index < 0) throw new DomainError(404, 'Produit introuvable');
    this.state.products[index] = { ...input, id };
    this.save();
    return this.state.products[index];
  }

  deleteProduct(id: string): void {
    const before = this.state.products.length;
    this.state.products = this.state.products.filter((p) => p.id !== id);
    if (this.state.products.length === before) throw new DomainError(404, 'Produit introuvable');
    this.save();
  }

  allOrders(): Order[] {
    return this.state.orders;
  }

  private validateProduct(input: ProductInput): void {
    if (!input.name?.trim() || input.name.trim().length < 2) throw new DomainError(400, 'Le nom est obligatoire (2 caractères minimum).');
    if (!input.category?.trim()) throw new DomainError(400, 'La catégorie est obligatoire.');
    if (!Number.isInteger(input.price) || input.price <= 0) throw new DomainError(400, 'Le prix doit être un entier positif.');
  }
}
