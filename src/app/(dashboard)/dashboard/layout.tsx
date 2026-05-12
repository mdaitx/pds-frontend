'use client';

import { Suspense } from 'react';
import { DashboardRouteGuard } from '@/components/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ActivityHintProvider } from '@/contexts/activity-hint-context';
import { LoadingMessage } from '@/components/ui/loading';

function DashboardPageSuspenseFallback() {
  return (
    <div className="flex min-h-[42vh] w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-14">
      <LoadingMessage message="Carregando…" className="text-muted-foreground" />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ActivityHintProvider>
      <DashboardSidebar>
        <DashboardRouteGuard>
          <Suspense fallback={<DashboardPageSuspenseFallback />}>{children}</Suspense>
        </DashboardRouteGuard>
      </DashboardSidebar>
    </ActivityHintProvider>
  );
}
