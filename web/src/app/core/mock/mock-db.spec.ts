import { TestBed } from '@angular/core/testing';
import { generateDemoOrders } from './demo-data';
import { DomainError, MockDb } from './mock-db';

describe('MockDb (faux back-end de démo)', () => {
  let db: MockDb;

  beforeEach(() => {
    localStorage.clear();
    db = TestBed.inject(MockDb);
    db.reset();
  });

  it('génère des données de démo identiques à chaque fois (graine fixe)', () => {
    const now = new Date(2026, 9, 14, 18);
    expect(generateDemoOrders(now)).toEqual(generateDemoOrders(now));
  });

  it('refuse une transition de statut invalide avec une erreur 409', () => {
    const delivered = db.allOrders().find((o) => o.status === 'livree')!;
    try {
      db.updateStatus(delivered.id, 'preparation');
      fail('une erreur était attendue');
    } catch (e) {
      expect(e instanceof DomainError).toBeTrue();
      expect((e as DomainError).status).toBe(409);
    }
  });

  it('applique une transition valide', () => {
    const received = db.allOrders().find((o) => o.status === 'recue')!;
    expect(db.updateStatus(received.id, 'preparation').status).toBe('preparation');
  });

  it('filtre les commandes par recherche texte', () => {
    const target = db.allOrders()[0];
    const found = db.listOrders(null, target.number.toLowerCase());
    expect(found.map((o) => o.id)).toContain(target.id);
  });

  it('valide les produits avant de les enregistrer', () => {
    expect(() => db.createProduct({ name: 'X', category: 'Plats', price: 1000, available: true })).toThrowError(DomainError);
    expect(() => db.createProduct({ name: 'Plantain', category: 'Plats', price: -5, available: true })).toThrowError(DomainError);
    const created = db.createProduct({ name: 'Plantain frit', category: 'Plats', price: 1000, available: true });
    expect(db.listProducts().some((p) => p.id === created.id)).toBeTrue();
  });

  it('simule une nouvelle commande WhatsApp au statut « reçue »', () => {
    const before = db.allOrders().length;
    const order = db.addRandomOrder();
    expect(order.status).toBe('recue');
    expect(order.total).toBeGreaterThan(0);
    expect(db.allOrders().length).toBe(before + 1);
  });
});
