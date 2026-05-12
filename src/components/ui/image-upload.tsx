'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ImagePlus, UserCircle } from 'lucide-react';

type ImageUploadProps = {
  label: string;
  value?: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  disabled?: boolean;
};

/**
 * Upload de imagem com pré-visualização (protótipo UserForm).
 * O pai pode enviar `value` como URL remota após upload no servidor.
 */
export function ImageUpload({ label, value, onChange, disabled }: ImageUploadProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/80 ring-1 ring-border/60 dark:bg-muted/50">
          {value ? (
            <Image src={value} alt="" fill className="object-cover" unoptimized />
          ) : (
            <UserCircle
              className="h-[4.25rem] w-[4.25rem] text-muted-foreground/85 dark:text-muted-foreground"
              aria-hidden
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) {
                onChange(null, null);
                return;
              }
              const preview = URL.createObjectURL(f);
              onChange(f, preview);
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => ref.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-muted/80"
          >
            <ImagePlus className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {value ? 'Alterar imagem' : 'Escolher imagem'}
          </button>
          {value ? (
            <button
              type="button"
              disabled={disabled}
              className="text-left text-xs text-destructive hover:underline disabled:opacity-50"
              onClick={() => {
                onChange(null, null);
                if (ref.current) ref.current.value = '';
              }}
            >
              Remover foto
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
