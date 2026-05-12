import { cn } from '@/lib/cn';

type SkeletonProps = {
  className?: string;
};

/** Bloco com animação de pulso — usar para estados de carregamento. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/70 dark:bg-muted/50', className)}
      aria-hidden="true"
    />
  );
}
