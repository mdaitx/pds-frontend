/**
 * Classes reutilizadas nas telas do dashboard para telas estreitas (celular).
 * Mantém scroll horizontal com gesto e botões em largura total quando fizer sentido.
 */
export const mobileTableScrollClass =
  'touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]';

/** Botões de rodapé em formulários: largura total no mobile, inline no sm+. */
export const mobileFormActionsRowClass =
  'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end';

/** Linha de filtros/abas com muitos itens: rolagem horizontal no mobile. */
export const mobileFilterPillRowClass =
  'touch-pan-x overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] sm:overflow-visible';
