import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportAggregate, TripReportRow } from '@/lib/reports';
import { TRIP_STATUS_LABEL } from '@/lib/reports';

function brl(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function safeFilePart(s: string): string {
  return s.replace(/[^\w\-]+/g, '_').slice(0, 80);
}

export function downloadTripsReportPdf(rows: TripReportRow[], meta: { title: string; period: string; notes?: string }): void {
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(15);
  doc.text(meta.title, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Período: ${meta.period}`, 14, y);
  y += 6;
  if (meta.notes) {
    doc.setFontSize(9);
    doc.text(meta.notes, 14, y, { maxWidth: 180 });
    y += 10;
  } else {
    y += 4;
  }

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
        'R$/km',
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
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 },
  });

  const suffix = safeFilePart(meta.title);
  doc.save(`relatorio-${suffix}-${Date.now()}.pdf`);
}

export function downloadSummaryReportPdf(opts: {
  title: string;
  subtitle: string;
  aggregate: ReportAggregate;
  detailRows: TripReportRow[];
}): void {
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(15);
  doc.text(opts.title, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(opts.subtitle, 14, y);
  y += 10;

  const { aggregate: a } = opts;
  doc.setFontSize(11);
  doc.text('Resumo', 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Viagens (exceto canceladas): ${a.trips}`, 14, y);
  y += 5;
  if (a.tripsCancelled > 0) {
    doc.text(`Canceladas fora dos totais: ${a.tripsCancelled}`, 14, y);
    y += 5;
  }
  doc.text(`Faturamento (frete): ${brl(a.freight)}`, 14, y);
  y += 5;
  doc.text(`Despesas: ${brl(a.expenses)}`, 14, y);
  y += 5;
  doc.text(`Adiantamentos: ${brl(a.advances)}`, 14, y);
  y += 5;
  doc.text(`Margem bruta: ${brl(a.grossProfit)}`, 14, y);
  y += 5;
  doc.text(`Comissão (acerto): ${a.driverCommission != null ? brl(a.driverCommission) : '—'}`, 14, y);
  y += 5;
  doc.text(`Resultado proprietário: ${a.ownerResult != null ? brl(a.ownerResult) : '—'}`, 14, y);
  y += 5;
  doc.text(`Km rodados: ${a.km.toLocaleString('pt-BR')}`, 14, y);
  y += 5;
  doc.text(`Custo / km: ${a.costPerKm != null ? brl(a.costPerKm) : '—'}`, 14, y);
  y += 10;

  if (opts.detailRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Código', 'Data', 'Status', 'Frete', 'Despesas', 'Margem', 'Res.dono', 'Km', 'R$/km']],
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
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });
  }

  const suffix = safeFilePart(opts.title);
  doc.save(`relatorio-${suffix}-${Date.now()}.pdf`);
}
