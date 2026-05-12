'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import {
  getExpenseCategories,
  getExpensesByTrip,
  uploadExpenseReceipt,
  createExpense,
  deleteExpense,
  formatBrlCurrencyInput,
  parseBrlInputString,
  type Expense,
  type ExpenseCategoryItem,
  type TripStatus,
} from '@/lib';
import { isFuelCategoryRef, isFuelExpense } from '@/lib/reports';
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

/** Modal “Nova despesa”: campos nativos alinhados ao tema claro/escuro. */
const modalSelectClass = cn(dashboardNativeFieldClass, 'h-11 text-sm');

type Props = {
  tripId: string;
  tripStatus: TripStatus;
  embed?: boolean;
};

export function DriverTripExpenses({ tripId, tripStatus, embed = false }: Props) {
  const { bumpTripsActivity } = useActivityHint();
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [list, setList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [dateYmd, setDateYmd] = useState(ymdToday);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [litersStr, setLitersStr] = useState('');
  const [gasStation, setGasStation] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAdd = tripStatus === 'PENDING' || tripStatus === 'IN_PROGRESS';
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isFuel = isFuelCategoryRef(selectedCategory);
  const totalExpenses = list.reduce((s, e) => s + e.amount, 0);

  const refreshList = async () => {
    const ex = await getExpensesByTrip(tripId);
    setList(ex);
  };

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

  const openExpenseModal = () => {
    setFormError(null);
    setDateYmd(ymdToday());
    setCategoryId(categories[0]?.id ?? '');
    setAmountStr('');
    setDescription('');
    setLocation('');
    setLitersStr('');
    setGasStation('');
    setReceiptFile(null);
    setExpenseOpen(true);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setReceiptFile(f ?? null);
    setFormError(null);
    e.target.value = '';
  };

  const handleSaveExpense = async () => {
    if (!canAdd) return;
    setFormError(null);
    if (!dateYmd || !categoryId || !amountStr.trim()) {
      toast.error('Preencha data, categoria e valor.');
      return;
    }
    const amount = parseBrlInputString(amountStr);
    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (amount > RECEIPT_THRESHOLD && !receiptFile) {
      const msg = `Acima de ${formatBrl(RECEIPT_THRESHOLD)} é obrigatório anexar comprovante.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (isFuel) {
      const liters = parseBrlInputString(litersStr);
      if (liters == null || liters <= 0) {
        const msg = 'Informe a litragem abastecida (litros) com valor maior que zero.';
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const up = await uploadExpenseReceipt(receiptFile);
        receiptUrl = up.url ?? undefined;
      }
      const litersParsed = isFuel ? parseBrlInputString(litersStr) : null;
      const pricePerLiter =
        isFuel && litersParsed != null && litersParsed > 0
          ? Math.round((amount / litersParsed) * 10000) / 10000
          : undefined;

      await createExpense({
        tripId,
        categoryId,
        date: new Date(`${dateYmd}T12:00:00`).toISOString(),
        amount,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        receiptUrl,
        ...(isFuel && litersParsed != null && litersParsed > 0
          ? {
              liters: litersParsed,
              pricePerLiter,
              gasStation: gasStation.trim() || undefined,
            }
          : {}),
      });
      toast.success('Despesa adicionada!');
      setExpenseOpen(false);
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

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Remover esta despesa?')) return;
    try {
      await deleteExpense(expenseId);
      toast.success('Despesa removida.');
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
            Despesas
          </h3>
        </CardHeader>
        <CardContent>
          <LoadingMessage message="Carregando despesas…" className="text-muted-foreground" />
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
                Despesas
              </h3>
              <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                Total:{' '}
                <span className="text-red-600 dark:text-red-400" style={{ fontWeight: 700 }}>
                  {formatBrl(totalExpenses)}
                </span>
              </p>
            </div>
            {canAdd && categories.length > 0 && (
              <button
                type="button"
                onClick={openExpenseModal}
                className="flex items-center gap-1.5 rounded-lg bg-primary/12 px-3 py-1.5 text-primary transition-colors hover:bg-primary/20 dark:bg-primary/18 dark:hover:bg-primary/26"
                style={{ fontSize: '0.83rem' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova despesa
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          {canAdd && categories.length === 0 && (
            <p className="text-sm text-amber-900 dark:text-amber-100/95">
              Não foi possível carregar categorias. Atualize a página ou fale com o gestor.
            </p>
          )}
          {list.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground/80" style={{ fontSize: '0.9rem' }}>
              Nenhuma despesa registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 dark:bg-muted/20 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        {exp.category.name}
                      </span>
                      <span className="text-red-600 dark:text-red-400" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                        {formatBrl(exp.amount)}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                      {new Date(exp.date).toLocaleDateString('pt-BR')}
                      {exp.description ? ` · ${exp.description}` : ''}
                      {exp.location ? ` · ${exp.location}` : ''}
                    </p>
                    {isFuelExpense(exp) && (
                      <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                        {exp.liters != null
                          ? `${Number(exp.liters).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L abastecidos`
                          : 'Litragem não informada'}
                        {exp.gasStation ? ` · ${exp.gasStation}` : ''}
                        {exp.pricePerLiter != null && exp.liters != null
                          ? ` · ${formatBrl(exp.pricePerLiter)}/L`
                          : ''}
                      </p>
                    )}
                    {exp.receiptUrl && (
                      <a
                        href={exp.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Ver comprovante
                      </a>
                    )}
                  </div>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className={`ml-3 shrink-0 ${dashboardDeleteIconTriggerClass}`}
                      aria-label="Remover despesa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!canAdd && (
            <p className="mt-3 text-sm text-muted-foreground">
              {tripStatus === 'COMPLETED'
                ? 'Viagem concluída — não é possível alterar despesas aqui.'
                : 'Esta viagem não aceita novos lançamentos.'}
            </p>
          )}
        </CardContent>
      </Card>

      {expenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 id="expense-modal-title" className="text-foreground" style={{ fontWeight: 600 }}>
                Nova despesa
              </h3>
              <button
                type="button"
                onClick={() => setExpenseOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {formError && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive dark:border-destructive/35 dark:bg-destructive/15">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[400px]:items-start">
                <LocalizedDateField
                  label="Data *"
                  value={dateYmd}
                  onChange={setDateYmd}
                  className="min-w-0 !gap-1.5"
                  labelClassName="text-sm font-medium leading-none text-foreground"
                  buttonClassName="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="modal-exp-cat" className="text-sm font-medium leading-none text-foreground">
                    Categoria *
                  </Label>
                  <select
                    id="modal-exp-cat"
                    value={categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const next = categories.find((c) => c.id === id);
                      setCategoryId(id);
                      if (!isFuelCategoryRef(next)) {
                        setLitersStr('');
                        setGasStation('');
                      }
                    }}
                    className={modalSelectClass}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-exp-val">Valor (R$) *</Label>
                <Input
                  id="modal-exp-val"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="h-11"
                  value={amountStr}
                  onChange={(e) => setAmountStr(formatBrlCurrencyInput(e.target.value))}
                />
              </div>
              {isFuel && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-exp-liters">Litros abastecidos *</Label>
                    <Input
                      id="modal-exp-liters"
                      type="text"
                      inputMode="decimal"
                      placeholder="ex.: 45,5"
                      className="h-11"
                      value={litersStr}
                      onChange={(e) => setLitersStr(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Quantidade de diesel (ou combustível) colocada neste abastecimento.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-exp-posto">Posto (opcional)</Label>
                    <Input
                      id="modal-exp-posto"
                      placeholder="Nome do posto"
                      className="h-11"
                      value={gasStation}
                      onChange={(e) => setGasStation(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="modal-exp-desc">Descrição</Label>
                <Input
                  id="modal-exp-desc"
                  placeholder="Descrição da despesa"
                  className="h-11"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-exp-loc">Local</Label>
                <Input
                  id="modal-exp-loc"
                  placeholder="Local onde ocorreu"
                  className="h-11"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comprovante</Label>
                <p className="text-xs text-muted-foreground">
                  Imagem ou PDF. Obrigatório acima de {formatBrl(RECEIPT_THRESHOLD)}.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center sm:w-auto"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Escolher arquivo
                </Button>
                {receiptFile && (
                  <p className="text-sm text-foreground">
                    Selecionado: <strong className="font-medium">{receiptFile.name}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                onClick={handleSaveExpense}
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
