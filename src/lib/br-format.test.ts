import { describe, expect, it } from 'vitest';
import {
  digitsOnly,
  formatCpf,
  formatCnpjMask,
  formatCpfCnpjDocument,
  formatPhoneBr,
  isValidCnpj,
} from './br-format';

describe('digitsOnly', () => {
  it('remove não dígitos e respeita maxLen', () => {
    expect(digitsOnly('a1b2c3', 2)).toBe('12');
    expect(digitsOnly('999')).toBe('999');
  });
});

describe('formatCpf', () => {
  it('aplica máscara progressiva', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
    expect(formatCpf('12345')).toBe('123.45');
  });
});

describe('formatCnpjMask', () => {
  it('formata CNPJ completo', () => {
    expect(formatCnpjMask('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('formatCpfCnpjDocument', () => {
  it('usa CPF até 11 dígitos e CNPJ acima', () => {
    expect(formatCpfCnpjDocument('12345678901')).toBe('123.456.789-01');
    expect(formatCpfCnpjDocument('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('formatPhoneBr', () => {
  it('formata celular com 11 dígitos', () => {
    expect(formatPhoneBr('11999887766')).toBe('(11) 99988-7766');
  });
});

describe('isValidCnpj', () => {
  it('rejeita sequência repetida', () => {
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('aceita CNPJ válido conhecido', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
  });
});
