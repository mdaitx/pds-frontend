import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  DriverExpenseLine,
  DriverReportSummary,
  ReportAggregate,
  TripReportRow,
} from '@/lib/reports';
import { TRIP_STATUS_LABEL } from '@/lib/reports';
import {
  PDF_Z,
  pdfDrawFooterGenerated,
  pdfDrawReportHeader,
  pdfDrawSectionTitle,
  pdfKeyValueColumnStyles,
  pdfPageContentWidth,
  pdfTableBodyStyles,
  pdfTableHeadStyles,
} from './pdf-theme';

function brl(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function safeFilePart(s: string): string {
  return s.replace(/[^\w-]+/g, '_').slice(0, 80);
}

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function tableFinalY(doc: jsPDF): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? 14;
}

const kvStyles = {
  theme: 'plain' as const,
  styles: {
    font: 'helvetica' as const,
    fontSize: 10,
    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
    lineColor: PDF_Z[200],
    lineWidth: 0,
  },
};

/** Bloco resumo em duas colunas (rótulo | valor), alinhado ao PDF de acerto. */
function appendKeyValueBlock(doc: jsPDF, y: number, margin: number, contentW: number, rows: string[][]): number {
  autoTable(doc, {
    startY: y,
    body: rows,
    ...kvStyles,
    columnStyles: pdfKeyValueColumnStyles(contentW, 72),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });
  return tableFinalY(doc);
}

export function downloadTripsReportPdf(
  rows: TripReportRow[],
  meta: { title: string; period: string; notes?: string }
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { margin, contentW } = pdfPageContentWidth(doc);
  let y = pdfDrawReportHeader(doc, 16, contentW, margin, meta.title, `Período: ${meta.period}`, meta.notes);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Código',
        'Data',
        'Status',
        'Veículo',
        'Motorista',
        'Frete',
        'Despesas',
        'Margem',
        'Res.dono',
        'Km',
        'R$/km (comb.)',
        'R$/km (desp.)',
      ],
    ],
    body: rows.map((r) => [
      r.code,
      new Date(r.startDate).toLocaleDateString('pt-BR'),
      TRIP_STATUS_LABEL[r.status],
      r.vehicleLabel,
      r.driverName,
      brl(r.freight),
      brl(r.expenses),
      brl(r.grossProfit),
      r.ownerResult != null ? brl(r.ownerResult) : '—',
      r.km > 0 ? String(r.km) : '—',
      r.costPerKm != null ? brl(r.costPerKm) : '—',
      r.expensesPerKm != null ? brl(r.expensesPerKm) : '—',
    ]),
    theme: 'plain',
    headStyles: pdfTableHeadStyles,
    styles: { ...pdfTableBodyStyles, fontSize: 7 },
    margin: { left: margin, right: margin },
  });

  y = tableFinalY(doc) + 8;
  pdfDrawFooterGenerated(doc, margin, y);
  doc.save(`relatorio-${safeFilePart(meta.title)}-${Date.now()}.pdf`);
}

export function downloadSummaryReportPdf(opts: {
  title: string;
  subtitle: string;
  aggregate: ReportAggregate;
  detailRows: TripReportRow[];
}): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { margin, contentW } = pdfPageContentWidth(doc);
  let y = pdfDrawReportHeader(doc, 16, contentW, margin, opts.title, opts.subtitle);
  y += 4;

  y = pdfDrawSectionTitle(doc, y, margin, 'Resumo');
  y += 3;

  const a = opts.aggregate;
  const summaryRows: string[][] = [
    ['Viagens (exceto canceladas)', String(a.trips)],
];
  if (a.tripsCancelled > 0) {
    summaryRows.push(['Canceladas fora dos totais', String(a.tripsCancelled)]);
  }
  summaryRows.push(
    ['Faturamento (frete)', brl(a.freight)],
    ['Despesas', brl(a.expenses)],
    ['Adiantamentos', brl(a.advances)],
    ['Margem bruta', brl(a.grossProfit)],
    ['Comissão (acerto)', a.driverCommission != null ? brl(a.driverCommission) : '—'],
    ['Resultado proprietário', a.ownerResult != null ? brl(a.ownerResult) : '—'],
    ['Km rodados', a.km.toLocaleString('pt-BR')],
    ['Km médio por viagem (só km > 0)', a.avgKmPerTrip != null ? `${a.avgKmPerTrip.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : '—'],
    ['Média km/L (combustível)', a.kmPerLiter != null ? `${a.kmPerLiter.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km/L` : '—'],
    ['Combustível por km (R$/km)', a.costPerKm != null ? brl(a.costPerKm) : '—'],
    ['Despesas totais por km (R$/km)', a.totalExpensesPerKm != null ? brl(a.totalExpensesPerKm) : '—']
  );

  y = appendKeyValueBlock(doc, y, margin, contentW, summaryRows) + 10;

  if (opts.detailRows.length > 0) {
    y = pdfDrawSectionTitle(doc, y, margin, 'Viagens no período');
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Código', 'Data', 'Status', 'Frete', 'Despesas', 'Margem', 'Res.dono', 'Km', 'R$/km comb.', 'R$/km desp.']],
      body: opts.detailRows.map((r) => [
        r.code,
        new Date(r.startDate).toLocaleDateString('pt-BR'),
        TRIP_STATUS_LABEL[r.status],
        brl(r.freight),
        brl(r.expenses),
        brl(r.grossProfit),
        r.ownerResult != null ? brl(r.ownerResult) : '—',
        r.km > 0 ? String(r.km) : '—',
        r.costPerKm != null ? brl(r.costPerKm) : '—',
        r.expensesPerKm != null ? brl(r.expensesPerKm) : '—',
      ]),
      theme: 'plain',
      headStyles: pdfTableHeadStyles,
      styles: { ...pdfTableBodyStyles, fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    y = tableFinalY(doc) + 8;
  }

  pdfDrawFooterGenerated(doc, margin, y);
  doc.save(`relatorio-${safeFilePart(opts.title)}-${Date.now()}.pdf`);
}

export function downloadMotoristaReportPdf(opts: {
  title: string;
  subtitle: string;
  aggregate: ReportAggregate;
  detailRows: TripReportRow[];
  summary: DriverReportSummary;
  expenseLines: DriverExpenseLine[];
}): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { margin, contentW } = pdfPageContentWidth(doc);
  let y = pdfDrawReportHeader(doc, 16, contentW, margin, opts.title, opts.subtitle);
  y += 4;

  const a = opts.aggregate;
  const s = opts.summary;

  y = pdfDrawSectionTitle(doc, y, margin, 'Resumo operacional');
  y += 3;
  const opRows: string[][] = [
    ['Viagens (exceto canceladas)', String(a.trips)],
  ];
  if (a.tripsCancelled > 0) {
    opRows.push(['Canceladas fora dos totais', String(a.tripsCancelled)]);
  }
  opRows.push(
    ['Faturamento (frete)', brl(a.freight)],
    ['Despesas (viagens)', brl(a.expenses)],
    ['Adiantamentos', brl(a.advances)],
    ['Margem bruta', brl(a.grossProfit)],
    ['Comissão (acerto)', a.driverCommission != null ? brl(a.driverCommission) : '—'],
    ['Resultado proprietário (só acertos)', a.ownerResult != null ? brl(a.ownerResult) : '—'],
    ['Km rodados', a.km.toLocaleString('pt-BR')],
    ['Km médio por viagem (só km > 0)', a.avgKmPerTrip != null ? `${a.avgKmPerTrip.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : '—'],
    ['Média km/L (combustível)', a.kmPerLiter != null ? `${a.kmPerLiter.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km/L` : '—'],
    ['Combustível por km (R$/km)', a.costPerKm != null ? brl(a.costPerKm) : '—'],
    ['Despesas totais por km (R$/km)', a.totalExpensesPerKm != null ? brl(a.totalExpensesPerKm) : '—']
  );
  y = appendKeyValueBlock(doc, y, margin, contentW, opRows) + 10;

  y = pdfDrawSectionTitle(doc, y, margin, 'Salário e encargos do motorista');
  y += 3;
  const salaryRows: string[][] = [
    ['Salário mensal (cadastro)', brl(s.monthlySalaryCadastro)],
    ['Salário no período (proporcional)', brl(s.proratedSalary)],
    ['Adiantamentos no período (abatidos no salário)', brl(s.totalAdvancesPeriod)],
    ['Salário líquido no período (após adiantamentos)', brl(s.salaryAfterAdvances)],
    ['Total comissões (mês/período)', s.totalCommissions != null ? brl(s.totalCommissions) : '—'],
    ['Comissões + salário bruto no período', brl(s.encargosMotorista)],
    ['A pagar (comissões das viagens)', s.totalAmountToPayTrips != null ? brl(s.totalAmountToPayTrips) : '—'],
    ['Total a pagar ao motorista (comissões + salário após adiantamentos)', brl(s.totalToPayDriver)],
  ];
  y = appendKeyValueBlock(doc, y, margin, contentW, salaryRows) + 10;

  y = pdfDrawSectionTitle(doc, y, margin, 'Proprietário (após salário mensal)');
  y += 3;
  const ownerRows: string[][] = [
    ['Resultado acertos (soma viagens)', s.ownerResultAcertos != null ? brl(s.ownerResultAcertos) : '—'],
    ['Resultado após descontar salário proporcional', s.ownerAfterSalary != null ? brl(s.ownerAfterSalary) : '—'],
  ];
  y = appendKeyValueBlock(doc, y, margin, contentW, ownerRows) + 10;

  if (opts.detailRows.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    y = pdfDrawSectionTitle(doc, y, margin, 'Viagens no período');
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [
        [
          'Código',
          'Data',
          'Status',
          'Frete',
          'Despesas',
          'Margem',
          'A pagar mot.',
          'Res.dono',
          'Km',
          'R$/km comb.',
          'R$/km desp.',
        ],
      ],
      body: opts.detailRows.map((r) => [
        r.code,
        new Date(r.startDate).toLocaleDateString('pt-BR'),
        TRIP_STATUS_LABEL[r.status],
        brl(r.freight),
        brl(r.expenses),
        brl(r.grossProfit),
        r.amountToPayDriver != null ? brl(r.amountToPayDriver) : '—',
        r.ownerResult != null ? brl(r.ownerResult) : '—',
        r.km > 0 ? String(r.km) : '—',
        r.costPerKm != null ? brl(r.costPerKm) : '—',
        r.expensesPerKm != null ? brl(r.expensesPerKm) : '—',
      ]),
      theme: 'plain',
      headStyles: pdfTableHeadStyles,
      styles: { ...pdfTableBodyStyles, fontSize: 7 },
      margin: { left: margin, right: margin },
    });
    y = tableFinalY(doc) + 10;
  }

  if (opts.expenseLines.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 16;
    }
    y = pdfDrawSectionTitle(doc, y, margin, 'Despesas (cada lançamento)');
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Viagem', 'Categoria', 'Litros', 'Descrição', 'Valor']],
      body: opts.expenseLines.map((e) => [
        new Date(e.date).toLocaleDateString('pt-BR'),
        e.tripCode,
        e.categoryName,
        e.liters != null
          ? Number(e.liters).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
          : '—',
        e.description?.slice(0, 60) ?? '—',
        brl(e.amount),
      ]),
      theme: 'plain',
      headStyles: pdfTableHeadStyles,
      styles: { ...pdfTableBodyStyles, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 22 },
        2: { cellWidth: 26 },
        3: { halign: 'right' as const, cellWidth: 18 },
        4: { textColor: PDF_Z[600], cellWidth: 'auto' },
        5: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: PDF_Z[900], cellWidth: 28 },
      },
      margin: { left: margin, right: margin },
    });
    y = tableFinalY(doc) + 8;
  }

  pdfDrawFooterGenerated(doc, margin, y);
  doc.save(`relatorio-${safeFilePart(opts.title)}-${Date.now()}.pdf`);
}
