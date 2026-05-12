'use client';

/**
 * Seletor de data com calendário em português (react-day-picker + locale pt-BR).
 * Substitui <input type="date">, cujo popup costuma seguir o idioma do SO/navegador.
 *
 * Valor controlado: `YYYY-MM-DD` (igual ao input nativo). Reutilize em qualquer tela:
 * `import { LocalizedDateField } from '@/components/ui';`
 *
 * Props opcionais: `className` (wrapper), `buttonClassName`, `labelClassName` — úteis em grids e modais.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale/pt-BR';
import 'react-day-picker/style.css';

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const YEAR_START = 2000;

export function LocalizedDateField({
  label,
  value,
  onChange,
  className,
  buttonClassName,
  labelClassName,
}: {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  /** classes no container (ex.: `w-full`) */
  className?: string;
  /** classes no botão (ex.: altura igual a Input, `w-full`) */
  buttonClassName?: string;
  /** classes no texto do rótulo (padrão: texto pequeno zinc-600) */
  labelClassName?: string;
}) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const yearEnd = new Date().getFullYear() + 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = value ? ymdToDate(value) : undefined;
  const buttonLabel = selected
    ? selected.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Selecionar data';

  const lbl = labelClassName ?? 'pds-caption';
  const btn =
    buttonClassName ??
    'min-w-[200px] rounded-xl border border-border bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm hover:bg-muted/60 dark:bg-muted/50 dark:hover:bg-muted/70';

  return (
    <div className={`relative flex flex-col gap-1 ${className ?? ''}`.trim()} ref={ref}>
      <label htmlFor={`${baseId}-btn`} className={lbl}>
        {label}
      </label>
      <button
        type="button"
        id={`${baseId}-btn`}
        onClick={() => setOpen((o) => !o)}
        className={btn}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {buttonLabel}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 rounded-xl border border-border bg-card p-2 shadow-lg dark:shadow-2xl dark:shadow-black/50"
          role="dialog"
          aria-label={`Calendário: ${label}`}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) onChange(dateToYmd(d));
              setOpen(false);
            }}
            locale={ptBR}
            defaultMonth={selected}
            captionLayout="dropdown"
            fromYear={YEAR_START}
            toYear={yearEnd}
            className="text-foreground"
          />
        </div>
      )}
    </div>
  );
}
