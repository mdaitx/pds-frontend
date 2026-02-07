export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
