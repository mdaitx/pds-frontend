'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Route,
  Users,
  UserCog,
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
import { getOnboardingStatus } from '@/lib';
import { cn } from '@/lib/cn';
import type { AuthUser } from '@/lib';

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
];

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut } = useAuth();
  const { tripsActivityCount } = useActivityHint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** Só relevante para OWNER: evita mostrar a sidebar em /dashboard antes do redirect para o onboarding. */
  const [ownerOnboardingComplete, setOwnerOnboardingComplete] = useState<boolean | null>(null);
  const ownerOnboardingCacheRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!appUser) {
      ownerOnboardingCacheRef.current = null;
      setOwnerOnboardingComplete(null);
      return;
    }
    if (appUser.role !== 'OWNER') {
      ownerOnboardingCacheRef.current = true;
      setOwnerOnboardingComplete(true);
      return;
    }

    const isDashboardRoot = pathname === '/dashboard';
    const isOnboardingRouteCheck =
      pathname === '/dashboard/onboarding' || pathname.startsWith('/dashboard/onboarding/');
    const mustRefetch =
      isDashboardRoot ||
      isOnboardingRouteCheck ||
      ownerOnboardingCacheRef.current === null;

    if (!mustRefetch) {
      setOwnerOnboardingComplete(ownerOnboardingCacheRef.current);
      return;
    }

    let cancelled = false;
    setOwnerOnboardingComplete(null);
    getOnboardingStatus()
      .then((s) => {
        if (!cancelled) {
          ownerOnboardingCacheRef.current = s.completed;
          setOwnerOnboardingComplete(s.completed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          ownerOnboardingCacheRef.current = true;
          setOwnerOnboardingComplete(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appUser, pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved === 'true');
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

  /** Layout full-width sem sidebar: rota de onboarding ou raiz do dashboard enquanto o OWNER ainda não concluiu o wizard. */
  const suppressSidebarChrome =
    isOnboardingRoute ||
    (appUser?.role === 'OWNER' &&
      pathname === '/dashboard' &&
      ownerOnboardingComplete !== true);

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo — início do dashboard */}
      <Link
        href="/dashboard"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-3 px-6 py-5 border-b border-zinc-200 transition-all duration-300 outline-none hover:bg-zinc-50/90 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
          collapsed && 'px-3 justify-center'
        )}
        title="Truck Finanças — Início"
      >
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <TruckIcon className="w-5 h-5 text-white" aria-hidden />
        </div>
        {!collapsed && (
          <div className="overflow-hidden text-left">
            <p className="text-blue-600 whitespace-nowrap font-bold text-base leading-tight">Truck Finanças</p>
            <p className="text-zinc-500 whitespace-nowrap text-[0.7rem]">Gestão de frotas</p>
          </div>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full">
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
              onClick={() => setSidebarOpen(false)}
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
                      className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[0.65rem] font-bold text-white"
                      aria-label="Novidade em viagens"
                    >
                      {tripsActivityCount > 9 ? '9+' : tripsActivityCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
                </>
              )}
              {collapsed && item.href === '/dashboard/viagens' && tripsActivityCount > 0 && (
                <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
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

      {/* User Info */}
      <div className={cn('px-3 py-4 border-t border-zinc-200 space-y-2', collapsed && 'px-2')}>
        {!collapsed && appUser && (
          <>
            <div className="px-3 py-2 bg-zinc-50 rounded-lg">
              <p className="text-zinc-800 truncate text-[0.8rem] font-semibold">{appUser.email}</p>
              <p className="text-zinc-500 text-[0.72rem]">{ROLE_LABEL[appUser.role]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-[0.8rem]"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={handleLogout}
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

  if (suppressSidebarChrome) {
    return <div className="min-h-screen w-full bg-zinc-50">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-zinc-200 flex-shrink-0 transition-all duration-300 relative',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
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
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="text-blue-600 font-bold outline-none hover:underline focus-visible:underline"
              >
                Truck Finanças
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-zinc-100">
            <Menu className="w-5 h-5" />
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 outline-none rounded-lg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Truck Finanças — Início"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <TruckIcon className="w-4 h-4 text-white" aria-hidden />
            </div>
            <span className="text-blue-600 font-bold">Truck Finanças</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto safe-main">{children}</main>
      </div>
    </div>
  );
}
