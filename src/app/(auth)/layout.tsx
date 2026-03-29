import { GuestGuard } from '@/components/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <GuestGuard>{children}</GuestGuard>
      </div>
    </div>
  );
}
