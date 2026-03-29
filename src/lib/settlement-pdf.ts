import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SettlementWithTrip } from '@/services/api';

const ADVANCE_METHOD_LABEL: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
};

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dt(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR');
}

/** Gera e baixa o PDF do acerto no cliente. `includeOwnerResult`: falso para visão do motorista. */
export function downloadSettlementPdf(data: SettlementWithTrip, includeOwnerResult = true): void {
  const trip = data.trip;
  const doc = new jsPDF();
  let y = 14;

  doc.setFontSize(16);
  doc.text('Acerto de viagem', 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.text(`Viagem: ${trip.code}`, 14, y);
  y += 6;
  doc.text(`Cliente: ${trip.clientName || '—'}`, 14, y);
  y += 6;
  doc.text(`Origem / Destino: ${trip.origin || '—'} → ${trip.destination || '—'}`, 14, y);
  y += 6;
  doc.text(`Veículo: ${trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}`, 14, y);
  y += 6;
  doc.text(`Motorista: ${trip.driver?.name ?? '—'}`, 14, y);
  y += 6;
  doc.text(`Início: ${dt(trip.startDate)}  ·  Fim: ${dt(trip.endDate)}`, 14, y);
  y += 6;
  doc.text(
    `Frete: ${brl(trip.freightValue)}  ·  Km inicial: ${trip.initialKm ?? '—'}  ·  Km final: ${data.finalKm ?? trip.finalKm ?? '—'}`,
    14,
    y,
  );
  y += 10;

  doc.setFontSize(11);
  doc.text('Resumo financeiro', 14, y);
  y += 4;

  const summaryBody: string[][] = [
    ['Total despesas', brl(data.totalExpenses)],
    ['Frete − despesas', brl(data.grossProfit)],
    [`Comissão motorista (${data.driverCommissionPct}%)`, brl(data.driverCommissionAmt)],
    ['Total adiantamentos', brl(data.totalAdvances)],
    ['Valor a pagar ao motorista', brl(data.amountToPayDriver)],
  ];
  if (includeOwnerResult) {
    summaryBody.push(['Resultado do dono', brl(data.ownerResult)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Valor']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  let nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.text('Despesas lançadas', 14, nextY);
  nextY += 4;

  const expenseRows = trip.expenses.map((e) => [
    dt(e.date),
    e.category.name,
    (e.description || '—').slice(0, 40),
    brl(e.amount),
  ]);

  autoTable(doc, {
    startY: nextY,
    head: [['Data', 'Categoria', 'Descrição', 'Valor']],
    body: expenseRows.length ? expenseRows : [['—', '—', 'Nenhuma despesa', '—']],
    theme: 'striped',
    headStyles: { fillColor: [63, 63, 70] },
    styles: { fontSize: 8 },
  });

  nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.text('Adiantamentos', 14, nextY);
  nextY += 4;

  const advRows = trip.advances.map((a) => [
    dt(a.date),
    ADVANCE_METHOD_LABEL[a.method] ?? a.method,
    (a.description || '—').slice(0, 35),
    brl(a.amount),
  ]);

  autoTable(doc, {
    startY: nextY,
    head: [['Data', 'Método', 'Descrição', 'Valor']],
    body: advRows.length ? advRows : [['—', '—', 'Nenhum adiantamento', '—']],
    theme: 'striped',
    headStyles: { fillColor: [63, 63, 70] },
    styles: { fontSize: 8 },
  });

  nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.text(
    `Pagamento ao motorista: ${data.paid ? `Registrado em ${dt(data.paidAt)}` : 'Pendente de registro'}`,
    14,
    nextY,
  );
  nextY += 6;
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 14, nextY);

  const safeCode = trip.code.replace(/[^\w-]+/g, '_');
  doc.save(`acerto-${safeCode}.pdf`);
}
