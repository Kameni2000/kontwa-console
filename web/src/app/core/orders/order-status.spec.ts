import { canTransition, isActive, nextStatuses } from './order-status';

describe('Règles de statut des commandes', () => {
  it('suit le parcours normal reçue → préparation → prête → livrée', () => {
    expect(canTransition('recue', 'preparation')).toBeTrue();
    expect(canTransition('preparation', 'prete')).toBeTrue();
    expect(canTransition('prete', 'livree')).toBeTrue();
  });

  it("interdit de sauter une étape ou de revenir en arrière", () => {
    expect(canTransition('recue', 'livree')).toBeFalse();
    expect(canTransition('prete', 'preparation')).toBeFalse();
  });

  it("permet d'annuler seulement avant que la commande soit prête", () => {
    expect(canTransition('recue', 'annulee')).toBeTrue();
    expect(canTransition('preparation', 'annulee')).toBeTrue();
    expect(canTransition('prete', 'annulee')).toBeFalse();
  });

  it("ne propose aucune action sur une commande terminée", () => {
    expect(nextStatuses('livree')).toEqual([]);
    expect(nextStatuses('annulee')).toEqual([]);
  });

  it('considère reçue, en préparation et prête comme « en cours »', () => {
    expect(isActive('recue')).toBeTrue();
    expect(isActive('prete')).toBeTrue();
    expect(isActive('livree')).toBeFalse();
  });
});
