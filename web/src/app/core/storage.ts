/**
 * Accès sûr au localStorage : en navigation privée ou avec un stockage bloqué,
 * l'application continue de fonctionner (les données restent en mémoire).
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
};
