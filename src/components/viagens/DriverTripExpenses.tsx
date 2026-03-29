'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getExpenseCategories,
  getExpensesByTrip,
  uploadExpenseReceipt,
  createExpense,
  type Expense,
  type ExpenseCategoryItem,
  type TripStatus,
} from '@/lib';
import { useActivityHint } from '@/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const RECEIPT_THRESHOLD = 100;

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

const inputClass =
  'mt-1 block w-full min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

type Props = {
  tripId: string;
  tripStatus: TripStatus;
};

export function DriverTripExpenses({ tripId, tripStatus }: Props) {
  const { bumpTripsActivity } = useActivityHint();
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [list, setList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [dateYmd, setDateYmd] = useState(ymdToday);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAdd = tripStatus === 'PENDING' || tripStatus === 'IN_PROGRESS';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExpenseCategories()
      .then((cats) => {
        const flat = [...cats.system, ...cats.custom];
        if (!cancelled) {
          setCategories(flat);
          if (flat[0]) setCategoryId((prev) => prev || flat[0].id);
        }
      })
      .catch(() => {});
    getExpensesByTrip(tripId)
      .then((ex) => {
        if (!cancelled) setList(ex);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setReceiptFile(f ?? null);
    setFormError(null);
    e.target.value = '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    setFormError(null);
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (!categoryId) {
      setFormError('Escolha uma categoria.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Informe um valor válido.');
      return;
    }
    if (amount > RECEIPT_THRESHOLD && !receiptFile) {
      setFormError(`Acima de ${formatBrl(RECEIPT_THRESHOLD)} é obrigatório anexar comprovante (foto ou PDF).`);
      return;
    }

    setSaving(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const up = await uploadExpenseReceipt(receiptFile);
        receiptUrl = up.url ?? undefined;
      }
      await createExpense({
        tripId,
        categoryId,
        date: new Date(`${dateYmd}T12:00:00`).toISOString(),
        amount,
        description: description.trim() || undefined,
        receiptUrl,
      });
      toast.success('Despesa registrada.');
      setAmountStr('');
      setDescription('');
      setReceiptFile(null);
      bumpTripsActivity();
      const ex = await getExpensesByTrip(tripId);
      setList(ex);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6 border-zinc-200 p-5">
        <p className="text-sm text-zinc-500">Carregando despesas…</p>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-zinc-200 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Despesas da viagem</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Lançamentos aparecem no acerto. Valores acima de {formatBrl(RECEIPT_THRESHOLD)} exigem comprovante.
      </p>

      {canAdd && categories.length === 0 && (
        <p className="mt-4 text-sm text-amber-800">
          Não foi possível carregar categorias de despesa. Tente atualizar a página ou fale com o dono da frota.
        </p>
      )}

      {canAdd && categories.length > 0 && (
        <form onSubmit={submit} className="mt-4 space-y-4 border-b border-zinc-100 pb-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</div>
          )}
          <div>
            <label htmlFor="exp-cat" className={labelClass}>
              Categoria
            </label>
            <select
              id="exp-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-date" className={labelClass}>
                Data
              </label>
              <input
                id="exp-date"
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="exp-amount" className={labelClass}>
                Valor (R$)
              </label>
              <input
                id="exp-amount"
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={inputClass}
                placeholder="0,00"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="exp-desc" className={labelClass}>
              Descrição (opcional)
            </label>
            <input
              id="exp-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <span className={labelClass}>Comprovante</span>
            <p className="mt-1 text-xs text-zinc-500">
              No celular, use a câmera ou escolha um arquivo (imagem ou PDF).
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPickFile}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onPickFile}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto justify-center border-blue-200 text-blue-800 hover:bg-blue-50"
                onClick={() => cameraInputRef.current?.click()}
              >
                Tirar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                Anexar arquivo
              </Button>
            </div>
            {receiptFile && (
              <p className="mt-2 text-sm text-zinc-700">
                Selecionado: <strong className="font-medium">{receiptFile.name}</strong>
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Salvando…' : 'Salvar despesa'}
          </button>
        </form>
      )}

      {!canAdd && (
        <p className="mt-4 text-sm text-zinc-500">
          {tripStatus === 'COMPLETED'
            ? 'Esta viagem está concluída; não é possível lançar novas despesas aqui.'
            : 'Esta viagem não aceita novos lançamentos.'}
        </p>
      )}

      <div className={canAdd ? 'mt-6' : 'mt-4'}>
        <h3 className="text-sm font-semibold text-zinc-800">Histórico</h3>
        <ul className="mt-3 divide-y divide-zinc-100">
          {list.length === 0 ? (
            <li className="py-3 text-sm text-zinc-500">Nenhuma despesa ainda.</li>
          ) : (
            list.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-900">
                    {item.category.name} · {formatBrl(item.amount)}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
                </div>
                {item.receiptUrl && (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
                  >
                    Ver comprovante
                  </a>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </Card>
  );
}
