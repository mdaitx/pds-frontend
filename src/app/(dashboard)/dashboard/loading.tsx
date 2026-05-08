import { Skeleton } from '@/components/ui';

/**
 * Fallback de navegação do segmento `/dashboard` (App Router).
 * Melhora a percepção de velocidade enquanto o bundle da página carrega.
 */
export default function DashboardLoading() {
  return (
    <div className="settings-font-inter mx-auto max-w-6xl space-y-4 px-4 py-6 tracking-tight">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
