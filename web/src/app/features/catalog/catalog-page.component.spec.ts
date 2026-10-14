import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Product } from '../../core/models';
import { CatalogPageComponent } from './catalog-page.component';

describe('CatalogPageComponent', () => {
  let fixture: ComponentFixture<CatalogPageComponent>;
  let component: CatalogPageComponent;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/products`;
  const products: Product[] = [
    { id: 'p1', name: 'Jus de foléré', category: 'Boissons', price: 700, available: true },
    { id: 'p2', name: 'Koki', category: 'Entrées', price: 1500, available: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CatalogPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(url).flush(products);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('regroupe les produits par catégorie dans l’ordre du menu', () => {
    expect(component.groups().map((g) => g.category)).toEqual(['Entrées', 'Boissons']);
  });

  it("n'envoie pas un produit invalide", () => {
    component.openNew();
    component.form.patchValue({ name: 'A', price: 10 });
    component.save();
    http.expectNone(url);
    expect(component.form.controls.name.hasError('minlength')).toBeTrue();
    expect(component.form.controls.price.hasError('min')).toBeTrue();
  });

  it('crée un produit valide et l’ajoute à la liste', () => {
    component.openNew();
    component.form.patchValue({ name: '  Plantain frit ', category: 'Plats', price: 1000 });
    component.save();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Plantain frit');
    req.flush({ id: 'p9', name: 'Plantain frit', category: 'Plats', price: 1000, available: true });
    expect(component.products().some((p) => p.id === 'p9')).toBeTrue();
    expect(component.editing()).toBeNull();
  });
});
