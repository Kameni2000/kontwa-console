import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { computeStats } from '../orders/stats';
import { DEMO_USER } from './demo-data';
import { DomainError, MockDb } from './mock-db';

export const DEMO_TOKEN = 'demo-token-kontwa';
const LATENCY_MS = 250;

/**
 * Faux back-end : intercepte les appels /api/* et répond comme l'API réelle.
 * Il permet de déployer la console comme un site statique (Vercel) pour la démo.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockBackend || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const db = inject(MockDb);
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];
  return handle(req, path, db).pipe(delay(LATENCY_MS));
};

/** Copie profonde, comme une vraie réponse HTTP sérialisée : jamais de référence partagée avec la base. */
function ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body: body === null ? body : structuredClone(body) }));
}

function fail(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { message } }));
}

function handle(req: HttpRequest<unknown>, path: string, db: MockDb): Observable<HttpResponse<unknown>> {
  try {
    if (path === '/auth/login' && req.method === 'POST') {
      const { email, password } = req.body as { email: string; password: string };
      if (email?.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) {
        return ok({ token: DEMO_TOKEN, user: { name: DEMO_USER.name, email: DEMO_USER.email, shop: DEMO_USER.shop } });
      }
      return fail(401, 'Courriel ou mot de passe incorrect.');
    }

    if (req.headers.get('Authorization') !== `Bearer ${DEMO_TOKEN}`) {
      return fail(401, 'Session expirée. Reconnectez-vous.');
    }

    if (path === '/orders' && req.method === 'GET') {
      return ok(db.listOrders(req.params.get('status'), req.params.get('q')));
    }
    if (path === '/orders/simulate' && req.method === 'POST') {
      return ok(db.addRandomOrder(), 201);
    }
    const orderMatch = path.match(/^\/orders\/([\w-]+)(\/status)?$/);
    if (orderMatch) {
      const [, id, statusPath] = orderMatch;
      if (!statusPath && req.method === 'GET') return ok(db.getOrder(id));
      if (statusPath && req.method === 'PATCH') {
        return ok(db.updateStatus(id, (req.body as { status: never }).status));
      }
    }

    if (path === '/products' && req.method === 'GET') return ok(db.listProducts());
    if (path === '/products' && req.method === 'POST') return ok(db.createProduct(req.body as never), 201);
    const productMatch = path.match(/^\/products\/([\w-]+)$/);
    if (productMatch) {
      const id = productMatch[1];
      if (req.method === 'PUT') return ok(db.updateProduct(id, req.body as never));
      if (req.method === 'DELETE') {
        db.deleteProduct(id);
        return ok(null, 204);
      }
    }

    if (path === '/stats' && req.method === 'GET') {
      const days = Number(req.params.get('days') ?? 7);
      return ok(computeStats(db.allOrders(), new Date(), days));
    }

    return fail(404, `Route inconnue : ${req.method} ${path}`);
  } catch (e) {
    if (e instanceof DomainError) return fail(e.status, e.message);
    return fail(500, 'Erreur inattendue.');
  }
}
