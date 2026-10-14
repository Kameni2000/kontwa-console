import { formatFcfa, timeAgo } from './format';

describe('Formatage', () => {
  it('affiche les montants en FCFA avec des espaces', () => {
    expect(formatFcfa(4500)).toBe('4 500 FCFA');
    expect(formatFcfa(1250000)).toBe('1 250 000 FCFA');
    expect(formatFcfa(null)).toBe('0 FCFA');
  });

  it('affiche une durée relative lisible', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    expect(timeAgo('2026-10-14T11:59:40Z', now)).toBe("à l'instant");
    expect(timeAgo('2026-10-14T11:48:00Z', now)).toBe('il y a 12 min');
    expect(timeAgo('2026-10-14T09:00:00Z', now)).toBe('il y a 3 h');
    expect(timeAgo('2026-10-12T12:00:00Z', now)).toBe('il y a 2 j');
  });
});
