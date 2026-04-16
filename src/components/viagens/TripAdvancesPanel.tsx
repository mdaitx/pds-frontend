'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocalizedDateField } from '@/components/ui/localized-date-field';

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

const selectClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500';

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
      <Card className={`border-zinc-200 shadow-sm ${embed ? '' : 'mt-6'}`}>
        <CardHeader className="pb-2 pt-6">
          <h3 className="text-zinc-700" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
            Adiantamentos
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">Carregando adiantamentos…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`border-zinc-200 shadow-sm ${embed ? '' : 'mt-6'}`}>
        <CardHeader className="pb-2 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-zinc-700" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                Adiantamentos
              </h3>
              <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.8rem' }}>
                Total:{' '}
                <span className="text-orange-600" style={{ fontWeight: 700 }}>
                  {formatBrl(totalAdvances)}
                </span>
              </p>
            </div>
            {canAdd && (
              <button
                type="button"
                onClick={openAdvanceModal}
                className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-orange-700 transition-colors hover:bg-orange-100"
                style={{ fontSize: '0.83rem' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo adiantamento
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          {list.length === 0 ? (
            <p className="py-6 text-center text-zinc-400" style={{ fontSize: '0.9rem' }}>
              Nenhum adiantamento registrado.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((adv) => {
                const ml = METHOD_OPTIONS.find((x) => x.value === adv.method)?.label ?? adv.method;
                return (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-orange-600" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                          {formatBrl(adv.amount)}
                        </span>
                        <span className="text-xs text-zinc-500">{ml}</span>
                      </div>
                      <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                        {new Date(adv.date).toLocaleDateString('pt-BR')}
                        {adv.description ? ` · ${adv.description}` : ''}
                      </p>
                      {adv.receiptUrl && (
                        <a
                          href={adv.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-orange-600 hover:underline"
                        >
                          Ver comprovante
                        </a>
                      )}
                    </div>
                    {canAdd && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAdvance(adv.id)}
                        className="ml-3 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
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
            <p className="mt-3 text-sm text-zinc-500">
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advance-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 id="advance-modal-title" className="text-zinc-900" style={{ fontWeight: 600 }}>
                Novo adiantamento
              </h3>
              <button
                type="button"
                onClick={() => setAdvanceOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-adv-val">Valor (R$) *</Label>
                  <Input
                    id="modal-adv-val"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-11 bg-white"
                    value={amountStr}
                    onChange={(e) => setAmountStr(formatBrlCurrencyInput(e.target.value))}
                  />
                </div>
                <LocalizedDateField
                  label="Data *"
                  value={dateYmd}
                  onChange={setDateYmd}
                  labelClassName="text-sm font-medium leading-none text-zinc-700"
                  buttonClassName="h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50"
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
                  className="h-11 bg-white"
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
                className="bg-orange-600 text-white hover:bg-orange-700"
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
