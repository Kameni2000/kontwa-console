import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductInput, Stats } from '../models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/products`;

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(this.url);
  }

  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>(this.url, input);
  }

  update(id: string, input: ProductInput): Observable<Product> {
    return this.http.put<Product>(`${this.url}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);

  get(days = 7): Observable<Stats> {
    return this.http.get<Stats>(`${environment.apiUrl}/stats`, { params: { days } });
  }
}
