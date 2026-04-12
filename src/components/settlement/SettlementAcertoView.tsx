'use client';

import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { downloadSettlementPdf } from '@/lib/settlement-pdf';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';
import { cn } from '@/lib/cn';
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

  return (
    <div className="min-h-screen bg-zinc-50 px-3 py-4 sm:p-4 md:p-6">
      <div className="mx-auto min-w-0 max-w-3xl">
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          ← {backLabel}
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold text-zinc-900">Acerto · {trip.code}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {trip.origin || '—'} → {trip.destination || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadSettlementPdf(s, isOwner)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 sm:w-auto"
          >
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </button>
        </div>

        <Card className="mt-6 border-zinc-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Dados da viagem</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Cliente</dt>
              <dd className="font-medium text-zinc-900">{trip.clientName || '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Motorista</dt>
              <dd className="font-medium text-zinc-900">{trip.driver?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Veículo</dt>
              <dd className="font-medium text-zinc-900">
                {trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Frete</dt>
              <dd className="font-medium text-zinc-900">{formatBRL(trip.freightValue)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Período</dt>
              <dd className="font-medium text-zinc-900">
                {new Date(trip.startDate).toLocaleString('pt-BR')}
                {trip.endDate && ` — ${new Date(trip.endDate).toLocaleString('pt-BR')}`}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Km</dt>
              <dd className="font-medium text-zinc-900">
                inicial {trip.initialKm ?? '—'} · final {s.finalKm ?? trip.finalKm ?? '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="mt-4 border-emerald-200 bg-emerald-50/40 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Resumo do acerto</h2>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 rounded-lg bg-white/90 px-3 py-2">
              <dt className="text-zinc-600">Total despesas</dt>
              <dd className="font-medium">{formatBRL(s.totalExpenses)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-white/90 px-3 py-2">
              <dt className="text-zinc-600">Frete − despesas</dt>
              <dd className="font-medium">{formatBRL(s.grossProfit)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-white/90 px-3 py-2">
              <dt className="text-zinc-600">Comissão ({s.driverCommissionPct}%)</dt>
              <dd className="font-medium">{formatBRL(s.driverCommissionAmt)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-white/90 px-3 py-2">
              <dt className="text-zinc-600">Adiantamentos</dt>
              <dd className="font-medium">{formatBRL(s.totalAdvances)}</dd>
            </div>
            <div className="flex justify-between gap-4 rounded-lg bg-emerald-100 px-3 py-2 sm:col-span-2">
              <dt className="font-medium text-emerald-900">A pagar ao motorista</dt>
              <dd className="text-lg font-bold text-emerald-900">{formatBRL(s.amountToPayDriver)}</dd>
            </div>
            {isOwner && (
              <div className="flex justify-between gap-4 rounded-lg bg-white/90 px-3 py-2 sm:col-span-2">
                <dt className="text-zinc-600">Resultado do dono</dt>
                <dd className="font-semibold text-zinc-900">{formatBRL(s.ownerResult)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 border-t border-emerald-200/80 pt-4">
            {s.paid ? (
              <p className="text-sm font-medium text-emerald-800">
                Pagamento ao motorista registrado
                {s.paidAt && ` em ${new Date(s.paidAt).toLocaleString('pt-BR')}`}
              </p>
            ) : (
              <p className="text-sm text-amber-800">Pagamento ao motorista ainda não marcado como efetuado.</p>
            )}
            {isOwner && !s.paid && (
              <button
                type="button"
                onClick={onMarkPaid}
                disabled={markingPaid}
                className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
              >
                {markingPaid ? 'Salvando…' : 'Marcar pagamento ao motorista como efetuado'}
              </button>
            )}
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Despesas</h2>
          <div className={cn('mt-3', mobileTableScrollClass)}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {trip.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-zinc-500">
                      Nenhuma despesa.
                    </td>
                  </tr>
                ) : (
                  trip.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3">{e.category.name}</td>
                      <td className="py-2 pr-3 text-zinc-600">{e.description || '—'}</td>
                      <td className="py-2 text-right font-medium">{formatBRL(e.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Adiantamentos</h2>
          <div className={cn('mt-3', mobileTableScrollClass)}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Método</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {trip.advances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-zinc-500">
                      Nenhum adiantamento.
                    </td>
                  </tr>
                ) : (
                  trip.advances.map((a) => (
                    <tr key={a.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(a.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3">{ADVANCE_METHOD_LABEL[a.method] ?? a.method}</td>
                      <td className="py-2 pr-3 text-zinc-600">{a.description || '—'}</td>
                      <td className="py-2 text-right font-medium">{formatBRL(a.amount)}</td>
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
