import {
  formatAmountInput,
  formatMoney,
  formatPercent,
  parseAmount,
  ratio,
  toCents,
} from './money';

/** Normalise les espaces insécables d'Intl pour des assertions lisibles. */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('money', () => {
  describe('formatMoney', () => {
    it('formate en euros fr-FR avec séparateur de milliers', () => {
      expect(plain(formatMoney(123456))).toBe('1 234,56 €');
      expect(plain(formatMoney(2500000))).toBe('25 000,00 €');
    });

    it('utilise le signe moins typographique', () => {
      expect(plain(formatMoney(-5430))).toBe('−54,30 €');
    });

    it('affiche le signe + à la demande, jamais sur zéro', () => {
      expect(plain(formatMoney(3500, 'always'))).toBe('+35,00 €');
      expect(plain(formatMoney(-3500, 'always'))).toBe('−35,00 €');
      expect(plain(formatMoney(0, 'always'))).toBe('0,00 €');
    });

    it('affiche la valeur absolue avec `never`', () => {
      expect(plain(formatMoney(-18430, 'never'))).toBe('184,30 €');
    });

    it("n'affiche jamais « −0,00 € »", () => {
      expect(plain(formatMoney(-0))).toBe('0,00 €');
    });
  });

  it('formatPercent : « 19 % » et non « %19 »', () => {
    expect(plain(formatPercent(0.19))).toBe('19 %');
    expect(plain(formatPercent(1.234))).toBe('123 %');
    expect(plain(formatPercent(Number.NaN))).toBe('0 %');
  });

  it('ratio renvoie 0 pour un total nul', () => {
    expect(ratio(5, 0)).toBe(0);
    expect(ratio(1, 4)).toBe(0.25);
  });

  it('toCents arrondit correctement les flottants', () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-54.3)).toBe(-5430);
  });

  describe('parseAmount', () => {
    it.each([
      ['12', 1200],
      ['12,5', 1250],
      ['12.05', 1205],
      ['1 234,56', 123456],
      ['1 234,56 €', 123456],
      ['0,99', 99],
      ['7,', 700],
    ])('« %s » → %i centimes', (input, expected) => {
      expect(parseAmount(input)).toBe(expected);
    });

    it.each(['', 'abc', '-5', '12,345', '1,2,3', ','])('rejette « %s »', (input) => {
      expect(parseAmount(input)).toBeNull();
    });
  });

  it('formatAmountInput produit une valeur ré-analysable', () => {
    expect(formatAmountInput(123450)).toBe('1234,50');
    expect(parseAmount(formatAmountInput(99))).toBe(99);
  });
});

describe('parseSignedAmount', () => {
  it('accepte un signe moins (trait d’union ou U+2212)', async () => {
    const { parseSignedAmount } = await import('./money');
    expect(parseSignedAmount('-150,5')).toBe(-15050);
    expect(parseSignedAmount('\u2212 20')).toBe(-2000);
    expect(parseSignedAmount('3 200')).toBe(320000);
    expect(parseSignedAmount('--3')).toBeNull();
  });
});
