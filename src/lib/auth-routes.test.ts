import { describe, expect, it } from 'vitest';
import {
  getRolesRequiredForDashboardPath,
  isGuestAuthPath,
  isMiddlewareGuestSuccessRedirectPath,
  userHasDashboardPathAccess,
} from './auth-routes';
import type { AuthUser } from '@/services/api';

const admin = { role: 'ADMIN' } as AuthUser;
const driver = { role: 'DRIVER' } as AuthUser;

describe('isGuestAuthPath', () => {
  it('inclui login e reset-password', () => {
    expect(isGuestAuthPath('/login')).toBe(true);
    expect(isGuestAuthPath('/reset-password')).toBe(true);
    expect(isGuestAuthPath('/dashboard')).toBe(false);
  });
});

describe('isMiddlewareGuestSuccessRedirectPath', () => {
  it('exclui reset-password do redirect pós-login', () => {
    expect(isMiddlewareGuestSuccessRedirectPath('/login')).toBe(true);
    expect(isMiddlewareGuestSuccessRedirectPath('/reset-password')).toBe(false);
  });
});

describe('getRolesRequiredForDashboardPath', () => {
  it('retorna OWNER para /dashboard/config', () => {
    expect(getRolesRequiredForDashboardPath('/dashboard/config')).toEqual(['OWNER']);
  });

  it('retorna OWNER e ADMIN para motoristas', () => {
    expect(getRolesRequiredForDashboardPath('/dashboard/motoristas')).toEqual(['OWNER', 'ADMIN']);
  });

  it('retorna null para rotas genéricas do dashboard', () => {
    expect(getRolesRequiredForDashboardPath('/dashboard')).toBeNull();
  });
});

describe('userHasDashboardPathAccess', () => {
  it('motorista não acessa relatórios', () => {
    expect(userHasDashboardPathAccess(driver, '/dashboard/relatorios')).toBe(false);
  });

  it('admin acessa relatórios', () => {
    expect(userHasDashboardPathAccess(admin, '/dashboard/relatorios')).toBe(true);
  });

  it('motorista acessa dashboard home quando regra é null', () => {
    expect(userHasDashboardPathAccess(driver, '/dashboard')).toBe(true);
  });
});
