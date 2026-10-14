import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, User } from '../models';
import { safeStorage } from '../storage';

const SESSION_KEY = 'kontwa-session';

/** Gère la session : l'état est exposé sous forme de signals. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private session = signal<LoginResponse | null>(this.restore());

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly token = computed<string | null>(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        this.session.set(res);
        safeStorage.set(SESSION_KEY, JSON.stringify(res));
      }),
    );
  }

  logout(): void {
    this.session.set(null);
    safeStorage.remove(SESSION_KEY);
    this.router.navigate(['/connexion']);
  }

  private restore(): LoginResponse | null {
    const raw = safeStorage.get(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginResponse;
    } catch {
      return null;
    }
  }
}
