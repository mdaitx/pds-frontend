import autoTable from 'jspdf-autotable';
import type { SettlementWithTrip } from '@/lib';
import { computeTripFuelMetrics } from '@/lib/reports';
import { createPdfDocument } from './pdf-font';
import {
  PDF_E as E,
  PDF_FONT_FAMILY,
  PDF_MARGIN,
  PDF_Z as Z,
  pdfDrawFooterGenerated,
  pdfTableBodyStyles,
  pdfTableHeadStyles,
} from './pdf-theme';

const ADVANCE_METHOD_LABEL: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
};

function brl(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dt(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR');
}

function dateOnly(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR');
}

/**
 * PDF alinhado ao layout de {@link SettlementAcertoView}: mesmas seções, rótulos e ordem.
 * Fonte: Roboto (UTF-8) — acentos e símbolos pt-BR renderizam corretamente.
 */
export function downloadSettlementPdf(
  data: SettlementWithTrip,
  includeOwnerResult = true
): void {
  const trip = data.trip;
  const finalKmShown = data.finalKm ?? trip.finalKm;
  const doc = createPdfDocument();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  const contentW = pageW - margin * 2;
  let y = 16;

  const setZinc = (shade: keyof typeof Z) => doc.setTextColor(...Z[shade]);
  const resetTextColor = () => setZinc(900);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  resetTextColor();
  doc.text(`Acerto · ${trip.code}`, margin, y);

  y += 8;
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  setZinc(600);
  const routeLine = `${trip.origin || '—'} → ${trip.destination || '—'}`;
  const splitRoute = doc.splitTextToSize(routeLine, contentW);
  doc.text(splitRoute, margin, y);
  y += splitRoute.length * 5 + 4;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9);
  setZinc(500);
  doc.text('DADOS DA VIAGEM', margin, y);
  y += 6;

  const kmLine = `inicial ${trip.initialKm != null ? trip.initialKm.toLocaleString('pt-BR') : '—'} · final ${finalKmShown != null ? finalKmShown.toLocaleString('pt-BR') : '—'}`;
  const periodLine = `${dt(trip.startDate)}${trip.endDate ? ` — ${dt(trip.endDate)}` : ''}`;
  const fuel = computeTripFuelMetrics(trip, trip.expenses, data);
  const kmPerLiterLine =
    fuel.kmPerLiter != null
      ? `${fuel.kmPerLiter.toLocaleString('pt-BR', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        })} km/L`
      : '—';

  const tripRows: string[][] = [
    ['Cliente', trip.clientName || '—'],
    ['Motorista', trip.driver?.name ?? '—'],
    ['Veículo', trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'],
    ['Frete', brl(trip.freightValue)],
    ['Período', periodLine],
    ['Km', kmLine],
    ['Média km/L', kmPerLiterLine],
  ];

  autoTable(doc, {
    startY: y,
    body: tripRows,
    theme: 'plain',
    styles: {
      font: PDF_FONT_FAMILY,
      fontSize: 10,
      cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
      lineColor: Z[200],
      lineWidth: 0,
    },
    columnStyles: {
      0: { textColor: Z[500], fontStyle: 'normal', cellWidth: 38 },
      1: { textColor: Z[900], fontStyle: 'bold', cellWidth: contentW - 38 },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFillColor(...E[50]);
  doc.roundedRect(margin, y - 5, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...E[900]);
  doc.text('Resumo do acerto', margin + 2, y + 1);
  y += 10;

  const summaryBody: string[][] = [
    ['Total despesas', brl(data.totalExpenses)],
    ['Frete − despesas', brl(data.grossProfit)],
    [`Comissão (${data.driverCommissionPct}%)`, brl(data.driverCommissionAmt)],
    ['Adiantamentos (abatidos do salário)', brl(data.totalAdvances)],
    ['A pagar ao motorista (comissão)', brl(data.amountToPayDriver)],
  ];
  if (includeOwnerResult) {
    summaryBody.push(['Resultado do dono', brl(data.ownerResult)]);
  }

  autoTable(doc, {
    startY: y,
    body: summaryBody,
    theme: 'plain',
    styles: {
      font: PDF_FONT_FAMILY,
      fontSize: 10,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineColor: E[200],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { textColor: Z[600], fontStyle: 'normal', cellWidth: contentW * 0.58 },
      1: { textColor: Z[900], fontStyle: 'bold', halign: 'right', cellWidth: contentW * 0.42 },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    didParseCell: (hookData) => {
      const row = hookData.row.index;
      const col = hookData.column.index;
      if (row === 4) {
        hookData.cell.styles.fillColor = E[100];
        hookData.cell.styles.textColor = E[950];
        hookData.cell.styles.fontStyle = 'bold';
        if (col === 1) {
          hookData.cell.styles.fontSize = 11;
        }
      } else if (row === 5 && includeOwnerResult) {
        hookData.cell.styles.fillColor = Z[50];
        hookData.cell.styles.textColor = Z[950];
        hookData.cell.styles.fontStyle = 'bold';
      } else {
        hookData.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  if (data.paid) {
    doc.setTextColor(...E[800]);
    const paidLine = `Pagamento ao motorista registrado${data.paidAt ? ` em ${dt(data.paidAt)}` : ''}`;
    doc.text(doc.splitTextToSize(paidLine, contentW), margin, y);
  } else {
    doc.setTextColor(146, 64, 14);
    doc.text(
      doc.splitTextToSize('Pagamento ao motorista ainda não marcado como efetuado.', contentW),
      margin,
      y
    );
  }
  y += data.paid ? 10 : 12;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  resetTextColor();
  doc.text('Despesas', margin, y);
  y += 4;

  const expenseRows = trip.expenses.map((e) => [
    dateOnly(e.date),
    e.category.name,
    (e.description || '—').slice(0, 55),
    brl(e.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Categoria', 'Descrição', 'Valor']],
    body: expenseRows.length ? expenseRows : [['—', '—', 'Nenhuma despesa.', '—']],
    theme: 'plain',
    headStyles: pdfTableHeadStyles,
    styles: {
      ...pdfTableBodyStyles,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 38 },
      2: { textColor: Z[600], cellWidth: 'auto' },
      3: { halign: 'right', fontStyle: 'bold', textColor: Z[900], cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    showHead: 'everyPage',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  resetTextColor();
  doc.text('Adiantamentos', margin, y);
  y += 4;

  const advRows = trip.advances.map((a) => [
    dateOnly(a.date),
    ADVANCE_METHOD_LABEL[a.method] ?? a.method,
    (a.description || '—').slice(0, 50),
    brl(a.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Método', 'Descrição', 'Valor']],
    body: advRows.length ? advRows : [['—', '—', 'Nenhum adiantamento.', '—']],
    theme: 'plain',
    headStyles: pdfTableHeadStyles,
    styles: {
      ...pdfTableBodyStyles,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 32 },
      2: { textColor: Z[600], cellWidth: 'auto' },
      3: { halign: 'right', fontStyle: 'bold', textColor: Z[900], cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    showHead: 'everyPage',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  pdfDrawFooterGenerated(doc, margin, y);

  const safeCode = trip.code.replace(/[^\w-]+/g, '_');
  doc.save(`acerto-${safeCode}.pdf`);
}
