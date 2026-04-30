'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';

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
      <p className="text-sm font-medium text-zinc-700">{label}</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
          {value ? (
            <Image src={value} alt="" fill className="object-cover" unoptimized />
          ) : (
            <UserCircle className="h-16 w-16 text-zinc-300" aria-hidden />
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {value ? 'Alterar imagem' : 'Escolher imagem'}
          </button>
          {value ? (
            <button
              type="button"
              disabled={disabled}
              className="text-left text-xs text-red-600 hover:underline"
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
