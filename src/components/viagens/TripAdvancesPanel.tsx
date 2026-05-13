'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Info, Plus, Trash2, X } from 'lucide-react';
import {
  getAdvancesByTrip,
  createAdvance,
  deleteAdvance,
  formatBrlCurrencyInput,
  parseBrlInputString,
  type Advance,
  type AdvanceMethod,
  type TripStatus,
} from '@/lib';
import { useActivityHint } from '@/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardDeleteIconTriggerClass } from '@/lib/dashboard-action-buttons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingMessage } from '@/components/ui/loading';
import { LocalizedDateField } from '@/components/ui/localized-date-field';
import { cn } from '@/lib/cn';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';

const ADVANCE_POLICY_NOTE =
  'Vales abatem do salário na folha (proporcional ao período); não reduzem a comissão desta viagem no acerto.';

const METHOD_OPTIONS: { value: AdvanceMethod; label: string }[] = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFER', label: 'Transferência' },
];

function ymdToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const selectClass = cn(dashboardNativeFieldClass, 'mt-1 flex h-auto min-h-11 py-2 text-[0.9rem]');

type Props = {
  tripId: string;
  tripStatus: TripStatus;
  embed?: boolean;
};

export function TripAdvancesPanel({ tripId, tripStatus, embed = false }: Props) {
  const { bumpTripsActivity } = useActivityHint();
  const [list, setList] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [dateYmd, setDateYmd] = useState(ymdToday);
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<AdvanceMethod>('PIX');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canAdd = tripStatus === 'PENDING' || tripStatus === 'IN_PROGRESS';
  const totalAdvances = list.reduce((s, a) => s + a.amount, 0);

  const refreshList = async () => {
    const rows = await getAdvancesByTrip(tripId);
    setList(rows);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdvancesByTrip(tripId)
      .then((rows) => {
        if (!cancelled) setList(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const openAdvanceModal = () => {
    setFormError(null);
    setAmountStr('');
    setDateYmd(ymdToday());
    setMethod('PIX');
    setDescription('');
    setAdvanceOpen(true);
  };

  const handleSaveAdvance = async () => {
    if (!canAdd) return;
    setFormError(null);
    if (!amountStr.trim() || !dateYmd) {
      toast.error('Preencha valor e data.');
      return;
    }
    const amount = parseBrlInputString(amountStr);
    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    setSaving(true);
    try {
      await createAdvance({
        tripId,
        amount,
        date: new Date(`${dateYmd}T12:00:00`).toISOString(),
        method,
        description: description.trim() || undefined,
      });
      toast.success('Adiantamento registrado!');
      setAdvanceOpen(false);
      bumpTripsActivity();
      await refreshList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    if (!confirm('Remover este adiantamento?')) return;
    try {
      await deleteAdvance(advanceId);
      toast.success('Adiantamento removido.');
      bumpTripsActivity();
      await refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover.');
    }
  };

  if (loading) {
    return (
      <Card className={`border-border shadow-sm ${embed ? '' : 'mt-6'}`}>
        <CardHeader className="pb-2 pt-6">
          <h3 className="text-foreground" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
            Adiantamentos
          </h3>
        </CardHeader>
        <CardContent>
          <LoadingMessage message="Carregando adiantamentos…" className="text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`border-border shadow-sm ${embed ? '' : 'mt-6'}`}>
        <CardHeader className="pb-2 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-foreground" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                Adiantamentos
              </h3>
              <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                Total:{' '}
                <span className="text-orange-600 dark:text-orange-400" style={{ fontWeight: 700 }}>
                  {formatBrl(totalAdvances)}
                </span>
              </p>
            </div>
            {canAdd && (
              <button
                type="button"
                onClick={openAdvanceModal}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 px-3 py-1.5 text-orange-900 transition-colors hover:bg-orange-500/25 dark:bg-orange-500/20 dark:text-orange-100 dark:hover:bg-orange-500/30"
                style={{ fontSize: '0.83rem' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo adiantamento
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div
            className="mb-4 flex gap-2.5 rounded-lg border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-sm text-orange-950 dark:border-orange-400/30 dark:bg-orange-950/35 dark:text-orange-50"
            role="note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <p className="min-w-0 leading-snug">{ADVANCE_POLICY_NOTE}</p>
          </div>
          {list.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground/80" style={{ fontSize: '0.9rem' }}>
              Nenhum adiantamento registrado.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((adv) => {
                const ml = METHOD_OPTIONS.find((x) => x.value === adv.method)?.label ?? adv.method;
                return (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 dark:bg-muted/20 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-orange-600 dark:text-orange-400" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                          {formatBrl(adv.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">{ml}</span>
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                        {new Date(adv.date).toLocaleDateString('pt-BR')}
                        {adv.description ? ` · ${adv.description}` : ''}
                      </p>
                      {adv.receiptUrl && (
                        <a
                          href={adv.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-orange-600 underline hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                        >
                          Ver comprovante
                        </a>
                      )}
                    </div>
                    {canAdd && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAdvance(adv.id)}
                        className={`ml-3 shrink-0 ${dashboardDeleteIconTriggerClass}`}
                        aria-label="Remover adiantamento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!canAdd && (
            <p className="mt-3 text-sm text-muted-foreground">
              {tripStatus === 'COMPLETED'
                ? 'Viagem concluída — não é possível alterar adiantamentos aqui.'
                : 'Esta viagem não aceita novos lançamentos.'}
            </p>
          )}
        </CardContent>
      </Card>

      {advanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advance-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 id="advance-modal-title" className="text-foreground" style={{ fontWeight: 600 }}>
                Novo adiantamento
              </h3>
              <button
                type="button"
                onClick={() => setAdvanceOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 rounded-md border border-orange-500/20 bg-orange-500/8 px-3 py-2 text-xs leading-relaxed text-orange-950 dark:border-orange-400/25 dark:bg-orange-950/40 dark:text-orange-100">
              {ADVANCE_POLICY_NOTE}
            </p>

            <div className="space-y-3">
              {formError && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive dark:border-destructive/35 dark:bg-destructive/15">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-adv-val">Valor (R$) *</Label>
                  <Input
                    id="modal-adv-val"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-11"
                    value={amountStr}
                    onChange={(e) => setAmountStr(formatBrlCurrencyInput(e.target.value))}
                  />
                </div>
                <LocalizedDateField
                  label="Data *"
                  value={dateYmd}
                  onChange={setDateYmd}
                  labelClassName="text-sm font-medium leading-none text-foreground"
                  buttonClassName="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-adv-method">Método *</Label>
                <select
                  id="modal-adv-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as AdvanceMethod)}
                  className={selectClass}
                  style={{ fontSize: '0.9rem' }}
                >
                  {METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-adv-desc">Descrição</Label>
                <Input
                  id="modal-adv-desc"
                  placeholder="Motivo do adiantamento"
                  className="h-11"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAdvanceOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500"
                onClick={handleSaveAdvance}
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Registrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
