import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '../../core/catalog/catalog.service';
import { errorMessage } from '../../core/http-error';
import { Product, ProductInput } from '../../core/models';
import { FcfaPipe } from '../../shared/format';

export const CATEGORIES = ['Entrées', 'Plats', 'Desserts', 'Boissons'];

@Component({
  selector: 'kc-catalog-page',
  standalone: true,
  imports: [ReactiveFormsModule, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
})
export class CatalogPageComponent implements OnInit {
  private api = inject(CatalogService);
  private fb = inject(FormBuilder);

  readonly categories = CATEGORIES;
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  /** null = panneau fermé ; 'new' = création ; sinon le produit modifié. */
  readonly editing = signal<Product | 'new' | null>(null);
  readonly confirmDelete = signal<string | null>(null);

  readonly groups = computed(() => {
    const map = new Map<string, Product[]>();
    for (const p of this.products()) {
      map.set(p.category, [...(map.get(p.category) ?? []), p]);
    }
    const rank = (c: string) => (CATEGORIES.indexOf(c) + 1 || 99);
    return [...map.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([category, items]) => ({ category, items }));
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    category: ['Plats', Validators.required],
    price: [0, [Validators.required, Validators.min(50), Validators.max(1_000_000), Validators.pattern(/^\d+$/)]],
    available: [true],
    description: ['', Validators.maxLength(160)],
  });

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  openNew(): void {
    this.form.reset({ name: '', category: 'Plats', price: 0, available: true, description: '' });
    this.editing.set('new');
  }

  openEdit(p: Product): void {
    this.form.reset({ name: p.name, category: p.category, price: p.price, available: p.available, description: p.description ?? '' });
    this.editing.set(p);
  }

  close(): void {
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input: ProductInput = {
      ...raw,
      name: raw.name.trim(),
      price: Number(raw.price),
      description: raw.description.trim() || undefined,
    };
    const target = this.editing();
    const request = target === 'new' || target === null ? this.api.create(input) : this.api.update(target.id, input);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (saved) => {
        this.products.update((list) => {
          const exists = list.some((p) => p.id === saved.id);
          const next = exists ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved];
          return next.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        });
        this.saving.set(false);
        this.editing.set(null);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  toggleAvailable(p: Product): void {
    const { id, ...rest } = p;
    this.api.update(id, { ...rest, available: !p.available }).subscribe({
      next: (saved) => this.products.update((list) => list.map((x) => (x.id === saved.id ? saved : x))),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  remove(p: Product): void {
    this.api.remove(p.id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((x) => x.id !== p.id));
        this.confirmDelete.set(null);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
