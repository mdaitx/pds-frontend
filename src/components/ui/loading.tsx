import { cn } from '@/lib/cn';

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label = 'Carregando' }: SpinnerProps) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      role="status"
      aria-label={label}
    />
  );
}

type LoadingMessageProps = {
  message?: string;
  className?: string;
};

export function LoadingMessage({ message = 'Carregando…', className }: LoadingMessageProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-sm text-muted-foreground', className)}>
      <Spinner className="text-primary" label={message} />
      <span>{message}</span>
    </div>
  );
}
