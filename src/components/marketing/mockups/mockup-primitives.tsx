import {
  Activity,
  BarChart2,
  DollarSign,
  LayoutDashboard,
  Receipt,
  Route,
  Settings,
  TrendingUp,
  TruckIcon,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/cn';

/** Mesmas classes de status do dashboard (`page.tsx`). */
export const MOCKUP_STATUS = {
  COMPLETED: {
    label: 'Concluída',
    className:
      'border border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-50',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    className:
      'border border-transparent bg-primary/15 text-primary dark:bg-primary/28 dark:text-primary-foreground',
  },
} as const;

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Viagens', icon: Route, active: false },
  { label: 'Veículos', icon: TruckIcon, active: false },
  { label: 'Motoristas', icon: Users, active: false },
  { label: 'Relatórios', icon: BarChart2, active: false },
  { label: 'Configurações', icon: Settings, active: false },
] as const;

export function MockupSidebar() {
  return (
    <aside
      className="flex w-11 shrink-0 flex-col border-r border-border bg-card sm:w-12"
      aria-hidden
    >
      <div className="flex justify-center border-b border-border px-2 py-3">
        <BrandLogo size={28} className="shrink-0" />
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1 px-1.5 py-2">
        {NAV.slice(0, 5).map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            title={label}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function MockupAppShell({
  children,
  compact = false,
  fill = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
  fill?: boolean;
}) {
  return (
    <div className={cn('flex min-h-0 overflow-hidden bg-background', fill && 'h-full min-h-0 flex-1')}>
      <MockupSidebar />
      <div
        className={cn(
          'min-w-0 flex-1 space-y-3 overflow-hidden bg-background',
          compact ? 'p-2.5' : 'p-3 sm:p-4',
          fill && 'flex flex-col',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MockupWelcomeBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg dark:from-blue-950 dark:to-slate-950 dark:shadow-black/35',
        compact ? 'p-3' : 'p-3.5 sm:p-4',
      )}
    >
      <p className="text-[0.65rem] text-blue-100 dark:text-blue-50/95 sm:text-xs">Dono da frota</p>
      <p className={cn('mt-0.5 font-semibold tracking-tight', compact ? 'text-sm' : 'text-base sm:text-lg')}>
        Olá, transportador
      </p>
      {!compact && (
        <p className="mt-1.5 max-w-md text-[0.65rem] leading-relaxed text-blue-100 dark:text-blue-50/95 sm:text-xs">
          Viagens, frota e resultado financeiro numa visão só.
        </p>
      )}
    </div>
  );
}

type MockupMetricProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  compact?: boolean;
};

export function MockupMetricCard({ title, value, icon, iconBg, compact }: MockupMetricProps) {
  return (
    <div
      className={cn(
        'flex min-h-[4.5rem] flex-col rounded-2xl border border-border/70 bg-card shadow-sm dark:border-border dark:shadow-black/35',
        compact ? 'min-h-[4rem]' : 'min-h-[4.75rem] sm:min-h-[5rem]',
      )}
    >
      <div className={cn('flex flex-1 flex-col justify-center', compact ? 'p-2.5' : 'p-3')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.65rem] text-muted-foreground sm:text-[0.72rem]">{title}</p>
            <p
              className={cn(
                'mt-0.5 truncate font-bold text-foreground',
                compact ? 'text-[0.85rem]' : 'text-[0.95rem] sm:text-[1.05rem]',
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8',
              iconBg,
            )}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockupMetricsRow({ compact = false }: { compact?: boolean }) {
  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const metrics = [
    {
      title: 'Faturamento',
      value: 'R$ 42.850',
      icon: <DollarSign className={cn(iconClass, 'text-accent')} aria-hidden />,
      iconBg: 'bg-accent/12 dark:bg-accent/22',
    },
    {
      title: 'Despesas (mês)',
      value: 'R$ 4.230',
      icon: <Receipt className={cn(iconClass, 'text-destructive')} aria-hidden />,
      iconBg: 'bg-destructive/12 dark:bg-destructive/22',
    },
    {
      title: 'Lucro líquido',
      value: 'R$ 38.620',
      icon: <TrendingUp className={cn(iconClass, 'text-emerald-600 dark:text-emerald-400')} aria-hidden />,
      iconBg: 'bg-emerald-500/12 dark:bg-emerald-500/22',
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {metrics.slice(0, 2).map((m) => (
          <MockupMetricCard key={m.title} {...m} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
      {metrics.map((m) => (
        <MockupMetricCard key={m.title} {...m} />
      ))}
      <MockupMetricCard
        title="Em andamento"
        value="2"
        icon={<Activity className={cn(iconClass, 'text-muted-foreground')} aria-hidden />}
        iconBg="bg-muted"
        compact={compact}
      />
    </div>
  );
}

export function MockupTripsTable({
  compact = false,
  maxRows,
}: {
  compact?: boolean;
  maxRows?: number;
}) {
  const allRows = [
    {
      code: 'VG-0011',
      route: 'POA → Florianópolis',
      value: 'R$ 12.500',
      status: MOCKUP_STATUS.COMPLETED,
    },
    {
      code: 'VG-0012',
      route: 'Curitiba → Joinville',
      value: 'R$ 9.800',
      status: MOCKUP_STATUS.IN_PROGRESS,
    },
  ];
  const rows = maxRows != null ? allRows.slice(0, maxRows) : allRows;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm dark:border-border dark:shadow-black/35">
      <div className={cn('border-b border-border/65', compact ? 'px-2.5 py-2' : 'px-3 py-2.5')}>
        <p className="text-[0.72rem] font-semibold text-foreground sm:text-sm">Últimas viagens</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[240px] text-left">
          <thead>
            <tr className="border-b border-border/65 bg-muted/60">
              {['Código', 'Rota', 'Status'].map((col) => (
                <th
                  key={col}
                  className={cn(
                    'px-2.5 py-2 font-semibold text-muted-foreground sm:px-3',
                    compact ? 'text-[0.58rem]' : 'text-[0.65rem]',
                  )}
                >
                  {col.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-border/45 hover:bg-muted/40">
                <td className={cn('px-2.5 py-2 font-semibold text-foreground sm:px-3', compact ? 'text-[0.62rem]' : 'text-[0.7rem]')}>
                  {row.code}
                </td>
                <td className={cn('px-2.5 py-2 text-muted-foreground sm:px-3', compact ? 'text-[0.62rem]' : 'text-[0.7rem]')}>
                  {row.route}
                </td>
                <td className="px-2.5 py-2 sm:px-3">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[0.58rem] font-semibold sm:text-[0.62rem]',
                      row.status.className,
                    )}
                  >
                    {row.status.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
