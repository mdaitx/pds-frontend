/**
 * Tema único para PDFs (relatórios e acerto): cores próximas ao Tailwind zinc,
 * Roboto (UTF-8) via pdf-font.ts, margens e estilos alinhados à UI.
 */
import type { jsPDF } from 'jspdf';
import { PDF_FONT_FAMILY } from './pdf-font';

export { PDF_FONT_FAMILY };

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
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PDF_Z[900]);
  doc.text(title, margin, y);
  let next = y + 8;
  doc.setFont(PDF_FONT_FAMILY, 'normal');
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
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_Z[500]);
  doc.text(text.toUpperCase(), margin, y);
  doc.setTextColor(...PDF_Z[900]);
  return y + 6;
}

/** Título de seção (ex.: “Resumo”, “Despesas”). */
export function pdfDrawSectionTitle(doc: jsPDF, y: number, margin: number, text: string): number {
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_Z[900]);
  doc.text(text, margin, y);
  return y + 5;
}

export function pdfDrawFooterGenerated(doc: jsPDF, margin: number, y: number): void {
  doc.setFont(PDF_FONT_FAMILY, 'normal');
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
  font: PDF_FONT_FAMILY,
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

/** Margens para autoTable com quebra automática entre páginas A4. */
export function pdfAutoTableMargins(margin = PDF_MARGIN) {
  return { left: margin, right: margin, top: 16, bottom: 18 };
}

/** Faixa esverdeada de título de seção (como “Resumo do acerto”). Retorna Y após o bloco. */
export function pdfDrawEmeraldSectionBanner(
  doc: jsPDF,
  y: number,
  margin: number,
  contentW: number,
  title: string
): number {
  doc.setFillColor(...PDF_E[50]);
  doc.roundedRect(margin, y - 4, contentW, 8, 1.5, 1.5, 'F');
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_E[900]);
  doc.text(title, margin + 2, y + 1);
  doc.setTextColor(...PDF_Z[900]);
  return y + 10;
}

/** Estilos compartilhados de tabela resumo financeiro (faixa emerald, como acerto). */
export const pdfEmeraldSummaryTableStyles = {
  theme: 'plain' as const,
  styles: {
    font: PDF_FONT_FAMILY,
    fontSize: 10,
    cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    lineColor: PDF_E[200],
    lineWidth: 0.15,
  },
  columnStyles: {
    0: { textColor: PDF_Z[600], fontStyle: 'normal' as const },
    1: { textColor: PDF_Z[900], fontStyle: 'bold' as const, halign: 'right' as const },
  },
};
