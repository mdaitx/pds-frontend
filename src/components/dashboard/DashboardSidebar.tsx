'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  defaultMonthlyReportRange,
  getTripsReport,
  reportsTripsQueryKey,
  type AuthUser,
} from '@/lib';
import { BrandLogo } from '@/components/brand-logo';
import { SubscriptionNotice } from '@/components/dashboard/SubscriptionNotice';

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
  prefetchRelatorios: () => void;
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
  prefetchRelatorios,
}: DashboardSidebarNavProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {mobile ? (
        <div className="safe-top flex w-full shrink-0 items-start border-b border-border px-4 py-3 sm:px-5">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={onNavClick}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-lg outline-none transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            title="Truck Finanças — Início"
          >
            <BrandLogo size={48} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-primary">Truck Finanças</p>
              <p className="text-[0.65rem] leading-snug text-muted-foreground">Gestão de fretes e comissões</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onNavClick}
            className="pds-interactive pds-focus-ring ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted"
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
            'flex items-center gap-3 border-b border-border px-5 py-5 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
            collapsed && 'justify-center px-3'
          )}
          title="Truck Finanças — Início"
        >
          <BrandLogo size={56} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 overflow-hidden text-left">
              <p className="text-base font-bold leading-tight whitespace-nowrap text-primary">Truck Finanças</p>
              <p className="text-[0.7rem] leading-snug text-muted-foreground">Gestão de fretes e comissões</p>
            </div>
          )}
        </Link>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
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
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavClick}
              onMouseEnter={() => {
                if (item.href === '/dashboard/relatorios') prefetchRelatorios();
              }}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
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
                      className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.65rem] font-bold text-primary-foreground"
                      aria-label="Novidade em viagens"
                    >
                      {tripsActivityCount > 9 ? '9+' : tripsActivityCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-primary/50" />}
                </>
              )}
              {collapsed && item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                <span className="absolute top-1.5 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
              )}
              {collapsed && (
                <div className="invisible absolute left-full z-50 ml-2 rounded-lg border border-border bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-all group-hover:visible group-hover:opacity-100 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn('space-y-2 border-border border-t px-3 py-4', collapsed && 'px-2')}>
        {!collapsed && appUser && (
          <>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="truncate text-[0.8rem] font-semibold text-foreground">{appUser.email}</p>
              <p className="text-[0.72rem] text-muted-foreground">{ROLE_LABEL[appUser.role]}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[0.8rem] text-destructive transition-colors duration-200 hover:bg-destructive/10"
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
            className="group relative flex w-full items-center justify-center rounded-lg p-2.5 text-destructive transition-colors duration-200 hover:bg-destructive/10"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
            <div className="invisible absolute left-full z-50 ml-2 rounded-lg border border-border bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-all group-hover:visible group-hover:opacity-100 whitespace-nowrap">
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
  const queryClient = useQueryClient();
  const { appUser, signOut, session } = useAuth();
  const { tripsActivityCount } = useActivityHint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const prefetchRelatorios = useCallback(() => {
    if (!appUser || (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN')) return;
    const { fromYmd, toYmd } = defaultMonthlyReportRange();
    void queryClient.prefetchQuery({
      queryKey: reportsTripsQueryKey(fromYmd, toYmd),
      queryFn: () => getTripsReport(fromYmd, toYmd, session?.access_token),
      staleTime: 60_000,
    });
  }, [appUser, queryClient, session?.access_token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      queueMicrotask(() => setSidebarCollapsed(saved === 'true'));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

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
    return <div className="min-h-screen w-full bg-background">{children}</div>;
  }

  return (
    <div className="flex h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'relative hidden flex-shrink-0 flex-col border-border border-r bg-card transition-all duration-300 print:hidden md:flex',
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
          prefetchRelatorios={prefetchRelatorios}
        />
        <button
          type="button"
          onClick={toggleSidebar}
          className="pds-interactive pds-focus-ring absolute top-6 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm print:hidden hover:bg-muted/50 hover:text-foreground md:flex"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
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
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu de navegação"
          />
          <aside
            id="dashboard-mobile-sidebar"
            className="absolute top-0 right-0 bottom-0 left-auto flex w-72 max-w-[85vw] flex-col bg-card shadow-xl"
          >
            <DashboardSidebarNav
              mobile
              navItems={navItems}
              pathname={pathname}
              tripsActivityCount={tripsActivityCount}
              appUser={appUser}
              onNavClick={closeMobileNav}
              onLogout={handleLogout}
              prefetchRelatorios={prefetchRelatorios}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="safe-top sticky top-0 z-40 flex min-h-[52px] shrink-0 items-center gap-3 border-border border-b bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur print:hidden sm:px-5 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="pds-interactive pds-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shadow-sm hover:bg-muted"
            aria-label="Abrir menu de navegação"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </button>
          {!sidebarOpen && (
            <Link
              href="/dashboard"
              prefetch={false}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              title="Truck Finanças — Início"
            >
              <BrandLogo size={44} className="shrink-0" />
              <span className="truncate text-base font-bold text-primary">Truck Finanças</span>
            </Link>
          )}
          {sidebarOpen && <span className="min-w-0 flex-1" aria-hidden />}
        </header>

        <main
          className={cn(
            'safe-main print:overflow-visible flex-1 overflow-y-auto print:bg-card',
            appUser && 'safe-main-with-bottom-nav md:pb-0'
          )}
        >
          <SubscriptionNotice />
          {children}
        </main>
        {appUser && (
          <nav
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-border border-t bg-card/95 px-2 pt-1 pb-1 shadow-[0_-8px_24px_hsl(224_71%_4%/0.06)] backdrop-blur print:hidden md:hidden"
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
                    prefetch={false}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[0.72rem] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
                      appUser.role !== 'DRIVER' && 'min-w-[76px]',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                    {item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                      <span className="absolute mt-[-2.1rem] ml-8 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
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
