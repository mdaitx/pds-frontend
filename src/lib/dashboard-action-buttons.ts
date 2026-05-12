/**
 * Estilos compartilhados para ações Editar, Excluir e Salvar no dashboard.
 * Usar com <Button> de @/components/ui/button (variant outline nos secundários).
 */

/** Salvar em rodapé de formulário (botão primário — variant default). */
export const dashboardFormSaveButtonClass =
  'flex w-full items-center justify-center gap-2 sm:w-auto';

/** Cancelar em rodapé (variant outline). */
export const dashboardFormCancelButtonClass = 'w-full sm:w-auto';

/** Link “Cancelar” com a mesma aparência do Button outline (quando for Next.js Link). */
export const dashboardFormCancelLinkClass =
  'inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 sm:w-auto';

/**
 * Contorno/texto/icônes destructive em botões `variant="outline"` (Excluir).
 * Com `important` porque o `outline` define `border-border` e `text-foreground` — o cn() só junta strings.
 */
const dashboardDeleteOutlineContour =
  '!border-destructive bg-surface !text-destructive hover:!bg-destructive/15 dark:!border-destructive dark:bg-destructive/15 dark:!text-destructive dark:hover:!bg-destructive/28 [&_svg]:shrink-0 [&_svg]:!text-destructive';

/** Excluir em rodapé de formulário (variant outline + ícone lixeira). */
export const dashboardFormDeleteButtonClass =
  `flex w-full items-center justify-center gap-2 sm:w-auto ${dashboardDeleteOutlineContour}`;

/** Editar na barra de ações do detalhe (não é botão primário). */
export const dashboardToolbarEditButtonClass =
  'flex items-center justify-center gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 sm:w-auto';

/** Excluir na barra de ações do detalhe (abre confirmação). */
export const dashboardToolbarDeleteButtonClass =
  `flex items-center justify-center gap-2 sm:w-auto ${dashboardDeleteOutlineContour}`;

/** Editar em cards compactos (listagens em grid). */
export const dashboardCardEditButtonClass =
  'w-full justify-center gap-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 dark:border-primary/40 dark:bg-primary/16 dark:text-primary dark:hover:bg-primary/26';

/** Excluir em cards compactos (listagens em grid). */
export const dashboardCardDeleteButtonClass =
  `w-full justify-center gap-2 px-3 py-1.5 text-xs font-medium ${dashboardDeleteOutlineContour}`;

/**
 * Ícone só (ex.: lixeira em linha compacta): contorno destructive visível em ambos os temas.
 */
export const dashboardDeleteIconTriggerClass =
  'rounded-lg border !border-destructive bg-transparent p-1.5 !text-destructive transition-colors hover:!bg-destructive/15 dark:!border-destructive dark:bg-destructive/12 dark:hover:!bg-destructive/22 [&_svg]:shrink-0 [&_svg]:!text-destructive';

/**
 * Próprio &lt;Link&gt; com aparência de botão — evita HTML inválido (&lt;Link&gt;&lt;button&gt;).
 * Mesmo foco/anel que {@link Button}.
 */
const focusRing = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
const noUnderline = 'no-underline';

/** Primário (equivalente a Button default). */
export const dashboardLinkPrimaryClass = `inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50 ${focusRing} ${noUnderline}`;

/** Primário compacto (toolbar / cards). */
export const dashboardLinkPrimarySmClass = `inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-blue-600 px-3 py-1.5 text-[0.82rem] font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto ${focusRing} ${noUnderline}`;

/** “Ver acerto” / CTA na barra do detalhe (texto 0.875rem). */
export const dashboardLinkPrimaryToolbarClass = `inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-[0.875rem] font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto ${focusRing} ${noUnderline}`;

/** Secundário estilo ghost azul (ex.: Ver no painel motorista). */
export const dashboardLinkGhostBlueClass = `inline-flex w-full items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-[0.8rem] font-medium text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto ${focusRing} ${noUnderline}`;

/** Outline “Ver todas” (link discreto). */
export const dashboardLinkMutedNavClass = `inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] text-blue-700 transition-colors hover:bg-blue-50 sm:w-auto ${focusRing} ${noUnderline}`;

/** Igual a Button outline + {@link dashboardCardEditButtonClass} em listagens. */
export const dashboardLinkCardEditClass = `inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-primary/40 dark:bg-primary/16 dark:text-primary dark:hover:bg-primary/26 sm:w-auto ${focusRing} ${noUnderline}`;

/** Igual a Button outline + {@link dashboardToolbarEditButtonClass}. */
export const dashboardLinkToolbarEditClass = `inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto ${focusRing} ${noUnderline}`;
