import { AuthThemeCorner, GuestGuard } from '@/components/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-card to-primary/12 p-4 transition-colors duration-300">
      <AuthThemeCorner />
      <div className="relative z-10 w-full max-w-md">
        <GuestGuard>{children}</GuestGuard>
      </div>
    </div>
  );
}
