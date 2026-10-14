import { OrderStatus } from '../models';

/**
 * Règles métier du cycle de vie d'une commande.
 * Les mêmes règles sont appliquées côté API (OrderRules.cs) :
 * le front ne propose que les actions valides, l'API refuse les autres.
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  recue: 'Reçue',
  preparation: 'En préparation',
  prete: 'Prête',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  recue: ['preparation', 'annulee'],
  preparation: ['prete', 'annulee'],
  prete: ['livree'],
  livree: [],
  annulee: [],
};

export const ACTIVE_STATUSES: OrderStatus[] = ['recue', 'preparation', 'prete'];

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isActive(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Libellé du bouton qui fait passer la commande au statut donné. */
export const ACTION_LABELS: Record<OrderStatus, string> = {
  recue: 'Remettre en reçue',
  preparation: 'Commencer la préparation',
  prete: 'Marquer prête',
  livree: 'Marquer livrée',
  annulee: 'Annuler la commande',
};
