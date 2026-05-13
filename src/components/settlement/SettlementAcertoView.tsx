'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadSettlementPdf } from '@/lib/settlement-pdf';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';
import { cn } from '@/lib/cn';
import { computeTripFuelMetrics } from '@/lib/reports';
import type { SettlementWithTrip } from '@/lib';

const ADVANCE_METHOD_LABEL: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
};

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Props = {
  settlement: SettlementWithTrip;
  isOwner: boolean;
  markingPaid: boolean;
  onMarkPaid: () => void;
  backHref: string;
  backLabel?: string;
};

export function SettlementAcertoView({
  settlement: s,
  isOwner,
  markingPaid,
  onMarkPaid,
  backHref,
  backLabel = 'Voltar',
}: Props) {
  const trip = s.trip;
  const finalKmShown = s.finalKm ?? trip.finalKm;
  const fuelMetrics = useMemo(() => computeTripFuelMetrics(trip, trip.expenses, s), [trip, s]);

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="mx-auto min-w-0 max-w-full">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline"
        >
          ← {backLabel}
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold text-foreground">Acerto · {trip.code}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {trip.origin || '—'} → {trip.destination || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadSettlementPdf(s, isOwner)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted sm:w-auto"
          >
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </button>
        </div>

        <Card className="mt-6 border-border p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados da viagem</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium text-foreground">{trip.clientName || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Motorista</dt>
              <dd className="font-medium text-foreground">{trip.driver?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Veículo</dt>
              <dd className="font-medium text-foreground">
                {trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Frete</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatBRL(trip.freightValue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Período</dt>
              <dd className="font-medium text-foreground">
                {new Date(trip.startDate).toLocaleString('pt-BR')}
                {trip.endDate && ` — ${new Date(trip.endDate).toLocaleString('pt-BR')}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Km</dt>
              <dd className="font-medium tabular-nums text-foreground">
                inicial {trip.initialKm != null ? trip.initialKm.toLocaleString('pt-BR') : '—'} · final{' '}
                {finalKmShown != null ? finalKmShown.toLocaleString('pt-BR') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Média km/L</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {fuelMetrics.kmPerLiter != null
                  ? `${fuelMetrics.kmPerLiter.toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 0,
                    })} km/L`
                  : '—'}
              </dd>
            </div>
          </dl>
          {fuelMetrics.kmPerLiter == null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Informe km inicial/final e litragem nas despesas de combustível para calcular a média km/L.
            </p>
          )}
        </Card>

        <Card className="mt-4 border border-emerald-500/35 bg-emerald-500/10 p-6 dark:bg-emerald-950/35">
          <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">Resumo do acerto</h2>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 rounded-lg bg-card/90 px-3 py-2 dark:bg-card/50">
              <dt className="text-muted-foreground">Total despesas</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatBRL(s.totalExpenses)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-card/90 px-3 py-2 dark:bg-card/50">
              <dt className="text-muted-foreground">Frete − despesas</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatBRL(s.grossProfit)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-card/90 px-3 py-2 dark:bg-card/50">
              <dt className="text-muted-foreground">Comissão ({s.driverCommissionPct}%)</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatBRL(s.driverCommissionAmt)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-card/90 px-3 py-2 dark:bg-card/50">
              <dt className="text-muted-foreground">Adiantamentos</dt>
              <dd className="text-right font-semibold tabular-nums text-foreground">
                <span className="block">{formatBRL(s.totalAdvances)}</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Abatem do salário na folha, não da comissão desta viagem.
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-emerald-600/15 px-3 py-2 sm:col-span-2 dark:bg-emerald-500/20">
              <dt className="font-medium text-emerald-950 dark:text-emerald-50">A pagar ao motorista (comissão)</dt>
              <dd className="text-lg font-bold tabular-nums text-emerald-950 dark:text-emerald-50">
                {formatBRL(s.amountToPayDriver)}
              </dd>
            </div>
            {isOwner && (
              <div className="flex justify-between gap-4 rounded-lg bg-card/90 px-3 py-2 sm:col-span-2 dark:bg-card/50">
                <dt className="text-muted-foreground">Resultado do dono</dt>
                <dd className="font-semibold tabular-nums text-foreground">{formatBRL(s.ownerResult)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 border-t border-emerald-500/30 pt-4 dark:border-emerald-400/25">
            {s.paid ? (
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Pagamento ao motorista registrado
                {s.paidAt && ` em ${new Date(s.paidAt).toLocaleString('pt-BR')}`}
              </p>
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Pagamento ao motorista ainda não marcado como efetuado.
              </p>
            )}
            {isOwner && !s.paid && (
              <Button
                type="button"
                onClick={onMarkPaid}
                disabled={markingPaid}
                loading={markingPaid}
                className="mt-3 w-full bg-emerald-700 text-emerald-50 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 sm:w-auto"
              >
                {markingPaid ? 'Salvando…' : 'Marcar pagamento ao motorista como efetuado'}
              </Button>
            )}
          </div>
        </Card>

        <Card className="border-border mt-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">Despesas</h2>
          <div className={cn('mt-3', mobileTableScrollClass)}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-border border-b text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {trip.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Nenhuma despesa.
                    </td>
                  </tr>
                ) : (
                  trip.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border/70">
                      <td className="py-2 pr-3 whitespace-nowrap text-foreground">
                        {new Date(e.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3 text-foreground">{e.category.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{e.description || '—'}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-foreground">
                        {formatBRL(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-border mt-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">Adiantamentos</h2>
          <div className={cn('mt-3', mobileTableScrollClass)}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Método</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {trip.advances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Nenhum adiantamento.
                    </td>
                  </tr>
                ) : (
                  trip.advances.map((a) => (
                    <tr key={a.id} className="border-b border-border/70">
                      <td className="py-2 pr-3 whitespace-nowrap text-foreground">
                        {new Date(a.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3 text-foreground">{ADVANCE_METHOD_LABEL[a.method] ?? a.method}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{a.description || '—'}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-foreground">{formatBRL(a.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
