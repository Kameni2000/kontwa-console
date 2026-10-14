/**
 * Configuration par défaut : l'application tourne avec un faux back-end
 * (intercepteur HTTP + données de démo dans le navigateur), ce qui permet
 * de l'essayer en ligne sans serveur.
 */
export const environment = {
  apiUrl: '/api',
  useMockBackend: true,
};
