import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Graphique en barres en SVG pur (sans bibliothèque).
 * Accessible : description textuelle + tableau masqué pour les lecteurs d'écran.
 */
@Component({
  selector: 'kc-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="ariaLabel()" class="chart">
      @for (tick of ticks(); track tick.value) {
        <line [attr.x1]="padLeft" [attr.x2]="width - 8" [attr.y1]="tick.y" [attr.y2]="tick.y" class="grid" />
        <text [attr.x]="padLeft - 8" [attr.y]="tick.y + 4" text-anchor="end" class="axis">{{ tick.label }}</text>
      }
      @for (bar of bars(); track bar.label) {
        <g>
          <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.w" [attr.height]="bar.h" rx="4" class="bar" [class.bar--last]="$last">
            <title>{{ bar.label }} : {{ bar.display }}</title>
          </rect>
          <text [attr.x]="bar.x + bar.w / 2" [attr.y]="height - 8" text-anchor="middle" class="axis">{{ bar.label }}</text>
        </g>
      }
    </svg>
    <table class="sr-only">
      <caption>{{ ariaLabel() }}</caption>
      @for (d of data(); track d.label) {
        <tr><th scope="row">{{ d.label }}</th><td>{{ format()(d.value) }}</td></tr>
      }
    </table>
  `,
  styles: `
    :host { display: block; }
    .chart { width: 100%; height: auto; display: block; }
    .grid { stroke: var(--border); stroke-width: 1; }
    .axis { fill: var(--text-soft); font-size: 11px; }
    .bar { fill: var(--accent-soft-strong); transition: fill .15s; }
    .bar--last { fill: var(--accent); }
    .bar:hover { fill: var(--accent-strong); }
  `,
})
export class BarChartComponent {
  readonly data = input.required<BarDatum[]>();
  readonly format = input<(v: number) => string>((v) => String(v));
  readonly ariaLabel = input('Graphique');

  readonly width = 640;
  readonly height = 240;
  readonly padLeft = 64;
  private readonly padTop = 12;
  private readonly padBottom = 28;

  private readonly max = computed(() => {
    const raw = Math.max(1, ...this.data().map((d) => d.value));
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    return Math.ceil(raw / magnitude) * magnitude;
  });

  readonly ticks = computed(() => {
    const plot = this.height - this.padTop - this.padBottom;
    return [0, 0.5, 1].map((f) => ({
      value: f,
      y: this.padTop + plot * (1 - f),
      label: compact(this.max() * f),
    }));
  });

  readonly bars = computed(() => {
    const items = this.data();
    const plotW = this.width - this.padLeft - 8;
    const plotH = this.height - this.padTop - this.padBottom;
    const slot = plotW / Math.max(1, items.length);
    const w = Math.min(48, slot * 0.6);
    return items.map((d, i) => {
      const h = (d.value / this.max()) * plotH;
      return {
        label: d.label,
        display: this.format()(d.value),
        x: this.padLeft + slot * i + (slot - w) / 2,
        y: this.padTop + plotH - h,
        w,
        h: Math.max(h, d.value > 0 ? 2 : 0),
      };
    });
  });
}

function compact(v: number): string {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)} k`;
  return String(Math.round(v));
}
