import {
  ACCOUNT_TYPES,
  Account,
  AppData,
  BudgetEnvelope,
  CURRENT_SCHEMA_VERSION,
  CategoryGroup,
  Frequency,
  RecurringRule,
  Settings,
  Subcategory,
  Transaction,
  TransactionType,
} from '../models';
import { isValidIsoDate } from '../domain/dates';
import { InvalidDataError } from './errors';
import { RawDocument, isRecord } from './migrations';

/**
 * Valide un document (déjà migré) et le convertit en `AppData` typé.
 * Utilisé au chargement du localStorage et à l'import d'une sauvegarde JSON.
 * Les champs inconnus sont ignorés ; tout champ obligatoire invalide lève une
 * `InvalidDataError` avec un message en français.
 */
export function parseAppData(doc: RawDocument): AppData {
  if (doc['schemaVersion'] !== CURRENT_SCHEMA_VERSION) {
    throw new InvalidDataError('Version de schéma inattendue.');
  }
  const data: AppData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    accounts: list(doc, 'accounts', parseAccount),
    groups: list(doc, 'groups', parseGroup),
    subcategories: list(doc, 'subcategories', parseSubcategory),
    transactions: list(doc, 'transactions', parseTransaction),
    rules: list(doc, 'rules', parseRule),
    envelopes: list(doc, 'envelopes', parseEnvelope),
    settings: parseSettings(doc['settings']),
  };
  checkReferences(data);
  return data;
}

// --- Entités ----------------------------------------------------------------

function parseAccount(o: RawDocument, at: string): Account {
  return {
    id: str(o, 'id', at),
    name: str(o, 'name', at),
    type: oneOf(o, 'type', ACCOUNT_TYPES, at),
    initialBalance: int(o, 'initialBalance', at),
    color: str(o, 'color', at),
  };
}

function parseGroup(o: RawDocument, at: string): CategoryGroup {
  return {
    id: str(o, 'id', at),
    name: str(o, 'name', at),
    color: str(o, 'color', at),
    icon: str(o, 'icon', at),
    kind: oneOf(o, 'kind', ['expense', 'income'] as const, at),
  };
}

function parseSubcategory(o: RawDocument, at: string): Subcategory {
  return {
    id: str(o, 'id', at),
    groupId: str(o, 'groupId', at),
    name: str(o, 'name', at),
    icon: str(o, 'icon', at),
  };
}

const TRANSACTION_TYPES: readonly TransactionType[] = ['expense', 'income', 'transfer'];
const FREQUENCIES: readonly Frequency[] = ['weekly', 'monthly', 'yearly'];

function parseTransaction(o: RawDocument, at: string): Transaction {
  const tx: Transaction = {
    id: str(o, 'id', at),
    type: oneOf(o, 'type', TRANSACTION_TYPES, at),
    amount: positiveInt(o, 'amount', at),
    accountId: str(o, 'accountId', at),
    date: dateTime(o, 'date', at),
    note: optStr(o, 'note', at) ?? '',
  };
  assign(tx, 'toAccountId', optStr(o, 'toAccountId', at));
  assign(tx, 'groupId', optStr(o, 'groupId', at));
  assign(tx, 'subcategoryId', optStr(o, 'subcategoryId', at));
  assign(tx, 'recurringRuleId', optStr(o, 'recurringRuleId', at));
  assign(tx, 'occurrenceDate', optDate(o, 'occurrenceDate', at));
  if (tx.type === 'transfer' && !tx.toAccountId) {
    throw invalid(at, 'un virement doit avoir un compte de destination');
  }
  return tx;
}

function parseRule(o: RawDocument, at: string): RecurringRule {
  const rule: RecurringRule = {
    id: str(o, 'id', at),
    type: oneOf(o, 'type', TRANSACTION_TYPES, at),
    amount: positiveInt(o, 'amount', at),
    accountId: str(o, 'accountId', at),
    note: optStr(o, 'note', at) ?? '',
    frequency: oneOf(o, 'frequency', FREQUENCIES, at),
    startDate: dateTime(o, 'startDate', at),
    active: bool(o, 'active', at),
    skippedDates: optArray(o, 'skippedDates', at).map((d, i) => {
      if (typeof d !== 'string' || !isValidIsoDate(d)) {
        throw invalid(`${at}.skippedDates[${i}]`, 'date invalide');
      }
      return d;
    }),
  };
  assign(rule, 'toAccountId', optStr(o, 'toAccountId', at));
  assign(rule, 'groupId', optStr(o, 'groupId', at));
  assign(rule, 'subcategoryId', optStr(o, 'subcategoryId', at));
  assign(rule, 'endDate', optDate(o, 'endDate', at));
  assign(rule, 'lastGeneratedDate', optDate(o, 'lastGeneratedDate', at));
  if (rule.type === 'transfer' && !rule.toAccountId) {
    throw invalid(at, 'un virement doit avoir un compte de destination');
  }
  return rule;
}

function parseEnvelope(o: RawDocument, at: string): BudgetEnvelope {
  const percent = o['percentOfIncome'];
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw invalid(`${at}.percentOfIncome`, 'pourcentage attendu entre 0 et 100');
  }
  const envelope: BudgetEnvelope = {
    id: str(o, 'id', at),
    groupId: str(o, 'groupId', at),
    percentOfIncome: percent,
  };
  if (o['manualOverride'] !== undefined && o['manualOverride'] !== null) {
    envelope.manualOverride = positiveInt(o, 'manualOverride', at, true);
  }
  return envelope;
}

function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) {
    throw invalid('settings', 'objet attendu');
  }
  const settings: Settings = { currency: 'EUR' };
  if (raw['monthlyIncomeReference'] !== undefined && raw['monthlyIncomeReference'] !== null) {
    settings.monthlyIncomeReference = positiveInt(raw, 'monthlyIncomeReference', 'settings', true);
  }
  return settings;
}

function checkReferences(data: AppData): void {
  const accounts = new Set(data.accounts.map((a) => a.id));
  const groups = new Set(data.groups.map((g) => g.id));
  const check = (ok: boolean, message: string) => {
    if (!ok) throw new InvalidDataError(message);
  };
  data.subcategories.forEach((s) =>
    check(groups.has(s.groupId), `Sous-catégorie « ${s.name} » : groupe inconnu.`),
  );
  for (const item of [...data.transactions, ...data.rules]) {
    check(accounts.has(item.accountId), `Élément ${item.id} : compte inconnu.`);
    check(
      !item.toAccountId || accounts.has(item.toAccountId),
      `Élément ${item.id} : compte de destination inconnu.`,
    );
  }
  data.envelopes.forEach((e) =>
    check(groups.has(e.groupId), `Enveloppe ${e.id} : catégorie inconnue.`),
  );
}

// --- Primitives -------------------------------------------------------------

function invalid(at: string, reason: string): InvalidDataError {
  return new InvalidDataError(`Données invalides (${at}) : ${reason}.`);
}

function list<T>(doc: RawDocument, key: string, parse: (o: RawDocument, at: string) => T): T[] {
  const value = doc[key];
  if (!Array.isArray(value)) {
    throw invalid(key, 'liste attendue');
  }
  return value.map((item, i) => {
    const at = `${key}[${i}]`;
    if (!isRecord(item)) {
      throw invalid(at, 'objet attendu');
    }
    return parse(item, at);
  });
}

function str(o: RawDocument, key: string, at: string): string {
  const value = o[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw invalid(`${at}.${key}`, 'texte attendu');
  }
  return value;
}

function optStr(o: RawDocument, key: string, at: string): string | undefined {
  const value = o[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw invalid(`${at}.${key}`, 'texte attendu');
  return value;
}

function int(o: RawDocument, key: string, at: string): number {
  const value = o[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw invalid(`${at}.${key}`, 'montant entier en centimes attendu');
  }
  return value;
}

function positiveInt(o: RawDocument, key: string, at: string, allowZero = false): number {
  const value = int(o, key, at);
  if (value < 0 || (!allowZero && value === 0)) {
    throw invalid(`${at}.${key}`, 'montant positif attendu');
  }
  return value;
}

function bool(o: RawDocument, key: string, at: string): boolean {
  const value = o[key];
  if (typeof value !== 'boolean') throw invalid(`${at}.${key}`, 'booléen attendu');
  return value;
}

function oneOf<T extends string>(
  o: RawDocument,
  key: string,
  allowed: readonly T[],
  at: string,
): T {
  const value = o[key];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw invalid(`${at}.${key}`, `valeur attendue parmi ${allowed.join(', ')}`);
  }
  return value as T;
}

function dateTime(o: RawDocument, key: string, at: string): string {
  const value = str(o, key, at);
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value) || !isValidIsoDate(value.slice(0, 10))) {
    throw invalid(`${at}.${key}`, 'date au format AAAA-MM-JJTHH:mm attendue');
  }
  return value.length === 10 ? `${value}T00:00` : value;
}

function optDate(o: RawDocument, key: string, at: string): string | undefined {
  const value = optStr(o, key, at);
  if (value !== undefined && !isValidIsoDate(value)) {
    throw invalid(`${at}.${key}`, 'date au format AAAA-MM-JJ attendue');
  }
  return value;
}

function optArray(o: RawDocument, key: string, at: string): unknown[] {
  const value = o[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${at}.${key}`, 'liste attendue');
  return value;
}

/** N'ajoute la propriété que si elle est définie (évite les `undefined` explicites dans le JSON). */
function assign<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
