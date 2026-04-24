import { GuestGuard } from '@/components/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <GuestGuard>{children}</GuestGuard>
      </div>
    </div>
  );
}
