import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, exhaustMap, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { errorMessage } from '../http-error';
import { Order, OrderStatus } from '../models';

export type StatusFilter = OrderStatus | 'actives' | 'toutes';

/** Intervalle de rafraîchissement : la console reçoit les nouvelles commandes sans recharger la page. */
export const REFRESH_MS = 10_000;

/**
 * État des commandes (pattern « store » avec signals).
 * - les données viennent de l'API (polling RxJS) ;
 * - les filtres et compteurs sont des signals calculés (computed).
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/orders`;

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSync = signal<Date | null>(null);
  /** Identifiants des commandes arrivées depuis le dernier chargement (mise en évidence). */
  readonly freshIds = signal<Set<string>>(new Set());

  readonly statusFilter = signal<StatusFilter>('actives');
  readonly query = signal('');

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    const q = this.query().trim().toLowerCase();
    return this.orders().filter((o) => {
      const statusOk =
        status === 'toutes' ||
        (status === 'actives' ? ['recue', 'preparation', 'prete'].includes(o.status) : o.status === status);
      const queryOk = !q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  });

  readonly counts = computed(() => {
    const counts: Record<StatusFilter, number> = { actives: 0, toutes: 0, recue: 0, preparation: 0, prete: 0, livree: 0, annulee: 0 };
    for (const o of this.orders()) {
      counts.toutes++;
      counts[o.status]++;
      if (['recue', 'preparation', 'prete'].includes(o.status)) counts.actives++;
    }
    return counts;
  });

  private polling?: Subscription;

  /** Démarre le rafraîchissement automatique ; s'arrête quand le composant appelant est détruit. */
  startPolling(destroyRef: DestroyRef): void {
    this.polling?.unsubscribe();
    this.polling = timer(0, REFRESH_MS)
      .pipe(
        exhaustMap(() => this.load()),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe({ error: () => undefined });
  }

  load(): Observable<Order[]> {
    this.loading.set(this.orders().length === 0);
    return this.http.get<Order[]>(this.url).pipe(
      tap({
        next: (orders) => {
          const known = new Set(this.orders().map((o) => o.id));
          if (known.size > 0) {
            const fresh = orders.filter((o) => !known.has(o.id)).map((o) => o.id);
            if (fresh.length) this.freshIds.update((s) => new Set([...s, ...fresh]));
          }
          this.orders.set(orders);
          this.error.set(null);
          this.loading.set(false);
          this.lastSync.set(new Date());
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      }),
    );
  }

  getOne(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  /** Change le statut puis met à jour la liste localement (sans attendre le prochain rafraîchissement). */
  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.url}/${id}/status`, { status }).pipe(
      tap((updated) => this.orders.update((list) => list.map((o) => (o.id === id ? updated : o)))),
    );
  }

  /** Mode démo : simule l'arrivée d'une commande WhatsApp. */
  simulateIncoming(): Observable<Order> {
    return this.http.post<Order>(`${this.url}/simulate`, {}).pipe(
      tap((order) => {
        this.orders.update((list) => [order, ...list]);
        this.freshIds.update((s) => new Set([...s, order.id]));
      }),
    );
  }

  markSeen(id: string): void {
    this.freshIds.update((s) => {
      const copy = new Set(s);
      copy.delete(id);
      return copy;
    });
  }
}
