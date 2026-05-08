'use client';

import { Suspense } from 'react';
import { DashboardRouteGuard } from '@/components/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ActivityHintProvider } from '@/contexts/activity-hint-context';
import { LoadingMessage } from '@/components/ui/loading';

function DashboardPageSuspenseFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-zinc-50">
      <LoadingMessage message="Carregando…" />
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
