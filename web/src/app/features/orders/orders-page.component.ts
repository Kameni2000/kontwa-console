import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, interval, switchMap } from 'rxjs';
import { errorMessage } from '../../core/http-error';
import { Order, OrderStatus } from '../../core/models';
import { ACTION_LABELS, STATUS_LABELS, nextStatuses } from '../../core/orders/order-status';
import { OrdersStore, StatusFilter } from '../../core/orders/orders.store';
import { FcfaPipe, TimeAgoPipe } from '../../shared/format';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { environment } from '../../../environments/environment';
import { toObservable } from '@angular/core/rxjs-interop';

const SIMULATION_MS = 40_000;

@Component({
  selector: 'kc-orders-page',
  standalone: true,
  imports: [RouterLink, FcfaPipe, TimeAgoPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss',
})
export class OrdersPageComponent {
  readonly store = inject(OrdersStore);
  readonly demoMode = environment.useMockBackend;
  readonly autoSimulate = signal(this.demoMode);
  readonly busyId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly filters: { value: StatusFilter; label: string }[] = [
    { value: 'actives', label: 'En cours' },
    { value: 'recue', label: STATUS_LABELS.recue },
    { value: 'preparation', label: STATUS_LABELS.preparation },
    { value: 'prete', label: STATUS_LABELS.prete },
    { value: 'livree', label: STATUS_LABELS.livree },
    { value: 'annulee', label: STATUS_LABELS.annulee },
    { value: 'toutes', label: 'Toutes' },
  ];

  constructor() {
    // Mode démo : une nouvelle commande « WhatsApp » arrive régulièrement.
    toObservable(this.autoSimulate)
      .pipe(
        switchMap((on) => (on ? interval(SIMULATION_MS) : EMPTY)),
        switchMap(() => this.store.simulateIncoming()),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe({ error: () => this.autoSimulate.set(false) });
  }

  itemsSummary(order: Order): string {
    return order.items.map((i) => `${i.quantity} × ${i.name}`).join(', ');
  }

  /** Action principale proposée sur la ligne (la première transition non destructive). */
  primaryAction(order: Order): OrderStatus | null {
    return nextStatuses(order.status).find((s) => s !== 'annulee') ?? null;
  }

  actionLabel(status: OrderStatus): string {
    return ACTION_LABELS[status];
  }

  advance(order: Order, status: OrderStatus, event: Event): void {
    event.stopPropagation();
    this.busyId.set(order.id);
    this.actionError.set(null);
    this.store.updateStatus(order.id, status).subscribe({
      next: () => this.busyId.set(null),
      error: (e) => {
        this.actionError.set(errorMessage(e));
        this.busyId.set(null);
      },
    });
  }

  simulateNow(): void {
    this.store.simulateIncoming().subscribe();
  }

  retry(): void {
    this.store.load().subscribe({ error: () => undefined });
  }

  onSearch(event: Event): void {
    this.store.query.set((event.target as HTMLInputElement).value);
  }
}
