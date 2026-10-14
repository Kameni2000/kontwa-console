import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/catalogue' } as RouterStateSnapshot),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('redirige vers la connexion en gardant la page demandée', () => {
    const result = run() as UrlTree;
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result)).toBe('/connexion?retour=%2Fcatalogue');
  });

  it('laisse passer un utilisateur connecté', () => {
    localStorage.setItem('kontwa-session', JSON.stringify({ token: 't', user: { name: 'A', email: 'a@b.c', shop: 'S' } }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    expect(TestBed.inject(AuthService).isLoggedIn()).toBeTrue();
    expect(run()).toBeTrue();
  });
});
