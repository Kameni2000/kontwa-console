import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { StatsService } from '../../core/catalog/catalog.service';
import { errorMessage } from '../../core/http-error';
import { Stats } from '../../core/models';
import { BarChartComponent, BarDatum } from '../../shared/bar-chart.component';
import { FcfaPipe, formatFcfa } from '../../shared/format';

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });

@Component({
  selector: 'kc-stats-page',
  standalone: true,
  imports: [BarChartComponent, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-page.component.html',
  styleUrl: './stats-page.component.scss',
})
export class StatsPageComponent {
  private api = inject(StatsService);

  readonly periods = [7, 14, 30];
  readonly days = signal(7);
  readonly error = signal<string | null>(null);
  readonly formatFcfa = formatFcfa;

  readonly stats = toSignal(
    toObservable(this.days).pipe(
      tap(() => this.error.set(null)),
      switchMap((days) =>
        this.api.get(days).pipe(
          catchError((e) => {
            this.error.set(errorMessage(e));
            return of(null as Stats | null);
          }),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly revenueChart = computed<BarDatum[]>(() =>
    (this.stats()?.byDay ?? []).map((d) => ({
      label: this.days() > 14 ? String(new Date(`${d.date}T12:00:00`).getDate()) : DAY_LABEL.format(new Date(`${d.date}T12:00:00`)),
      value: d.revenue,
    })),
  );

  readonly periodRevenue = computed(() => (this.stats()?.byDay ?? []).reduce((s, d) => s + d.revenue, 0));
  readonly periodOrders = computed(() => (this.stats()?.byDay ?? []).reduce((s, d) => s + d.orders, 0));

  readonly topMax = computed(() => Math.max(1, ...(this.stats()?.topProducts ?? []).map((p) => p.quantity)));
}
