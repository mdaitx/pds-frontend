/**
 * Máscaras e parsing para CPF, CNPJ, telefone (BR), valores monetários (BRL) e quilometragem.
 */

/** Apenas dígitos, com limite opcional (ex.: CPF 11, CNPJ 14). */
export function digitsOnly(value: string, maxLen?: number): string {
  const d = value.replace(/\D/g, '');
  return maxLen != null ? d.slice(0, maxLen) : d;
}

export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara 00.000.000/0001-00 — aceita somente dígitos, máx. 14. */
export function formatCnpjMask(value: string): string {
  const x = value.replace(/\D/g, '').slice(0, 14);
  if (x.length <= 2) return x;
  let s = `${x.slice(0, 2)}.${x.slice(2, 5)}`;
  if (x.length > 5) s += `.${x.slice(5, 8)}`;
  if (x.length > 8) s += `/${x.slice(8, 12)}`;
  if (x.length > 12) s += `-${x.slice(12, 14)}`;
  return s;
}

/** Campo único CPF ou CNPJ: até 11 dígitos formata como CPF; acima disso como CNPJ. */
export function formatCpfCnpjDocument(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return formatCpf(d);
  return formatCnpjMask(d);
}

/**
 * Telefone BR: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
 * Parêntese do DDD permanece ao apagar (comportamento comum em formulários).
 */
export function formatPhoneBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const dd = d.slice(0, 2);
  const rest = d.slice(2);
  if (d.length <= 2) return `(${d}`;
  if (rest.length <= 4) return `(${dd}) ${rest}`;
  if (d.length <= 10) {
    return `(${dd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }
  return `(${dd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

/** Valida dígitos verificadores do CNPJ (14 dígitos). */
export function isValidCnpj(digits: string): boolean {
  const c = digits.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

  let length = c.length - 2;
  let numbers = c.substring(0, length);
  const verifiers = c.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(verifiers.charAt(0), 10)) return false;

  length += 1;
  numbers = c.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(verifiers.charAt(1), 10);
}

/**
 * Entrada monetária em centavos: o usuário digita números e o valor é exibido como 1.234,56.
 */
export function formatBrlCurrencyInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 15);
  if (!d) return '';
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte valor numérico da API para o fluxo de dígitos de `formatBrlCurrencyInput`. */
export function numberToBrlInputDigits(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 100));
}

/**
 * Interpreta o texto do campo (ex.: 1.234,56) como número.
 * Aceita também entrada sem milhares e valores colados com "R$".
 */
export function parseBrlInputString(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const normalized = t
    .replace(/\s/g, '')
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Quilometragem inteira com separador de milhar (pt-BR), ex.: 125.430. */
export function formatKmInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 9);
  if (!d) return '';
  const n = parseInt(d, 10);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Interpreta km com pontos de milhar (ou só dígitos) como inteiro. */
export function parseKmInputString(s: string): number | null {
  const t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  const normalized = t.replace(/\./g, '');
  const n = parseInt(normalized, 10);
  return Number.isFinite(n) ? n : null;
}
