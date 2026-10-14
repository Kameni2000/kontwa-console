import { HttpErrorResponse } from '@angular/common/http';

/** Transforme une erreur HTTP en message lisible pour l'utilisateur. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
    const message = (error.error as { message?: string } | null)?.message;
    if (message) return message;
  }
  return 'Une erreur est survenue. Réessayez.';
}
