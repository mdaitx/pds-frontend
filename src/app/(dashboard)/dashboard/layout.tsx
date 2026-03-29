'use client';

import { DashboardRouteGuard } from '@/components/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ActivityHintProvider } from '@/contexts/activity-hint-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardRouteGuard>
      <ActivityHintProvider>
        <DashboardSidebar>{children}</DashboardSidebar>
      </ActivityHintProvider>
    </DashboardRouteGuard>
  );
}
