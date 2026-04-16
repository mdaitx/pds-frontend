/**
 * Tema único para PDFs (relatórios e acerto): cores próximas ao Tailwind zinc,
 * Helvetica no jsPDF, margens e estilos de tabela alinhados à UI.
 */
import type { jsPDF } from 'jspdf';

export const PDF_MARGIN = 14;

/** RGB próximo ao Tailwind zinc / emerald. */
export const PDF_Z = {
  50: [250, 250, 250] as [number, number, number],
  100: [244, 244, 245] as [number, number, number],
  200: [228, 228, 231] as [number, number, number],
  500: [113, 113, 122] as [number, number, number],
  600: [82, 82, 91] as [number, number, number],
  700: [63, 63, 70] as [number, number, number],
  800: [39, 39, 42] as [number, number, number],
  900: [24, 24, 27] as [number, number, number],
  950: [9, 9, 11] as [number, number, number],
};

export const PDF_E = {
  50: [236, 253, 245] as [number, number, number],
  100: [209, 250, 229] as [number, number, number],
  200: [167, 243, 208] as [number, number, number],
  800: [6, 95, 70] as [number, number, number],
  900: [6, 78, 59] as [number, number, number],
  950: [2, 44, 34] as [number, number, number],
};

export function pdfPageContentWidth(doc: jsPDF): { pageW: number; margin: number; contentW: number } {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  const contentW = pageW - margin * 2;
  return { pageW, margin, contentW };
}

/** Título principal + subtítulo (período) + notas opcionais — retorna Y após o bloco. */
export function pdfDrawReportHeader(
  doc: jsPDF,
  y: number,
  contentW: number,
  margin: number,
  title: string,
  subtitle?: string,
  notes?: string
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PDF_Z[900]);
  doc.text(title, margin, y);
  let next = y + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_Z[600]);
  if (subtitle) {
    const lines = doc.splitTextToSize(subtitle, contentW);
    doc.text(lines, margin, next);
    next += lines.length * 5 + 3;
  }
  if (notes) {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_Z[500]);
    const nl = doc.splitTextToSize(notes, contentW);
    doc.text(nl, margin, next);
    next += nl.length * 4 + 4;
  }
  doc.setTextColor(...PDF_Z[900]);
  return next;
}

/** Rótulo de seção em caixa alta (como “DADOS DA VIAGEM”). */
export function pdfDrawSectionKicker(doc: jsPDF, y: number, margin: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_Z[500]);
  doc.text(text.toUpperCase(), margin, y);
  doc.setTextColor(...PDF_Z[900]);
  return y + 6;
}

/** Título de seção (ex.: “Resumo”, “Despesas”). */
export function pdfDrawSectionTitle(doc: jsPDF, y: number, margin: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_Z[900]);
  doc.text(text, margin, y);
  return y + 5;
}

export function pdfDrawFooterGenerated(doc: jsPDF, margin: number, y: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_Z[500]);
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
}

/** Cabeçalho de tabela — fundo zinc-100, texto zinc-700 (igual telas de relatório / acerto). */
export const pdfTableHeadStyles = {
  fillColor: PDF_Z[100],
  textColor: PDF_Z[700],
  fontStyle: 'bold' as const,
  fontSize: 9,
  lineColor: PDF_Z[200],
  lineWidth: 0.2,
};

/** Corpo padrão de tabelas de relatório. */
export const pdfTableBodyStyles = {
  font: 'helvetica',
  fontSize: 9,
  textColor: PDF_Z[800],
  cellPadding: 2,
  lineColor: PDF_Z[200],
  lineWidth: 0.1,
};

/** Tabela duas colunas rótulo / valor (resumos). */
export function pdfKeyValueColumnStyles(contentW: number, labelWidthMm = 62) {
  return {
    0: { textColor: PDF_Z[500], fontStyle: 'normal' as const, cellWidth: labelWidthMm },
    1: { textColor: PDF_Z[900], fontStyle: 'bold' as const, cellWidth: contentW - labelWidthMm },
  };
}
