'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Route,
  Users,
  UserCog,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  TruckIcon,
  ChevronRight,
  ChevronLeft,
  BarChart2,
} from 'lucide-react';
import { useAuth, useActivityHint } from '@/hooks';
import { cn } from '@/lib/cn';
import type { AuthUser } from '@/lib';
import { BrandLogo } from '@/components/brand-logo';

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  OWNER: 'Dono da frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Só dono (OWNER): ex. configurações da empresa */
  ownerOnly?: boolean;
  /** Destinos relacionados (ex.: cadastro ainda em /motoristas/novo) */
  activePathPrefixes?: string[];
}

const ownerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Viagens', href: '/dashboard/viagens', icon: <Route className="w-5 h-5" /> },
  { label: 'Veículos', href: '/dashboard/veiculos', icon: <TruckIcon className="w-5 h-5" /> },
  { label: 'Motoristas', href: '/dashboard/motoristas', icon: <Users className="w-5 h-5" /> },
  { label: 'Usuários', href: '/dashboard/usuarios', icon: <UserCog className="w-5 h-5" /> },
  {
    label: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <BarChart2 className="w-5 h-5" />,
    activePathPrefixes: ['/dashboard/relatorios'],
  },
  { label: 'Configurações', href: '/dashboard/config', icon: <Settings className="w-5 h-5" />, ownerOnly: true },
];

const driverNav: NavItem[] = [
  { label: 'Painel', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Minhas Viagens', href: '/dashboard/viagens', icon: <Route className="w-5 h-5" /> },
  {
    label: 'Perfil',
    href: '/dashboard/perfil',
    icon: <User className="w-5 h-5" />,
    activePathPrefixes: ['/dashboard/perfil'],
  },
];

type DashboardSidebarNavProps = {
  collapsed?: boolean;
  mobile?: boolean;
  navItems: NavItem[];
  pathname: string;
  tripsActivityCount: number;
  appUser: AuthUser | null;
  onNavClick: () => void;
  onLogout: () => void;
};

function DashboardSidebarNav({
  collapsed = false,
  mobile = false,
  navItems,
  pathname,
  tripsActivityCount,
  appUser,
  onNavClick,
  onLogout,
}: DashboardSidebarNavProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {mobile ? (
        <div className="flex w-full shrink-0 items-center border-b border-zinc-200 px-3 py-3 sm:px-4">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={onNavClick}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Truck Finanças — Início"
          >
            <BrandLogo size={48} className="shrink-0" />
            <span className="truncate text-base font-bold text-blue-600">Truck Finanças</span>
          </Link>
          <button
            type="button"
            onClick={onNavClick}
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : (
        <Link
          href="/dashboard"
          prefetch={false}
          onClick={onNavClick}
          className={cn(
            'flex items-center gap-3 border-b border-zinc-200 px-5 py-5 transition-all duration-300 outline-none hover:bg-zinc-50/90 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
            collapsed && 'justify-center px-3'
          )}
          title="Truck Finanças — Início"
        >
          <BrandLogo size={56} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 overflow-hidden text-left">
              <p className="text-base font-bold leading-tight whitespace-nowrap text-blue-600">Truck Finanças</p>
              <p className="whitespace-nowrap text-[0.7rem] text-zinc-500">Gestão de frotas</p>
            </div>
          )}
        </Link>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200">
        {navItems.map((item) => {
          const extraActive =
            item.activePathPrefixes?.some((p) => pathname.startsWith(p)) ?? false;
          const isActive =
            pathname === item.href ||
            extraActive ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={onNavClick}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className={isActive ? 'font-semibold' : 'font-normal'}>{item.label}</span>
                  {item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                    <span
                      className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[0.65rem] font-bold text-white"
                      aria-label="Novidade em viagens"
                    >
                      {tripsActivityCount > 9 ? '9+' : tripsActivityCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
                </>
              )}
              {collapsed && item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn('px-3 py-4 border-t border-zinc-200 space-y-2', collapsed && 'px-2')}>
        {!collapsed && appUser && (
          <>
            <div className="px-3 py-2 bg-zinc-50 rounded-lg">
              <p className="text-zinc-800 truncate text-[0.8rem] font-semibold">{appUser.email}</p>
              <p className="text-zinc-500 text-[0.72rem]">{ROLE_LABEL[appUser.role]}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-[0.8rem]"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </>
        )}
        {collapsed && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors group relative"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Sair
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut } = useAuth();
  const { tripsActivityCount } = useActivityHint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      queueMicrotask(() => setSidebarCollapsed(saved === 'true'));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getNavItems = (): NavItem[] => {
    if (!appUser) return ownerNav;
    if (appUser.role === 'DRIVER') return driverNav;
    if (appUser.role === 'ADMIN') return ownerNav.filter((item) => !item.ownerOnly);
    return ownerNav;
  };

  const navItems = getNavItems();

  const isOnboardingRoute =
    pathname === '/dashboard/onboarding' || pathname.startsWith('/dashboard/onboarding/');

  /** Layout full-width sem sidebar apenas no onboarding, evitando piscar o dashboard sem navegação. */
  const suppressSidebarChrome = isOnboardingRoute;

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const closeMobileNav = () => setSidebarOpen(false);

  if (suppressSidebarChrome) {
    return <div className="min-h-screen w-full bg-zinc-50">{children}</div>;
  }

  return (
    <div className="flex h-dvh bg-zinc-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-zinc-200 flex-shrink-0 transition-all duration-300 relative',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <DashboardSidebarNav
          collapsed={sidebarCollapsed}
          navItems={navItems}
          pathname={pathname}
          tripsActivityCount={tripsActivityCount}
          appUser={appUser}
          onNavClick={closeMobileNav}
          onLogout={handleLogout}
        />
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-sm z-10"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside
            id="dashboard-mobile-sidebar"
            className="absolute left-0 top-0 bottom-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <DashboardSidebarNav
              mobile
              navItems={navItems}
              pathname={pathname}
              tripsActivityCount={tripsActivityCount}
              appUser={appUser}
              onNavClick={closeMobileNav}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="safe-top md:hidden sticky top-0 z-40 flex min-h-[52px] shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Abrir menu de navegação"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
          {!sidebarOpen && (
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Truck Finanças — Início"
            >
              <BrandLogo size={44} className="shrink-0" />
              <span className="truncate text-base font-bold text-blue-600">Truck Finanças</span>
            </Link>
          )}
          {sidebarOpen && <span className="min-w-0 flex-1" aria-hidden />}
        </header>

        <main className={cn('flex-1 overflow-y-auto safe-main', appUser && 'pb-24 md:pb-0')}>
          {children}
        </main>
        {appUser && (
          <nav
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-1 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
            aria-label="Navegação principal"
          >
            <div
              className={cn(
                'mx-auto gap-1',
                appUser.role === 'DRIVER'
                  ? 'grid max-w-md grid-cols-3'
                  : 'flex max-w-full touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]'
              )}
            >
              {navItems.map((item) => {
                const extraActive =
                  item.activePathPrefixes?.some((p) => pathname.startsWith(p)) ?? false;
                const isActive =
                  pathname === item.href ||
                  extraActive ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[0.72rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      appUser.role !== 'DRIVER' && 'min-w-[76px]',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                    {item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                      <span className="absolute mt-[-2.1rem] ml-8 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
