import autoTable from 'jspdf-autotable';
import type { jsPDF } from 'jspdf';
import { createPdfDocument } from './pdf-font';
import {
  PDF_E,
  PDF_Z,
  PDF_FONT_FAMILY,
  pdfAutoTableMargins,
  pdfDrawEmeraldSectionBanner,
  pdfDrawFooterGenerated,
  pdfDrawSectionKicker,
  pdfDrawSectionTitle,
  pdfEmeraldSummaryTableStyles,
  pdfKeyValueColumnStyles,
  pdfPageContentWidth,
  pdfTableBodyStyles,
  pdfTableHeadStyles,
} from './pdf-theme';

export type FleetReportPdfKmMetrics = {
  avgKmPerTrip: number | null;
  kmPerLiter: number | null;
  fuelCostPerKm: number | null;
  totalExpensesPerKm: number | null;
};

export type FleetReportPdfInput = {
  periodType: 'monthly' | 'semestral' | 'annual';
  periodLabel: string;
  fromYmd: string;
  toYmd: string;
  vehicleLabel: string;
  tripCount: number;
  totalFaturamento: number;
  totalDespesas: number;
  totalLucro: number;
  totalKm: number;
  kmMetrics: FleetReportPdfKmMetrics | null;
  monthlyChartData: { mes: string; faturamento: number; despesas: number }[];
  vehicleStats: {
    placa: string;
    viagens: number;
    deslocamentos: number;
    faturamento: number;
    despesas: number;
    km: number;
  }[];
  driverStats: {
    name: string;
    viagens: number;
    deslocamentos: number;
    faturamento: number;
    salarioPeriodo: number;
    comissao: number;
    salarioMaisComissao: number;
  }[];
  tripRows: {
    code: string;
    startDate: string;
    placa: string;
    motorista: string;
    faturamento: number;
    despesas: number;
    km: number;
    displacementToLoad: boolean;
  }[];
  generatedAtLabel: string;
};

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function tableFinalY(doc: jsPDF): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? 14;
}

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatYmdPtBr(ymd: string): string {
  const p = ymd.split('-').map(Number);
  if (p.length < 3 || Number.isNaN(p[0])) return ymd;
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('pt-BR');
}

function safeFilePart(s: string): string {
  return s.replace(/[^\w-]+/g, '_').slice(0, 80);
}

const kvStyles = {
  theme: 'plain' as const,
  styles: {
    font: PDF_FONT_FAMILY,
    fontSize: 10,
    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
    lineColor: PDF_Z[200],
    lineWidth: 0,
  },
};

/**
 * PDF do relatório financeiro da frota — mesmo visual do acerto (jsPDF + autoTable, zinc/emerald).
 * Quebra automaticamente em várias páginas A4 sem cortar linhas.
 */
export function downloadFleetReportPdf(opts: FleetReportPdfInput): void {
  const doc = createPdfDocument();
  const { margin, contentW } = pdfPageContentWidth(doc);
  const tableMargin = pdfAutoTableMargins(margin);

  const tipoRelatorio =
    opts.periodType === 'monthly' ? 'Mensal' : opts.periodType === 'semestral' ? 'Semestral' : 'Anual';

  let y = 16;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...PDF_Z[900]);
  doc.text('Relatório financeiro · Frota', margin, y);
  y += 8;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_Z[600]);
  for (const line of [
    `${tipoRelatorio} · ${opts.periodLabel}`,
    `Período: ${formatYmdPtBr(opts.fromYmd)} — ${formatYmdPtBr(opts.toYmd)}`,
    `Veículo: ${opts.vehicleLabel}`,
  ]) {
    const split = doc.splitTextToSize(line, contentW);
    doc.text(split, margin, y);
    y += split.length * 5 + 1;
  }
  y += 4;

  y = pdfDrawSectionKicker(doc, y, margin, 'Identificação do recorte');
  autoTable(doc, {
    startY: y,
    body: [
      ['Veículo (filtro)', opts.vehicleLabel],
      ['Viagens concluídas', String(opts.tripCount)],
    ],
    ...kvStyles,
    columnStyles: pdfKeyValueColumnStyles(contentW, 52),
    margin: tableMargin,
    tableWidth: contentW,
  });
  y = tableFinalY(doc) + 8;

  y = pdfDrawEmeraldSectionBanner(doc, y, margin, contentW, 'Resumo financeiro');

  const summaryBody: string[][] = [
    ['Faturamento total', brl(opts.totalFaturamento)],
    ['Despesas total', brl(opts.totalDespesas)],
    ['Lucro líquido (frete − despesas)', brl(opts.totalLucro)],
    ['Quilometragem rodada', `${opts.totalKm.toLocaleString('pt-BR')} km`],
  ];

  if (opts.kmMetrics && opts.tripCount > 0) {
    summaryBody.push(
      [
        'Km médio por viagem (só viagens com km > 0)',
        opts.kmMetrics.avgKmPerTrip != null
          ? `${opts.kmMetrics.avgKmPerTrip.toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
              minimumFractionDigits: 0,
            })} km`
          : '—',
      ],
      [
        'Média km/L (combustível)',
        opts.kmMetrics.kmPerLiter != null
          ? `${opts.kmMetrics.kmPerLiter.toLocaleString('pt-BR', {
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
            })} km/L`
          : '—',
      ],
      [
        'Combustível por km rodado',
        opts.kmMetrics.fuelCostPerKm != null ? `${brl(opts.kmMetrics.fuelCostPerKm)} / km` : '—',
      ],
      [
        'Despesas totais por km',
        opts.kmMetrics.totalExpensesPerKm != null
          ? `${brl(opts.kmMetrics.totalExpensesPerKm)} / km`
          : '—',
      ]
    );
  }

  const lucroRowIdx = 2;
  const kmRowIdx = 3;
  const lastKmMetricRowIdx = summaryBody.length - 1;

  autoTable(doc, {
    startY: y,
    body: summaryBody,
    ...pdfEmeraldSummaryTableStyles,
    columnStyles: {
      0: { ...pdfEmeraldSummaryTableStyles.columnStyles[0], cellWidth: contentW * 0.58 },
      1: { ...pdfEmeraldSummaryTableStyles.columnStyles[1], cellWidth: contentW * 0.42 },
    },
    margin: tableMargin,
    tableWidth: contentW,
    didParseCell: (hookData) => {
      const row = hookData.row.index;
      const col = hookData.column.index;
      if (row === lucroRowIdx) {
        hookData.cell.styles.fillColor = PDF_E[100];
        hookData.cell.styles.textColor = col === 0 ? PDF_E[950] : PDF_E[950];
        hookData.cell.styles.fontStyle = 'bold';
        if (col === 1) hookData.cell.styles.fontSize = 11;
      } else if (row === kmRowIdx) {
        hookData.cell.styles.fillColor = PDF_Z[50];
        hookData.cell.styles.textColor = PDF_Z[950];
        hookData.cell.styles.fontStyle = 'bold';
      } else if (row === lastKmMetricRowIdx && opts.kmMetrics && opts.tripCount > 0) {
        hookData.cell.styles.fillColor = PDF_E[50];
        hookData.cell.styles.textColor = col === 0 ? PDF_Z[700] : PDF_E[950];
        hookData.cell.styles.fontStyle = col === 1 ? 'bold' : 'normal';
      } else {
        hookData.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });
  y = tableFinalY(doc) + 10;

  if (opts.tripRows.length > 0) {
    y = pdfDrawSectionTitle(doc, y, margin, 'Viagens no período') + 3;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_Z[600]);
    doc.text('Linhas com selo “Desloc.”: deslocamento até o carregamento (sem carga).', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Código', 'Data', 'Placa', 'Motorista', 'Frete', 'Despesas', 'Km']],
      body: opts.tripRows.map((t) => [
        t.displacementToLoad ? `${t.code} (Desloc.)` : t.code,
        new Date(t.startDate).toLocaleDateString('pt-BR'),
        t.placa,
        t.motorista,
        brl(t.faturamento),
        brl(t.despesas),
        t.km > 0 ? t.km.toLocaleString('pt-BR') : '—',
      ]),
      theme: 'plain',
      headStyles: { ...pdfTableHeadStyles, fontSize: 8 },
      styles: { ...pdfTableBodyStyles, fontSize: 8, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20 },
        2: { cellWidth: 18 },
        3: { cellWidth: 'auto' },
        4: { halign: 'right', cellWidth: 24 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'right', cellWidth: 16 },
      },
      margin: tableMargin,
      showHead: 'everyPage',
    });
    y = tableFinalY(doc) + 10;
  }

  if (opts.periodType === 'annual' && opts.monthlyChartData.length > 0) {
    y = pdfDrawSectionTitle(doc, y, margin, `Movimento mensal (${opts.periodLabel})`) + 4;
    autoTable(doc, {
      startY: y,
      head: [['Mês', 'Faturamento', 'Despesas', 'Lucro líquido']],
      body: opts.monthlyChartData.map((m) => [
        m.mes,
        brl(m.faturamento),
        brl(m.despesas),
        brl(m.faturamento - m.despesas),
      ]),
      theme: 'plain',
      headStyles: pdfTableHeadStyles,
      styles: pdfTableBodyStyles,
      columnStyles: {
        0: { cellWidth: 28 },
        1: { halign: 'right', cellWidth: 42 },
        2: { halign: 'right', cellWidth: 42 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 42 },
      },
      margin: tableMargin,
      showHead: 'everyPage',
    });
    y = tableFinalY(doc) + 10;
  }

  if (opts.vehicleStats.length > 0) {
    y = pdfDrawSectionTitle(doc, y, margin, 'Desempenho por veículo') + 3;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_Z[600]);
    doc.text('Lista completa no período (sem filtro de busca da tela).', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Viagens', 'Desloc.', 'Faturamento', 'Despesas', 'Km']],
      body: opts.vehicleStats.map((v) => [
        v.placa,
        String(v.viagens),
        v.deslocamentos > 0 ? String(v.deslocamentos) : '—',
        brl(v.faturamento),
        brl(v.despesas),
        v.km.toLocaleString('pt-BR'),
      ]),
      theme: 'plain',
      headStyles: { ...pdfTableHeadStyles, fontSize: 8 },
      styles: { ...pdfTableBodyStyles, fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 24 },
        1: { halign: 'right', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 18 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 32 },
        5: { halign: 'right', cellWidth: 24 },
      },
      margin: tableMargin,
      showHead: 'everyPage',
    });
    y = tableFinalY(doc) + 10;
  }

  if (opts.driverStats.length > 0) {
    y = pdfDrawSectionTitle(doc, y, margin, 'Desempenho por motorista') + 3;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_Z[600]);
    const note = doc.splitTextToSize(
      'Salário proporcional ao período; comissão por viagem usa o acerto quando existir.',
      contentW
    );
    doc.text(note, margin, y);
    y += note.length * 4 + 4;

    autoTable(doc, {
      startY: y,
      head: [
        ['Motorista', 'Viagens', 'Desloc.', 'Faturamento', 'Salário (per.)', 'Comissão', 'Sal.+ com.'],
      ],
      body: opts.driverStats.map((d) => [
        d.name,
        String(d.viagens),
        d.deslocamentos > 0 ? String(d.deslocamentos) : '—',
        brl(d.faturamento),
        brl(d.salarioPeriodo),
        brl(d.comissao),
        brl(d.salarioMaisComissao),
      ]),
      theme: 'plain',
      headStyles: { ...pdfTableHeadStyles, fontSize: 7 },
      styles: { ...pdfTableBodyStyles, fontSize: 7, overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 28 },
        1: { halign: 'right', cellWidth: 14 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'right', cellWidth: 26 },
      },
      margin: tableMargin,
      showHead: 'everyPage',
    });
    y = tableFinalY(doc) + 8;
  }

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_Z[500]);
  const footerNote = doc.splitTextToSize(
    'PDS · Valores conforme filtros da tela de relatórios (espelha regras de acerto para km e totais).',
    contentW
  );
  const pageH = doc.internal.pageSize.getHeight();
  if (y + footerNote.length * 4 + 10 > pageH - 12) {
    doc.addPage();
    y = 16;
  }
  doc.text(footerNote, margin, y);
  y += footerNote.length * 4 + 4;

  pdfDrawFooterGenerated(doc, margin, y);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_Z[500]);
  doc.text(`Base: ${opts.generatedAtLabel}`, margin, y + 4);

  doc.save(`relatorio-frota-${safeFilePart(opts.periodLabel)}-${Date.now()}.pdf`);
}
