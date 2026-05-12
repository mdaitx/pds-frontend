import { Skeleton } from '@/components/ui/skeleton';

/** Carregamento inicial antes de saber o papel do usuário (neutro: dono ou motorista). */
export function DashboardBootSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="w-full max-w-[1400px] space-y-4">
        <Skeleton className="mx-auto h-8 w-48 sm:mx-0" />
        <Skeleton className="mx-auto h-4 w-72 max-w-full sm:mx-0" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl border border-border/65" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl border border-border/65" />
      </div>
    </div>
  );
}

/** Linhas da tabela “Últimas viagens” durante carregamento. */
/** Lista de cards de viagem (lista /dashboard/viagens). */
export function ViagensCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Skeleton className="h-9 flex-1 rounded-lg sm:w-24" />
              <Skeleton className="h-9 flex-1 rounded-lg sm:w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentTripsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="hidden px-4 py-3 md:table-cell">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-24 rounded-full" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-10" />
          </td>
        </tr>
      ))}
    </>
  );
}
