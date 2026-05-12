/** Ícone fixo dentro da barra de busca à esquerda (responde ao tema manual). */
export const dashboardSearchIconLeftClass =
  'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground';

/** Ícone fixo à direita na busca. */
export const dashboardSearchIconRightClass =
  'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground';

/**
 * Inputs e selects HTML nativos (fora do componente UI Input)
 * para alinhamento com bordas, fundo e foco nos temas claro/escuro.
 */
export const dashboardNativeFieldClass =
  'min-w-0 max-w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-focus-ring disabled:pointer-events-none disabled:opacity-50';

/** Labels pequenos de grid de filtros (relatórios, etc.). */
export const dashboardFilterLabelClass =
  'mb-2 block text-[0.85rem] font-semibold text-foreground';

/** Pílula de filtro inativa (lista de veículos, etc.). */
export const dashboardFilterPillInactiveClass =
  'rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted dark:bg-muted/35 dark:hover:bg-muted/55';
