'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  ImageIcon,
  Receipt,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import { getExpensesByTrip, getTrip, type Expense, type Trip } from '@/lib';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingMessage } from '@/components/ui/loading';

const RECEIPT_THRESHOLD = 100;

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR');
}

function isImageReceipt(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(avif|gif|jpe?g|png|webp)$/i.test(pathname);
  } catch {
    return /\.(avif|gif|jpe?g|png|webp)(\?|#|$)/i.test(url.toLowerCase());
  }
}

function receiptLabel(expense: Expense): string {
  const details = [expense.description, expense.location].filter(Boolean).join(' · ');
  return details || expense.category.name;
}

function ReceiptCard({
  expense,
  required,
  onPreview,
}: {
  expense: Expense;
  required: boolean;
  onPreview: (expense: Expense) => void;
}) {
  const receiptUrl = expense.receiptUrl;
  const image = receiptUrl ? isImageReceipt(receiptUrl) : false;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted/40">
        {receiptUrl && image ? (
          <button
            type="button"
            onClick={() => onPreview(expense)}
            className="group relative h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            aria-label={`Ampliar comprovante de ${receiptLabel(expense)}`}
          >
            <Image
              src={receiptUrl}
              alt={`Comprovante de ${expense.category.name}`}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-x-3 bottom-3 rounded-lg bg-black/55 px-3 py-2 text-left text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Clique para ampliar
            </span>
          </button>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <FileText className="h-10 w-10" aria-hidden />
            <span className="text-sm font-medium">Comprovante em arquivo</span>
          </div>
        )}
        {required && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:bg-amber-500/18 dark:text-amber-100">
            Obrigatório
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{expense.category.name}</h2>
            <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive">
              {formatBrl(expense.amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(expense.date)}
            {expense.description ? ` · ${expense.description}` : ''}
            {expense.location ? ` · ${expense.location}` : ''}
          </p>
        </div>

        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            Abrir arquivo original
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}

export default function ComprovantesViagemPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser || !tripId) return;
    const allowed = appUser.role === 'OWNER' || appUser.role === 'ADMIN' || appUser.role === 'DRIVER';
    if (!allowed) {
      router.replace('/dashboard');
      return;
    }

    Promise.all([getTrip(tripId), getExpensesByTrip(tripId)])
      .then(([loadedTrip, loadedExpenses]) => {
        setTrip(loadedTrip);
        setExpenses(loadedExpenses);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar comprovantes'))
      .finally(() => setLoading(false));
  }, [session, appUser, tripId, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const { requiredExpenses, requiredWithReceipts, optionalWithReceipts, requiredMissing, totalRequiredValue } =
    useMemo(() => {
      const required = expenses.filter((expense) => expense.amount > RECEIPT_THRESHOLD);
      return {
        requiredExpenses: required,
        requiredWithReceipts: required.filter((expense) => expense.receiptUrl),
        optionalWithReceipts: expenses.filter((expense) => expense.amount <= RECEIPT_THRESHOLD && expense.receiptUrl),
        requiredMissing: required.filter((expense) => !expense.receiptUrl),
        totalRequiredValue: required.reduce((sum, expense) => sum + expense.amount, 0),
      };
    }, [expenses]);

  if (authLoading || loading) {
    return (
      <div className="settings-font-inter flex min-h-screen items-center justify-center bg-background tracking-tight">
        <LoadingMessage message="Carregando comprovantes…" className="text-muted-foreground" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="lg">
        <Link
          href={tripId ? `/dashboard/viagens/${tripId}` : '/dashboard/viagens'}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à viagem
        </Link>
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || 'Viagem não encontrada.'}
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/dashboard/viagens/${trip.id}`}
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar à viagem
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Comprovantes da viagem {trip.code}</h1>
            <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/22">
              Acima de {formatBrl(RECEIPT_THRESHOLD)}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Visualize as fotos e arquivos enviados para despesas que precisam de conferência.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo dos comprovantes">
        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/12 p-2 text-primary dark:bg-primary/22">
              <Receipt className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Despesas acima de R$ 100</p>
              <p className="text-lg font-semibold text-foreground">{requiredExpenses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Com comprovante</p>
              <p className="text-lg font-semibold text-foreground">{requiredWithReceipts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-900 dark:bg-amber-500/18 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Valor em conferência</p>
              <p className="text-lg font-semibold text-foreground">{formatBrl(totalRequiredValue)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {requiredMissing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/35">
          <CardHeader className="pb-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-50">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Despesas acima de {formatBrl(RECEIPT_THRESHOLD)} sem comprovante
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {requiredMissing.map((expense) => (
                <div key={expense.id} className="rounded-lg border border-amber-200 bg-card/80 p-3 dark:border-amber-500/35 dark:bg-amber-950/35">
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                    {expense.category.name} · {formatBrl(expense.amount)}
                  </p>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-100">
                    {formatDate(expense.date)}
                    {expense.description ? ` · ${expense.description}` : ''}
                    {expense.location ? ` · ${expense.location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Comprovantes obrigatórios</h2>
          <p className="text-sm text-muted-foreground">Fotos e arquivos das despesas lançadas acima de R$ 100.</p>
        </div>

        {requiredWithReceipts.length === 0 ? (
          <Card className="border-dashed border-border bg-card shadow-sm">
            <CardContent className="flex min-h-44 flex-col items-center justify-center p-8 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">Nenhum comprovante obrigatório enviado.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Quando uma despesa acima de {formatBrl(RECEIPT_THRESHOLD)} tiver foto anexada, ela aparecerá aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requiredWithReceipts.map((expense) => (
              <ReceiptCard key={expense.id} expense={expense} required onPreview={setSelectedExpense} />
            ))}
          </div>
        )}
      </section>

      {optionalWithReceipts.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Outros comprovantes</h2>
            <p className="text-sm text-muted-foreground">Anexos enviados em despesas de até R$ 100.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {optionalWithReceipts.map((expense) => (
              <ReceiptCard key={expense.id} expense={expense} required={false} onPreview={setSelectedExpense} />
            ))}
          </div>
        </section>
      )}

      {selectedExpense?.receiptUrl && isImageReceipt(selectedExpense.receiptUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização do comprovante"
        >
          <div className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{selectedExpense.category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBrl(selectedExpense.amount)} · {formatDate(selectedExpense.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Fechar comprovante"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="relative h-[74vh] max-h-[78vh] bg-black/90 p-2">
              <Image
                src={selectedExpense.receiptUrl}
                alt={`Comprovante ampliado de ${selectedExpense.category.name}`}
                fill
                unoptimized
                sizes="100vw"
                className="rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
