import { cn } from '@/lib/cn';

type SkeletonProps = {
  className?: string;
};

/** Bloco com animação de pulso — usar para estados de carregamento. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-zinc-200/80', className)}
      aria-hidden="true"
    />
  );
}
