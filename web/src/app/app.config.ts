import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { mockBackendInterceptor } from './core/mock/mock-backend.interceptor';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Ordre important : le jeton est ajouté avant que le faux back-end (mode démo) ne réponde.
    provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
