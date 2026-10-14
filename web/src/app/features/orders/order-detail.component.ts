import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { errorMessage } from '../../core/http-error';
import { Order, OrderStatus } from '../../core/models';
import { ACTION_LABELS, STATUS_LABELS, nextStatuses } from '../../core/orders/order-status';
import { OrdersStore } from '../../core/orders/orders.store';
import { FcfaPipe, TimeAgoPipe } from '../../shared/format';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { DatePipe } from '@angular/common';

const STEPS: OrderStatus[] = ['recue', 'preparation', 'prete', 'livree'];

@Component({
  selector: 'kc-order-detail',
  standalone: true,
  imports: [RouterLink, FcfaPipe, TimeAgoPipe, StatusBadgeComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent {
  private store = inject(OrdersStore);

  /** Paramètre de route :id (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  private readonly local = signal<Order | null>(null);

  private readonly fetched = toSignal(
    toObservable(this.id).pipe(
      tap(() => this.error.set(null)),
      switchMap((id) =>
        this.store.getOne(id).pipe(
          catchError((e) => {
            this.error.set(errorMessage(e));
            return of(null);
          }),
        ),
      ),
    ),
    { initialValue: undefined },
  );

  /** La version modifiée localement a priorité sur la version chargée. */
  readonly order = computed(() => {
    const local = this.local();
    return local && local.id === this.id() ? local : this.fetched();
  });

  readonly actions = computed(() => {
    const o = this.order();
    return o ? nextStatuses(o.status) : [];
  });

  readonly steps = computed(() => {
    const o = this.order();
    const current = o ? STEPS.indexOf(o.status) : -1;
    return STEPS.map((s, i) => ({ status: s, label: STATUS_LABELS[s], done: current >= i, current: current === i }));
  });

  actionLabel(status: OrderStatus): string {
    return ACTION_LABELS[status];
  }

  change(status: OrderStatus): void {
    const o = this.order();
    if (!o) return;
    this.saving.set(true);
    this.error.set(null);
    this.store.updateStatus(o.id, status).subscribe({
      next: (updated) => {
        this.local.set(updated);
        this.saving.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }
}
