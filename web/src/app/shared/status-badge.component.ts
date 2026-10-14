import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '../core/models';
import { STATUS_LABELS } from '../core/orders/order-status';

@Component({
  selector: 'kc-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge--' + status()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600; white-space: nowrap;
    }
    .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .badge--recue { background: var(--info-soft); color: var(--info); }
    .badge--preparation { background: var(--warn-soft); color: var(--warn); }
    .badge--prete { background: var(--accent-soft); color: var(--accent-strong); }
    .badge--livree { background: var(--ok-soft); color: var(--ok); }
    .badge--annulee { background: var(--muted-soft); color: var(--muted); }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<OrderStatus>();
  readonly label = computed(() => STATUS_LABELS[this.status()]);
}
