import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  LayoutDashboard,
  Receipt,
  Route,
  Shield,
  Smartphone,
  TruckIcon,
  Users,
  Wallet,
} from 'lucide-react';

type IconProps = { className?: string };

export function ArrowRightIcon({ className = 'h-5 w-5' }: IconProps) {
  return <ArrowRight className={className} aria-hidden />;
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  settlement: Wallet,
  truck: TruckIcon,
  route: Route,
  dashboard: LayoutDashboard,
  receipt: Receipt,
  users: Users,
  mobile: Smartphone,
  shield: Shield,
};

export function FeatureIcon({
  name,
  className = 'h-6 w-6',
}: IconProps & { name: string }) {
  const Icon = FEATURE_ICONS[name] ?? Wallet;
  return <Icon className={className} aria-hidden />;
}
