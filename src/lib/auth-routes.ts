import type { AuthUser } from '@/services/api';

export type UserRole = AuthUser['role'];

export const DASHBOARD_HOME = '/dashboard';

/**
 * Regras da mais específica à mais geral.
 * Se nenhuma casar, qualquer usuário autenticado com perfil (`appUser`) pode acessar.
 */
const DASHBOARD_RULES: { test: (pathname: string) => boolean; roles: UserRole[] }[] = [
  { test: (p) => p === '/dashboard/config' || p.startsWith('/dashboard/config/'), roles: ['OWNER'] },
  {
    test: (p) => p === '/dashboard/viagens/novo' || p.startsWith('/dashboard/viagens/novo/'),
    roles: ['OWNER', 'ADMIN'],
  },
  {
    test: (p) => p === '/dashboard/onboarding' || p.startsWith('/dashboard/onboarding/'),
    roles: ['OWNER'],
  },
  {
    test: (p) => p === '/dashboard/usuarios' || p.startsWith('/dashboard/usuarios/'),
    roles: ['OWNER', 'ADMIN'],
  },
  {
    test: (p) => p === '/dashboard/relatorios' || p.startsWith('/dashboard/relatorios/'),
    roles: ['OWNER', 'ADMIN'],
  },
  {
    test: (p) => p === '/dashboard/motoristas' || p.startsWith('/dashboard/motoristas/'),
    roles: ['OWNER', 'ADMIN'],
  },
  {
    test: (p) => p === '/dashboard/veiculos' || p.startsWith('/dashboard/veiculos/'),
    roles: ['OWNER', 'ADMIN'],
  },
];

/**
 * Rotas de autenticação (convidado): login, cadastro, recuperação.
 * Usadas pelo GuestGuard e documentação.
 */
export function isGuestAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/signup/') ||
    pathname.startsWith('/forgot-password/') ||
    pathname.startsWith('/reset-password/')
  );
}

/**
 * Rotas de convidado onde, se o middleware detectar sessão Supabase (JWT em cookie),
 * redireciona para o dashboard.
 *
 * **Exclui** `/reset-password`: o fluxo de recuperação pode manter sessão temporária
 * e o usuário precisa concluir a troca de senha na própria página.
 */
export function isMiddlewareGuestSuccessRedirectPath(pathname: string): boolean {
  if (pathname === '/reset-password' || pathname.startsWith('/reset-password/')) {
    return false;
  }
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/signup/') ||
    pathname.startsWith('/forgot-password/')
  );
}

/**
 * Define o destino após acessar uma rota de convidado já autenticado.
 * Cadastro sempre entra no fluxo de onboarding.
 */
export function getMiddlewareGuestSuccessRedirectPath(pathname: string): string {
  if (pathname === '/signup' || pathname.startsWith('/signup/')) {
    return '/dashboard/onboarding';
  }
  return DASHBOARD_HOME;
}

/**
 * Papéis exigidos para o caminho sob /dashboard, ou `null` se basta estar logado com perfil.
 */
export function getRolesRequiredForDashboardPath(pathname: string): UserRole[] | null {
  for (const rule of DASHBOARD_RULES) {
    if (rule.test(pathname)) return rule.roles;
  }
  return null;
}

export function userHasDashboardPathAccess(appUser: AuthUser, pathname: string): boolean {
  const required = getRolesRequiredForDashboardPath(pathname);
  if (required === null) return true;
  return required.includes(appUser.role);
}
