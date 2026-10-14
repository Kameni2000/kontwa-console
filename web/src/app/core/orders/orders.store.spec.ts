import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus } from '../models';
import { OrdersStore } from './orders.store';

function order(id: string, status: OrderStatus, customerName = 'Client'): Order {
  return {
    id,
    number: `CMD-${id}`,
    customerName,
    customerPhone: '+237',
    items: [],
    total: 1000,
    status,
    channel: 'whatsapp',
    createdAt: '2026-10-14T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  };
}

describe('OrdersStore', () => {
  let store: OrdersStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(OrdersStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadWith(orders: Order[]): void {
    store.load().subscribe();
    http.expectOne(`${environment.apiUrl}/orders`).flush(orders);
  }

  it('affiche par défaut uniquement les commandes en cours', () => {
    loadWith([order('1', 'recue'), order('2', 'livree'), order('3', 'prete')]);
    expect(store.filtered().map((o) => o.id)).toEqual(['1', '3']);
  });

  it('calcule les compteurs par statut', () => {
    loadWith([order('1', 'recue'), order('2', 'recue'), order('3', 'annulee')]);
    expect(store.counts().recue).toBe(2);
    expect(store.counts().actives).toBe(2);
    expect(store.counts().toutes).toBe(3);
  });

  it('filtre par nom de client sans tenir compte des majuscules', () => {
    loadWith([order('1', 'recue', 'Aïcha N.'), order('2', 'recue', 'Brice T.')]);
    store.query.set('aïcha');
    expect(store.filtered().map((o) => o.id)).toEqual(['1']);
  });

  it('signale les commandes arrivées depuis le dernier chargement', () => {
    loadWith([order('1', 'recue')]);
    loadWith([order('2', 'recue'), order('1', 'recue')]);
    expect(store.freshIds().has('2')).toBeTrue();
    expect(store.freshIds().has('1')).toBeFalse();
  });

  it('met à jour la liste après un changement de statut', () => {
    loadWith([order('1', 'recue')]);
    store.updateStatus('1', 'preparation').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/orders/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'preparation' });
    req.flush(order('1', 'preparation'));
    expect(store.orders()[0].status).toBe('preparation');
  });

  it("expose un message d'erreur lisible si l'API est injoignable", () => {
    store.load().subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/orders`).error(new ProgressEvent('error'), { status: 0 });
    expect(store.error()).toContain('injoignable');
  });
});
