/* Hallmark · macrostructure: Long Document · genre: editorial · theme: Newsprint (adapted)
 * nav: edge-aligned minimal · footer: statement · enrichment: none (dashboard figure, no chrome)
 * audience: donos de frota + motoristas · use: signup · tone: editorial/utilitário
 */

/** Preview ilustrativo do dashboard — sem números inventados nem chrome de browser. */
export function DashboardPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-md min-w-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_48px_hsl(var(--primary)/0.12)] motion-safe:animate-[marketing-float_6s_ease-in-out_infinite] motion-reduce:animate-none dark:shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Painel · exemplo
          </p>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <span className="text-xs text-muted-foreground">Receita do mês</span>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground">
              R$ ———
            </p>
            <span className="mt-1 block text-xs text-muted-foreground">
              Atualizado conforme viagens concluídas
            </span>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-4">
              <span className="text-xs text-muted-foreground">Viagens ativas</span>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">—</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-4">
              <span className="text-xs text-muted-foreground">Comissões pendentes</span>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">—</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2" aria-hidden>
            {['Viagem · status', 'Viagem · status', 'Viagem · status'].map((label, i) => (
              <li
                key={label}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
                <span className="shrink-0 font-mono text-xs text-foreground/70">
                  {i === 0 ? '···' : '···'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="sr-only">
        Ilustração do painel financeiro do Truck Finanças — valores fictícios para demonstração
        de layout.
      </figcaption>
    </figure>
  );
}
