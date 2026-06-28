import { jsPDF } from 'jspdf';
import type { jsPDF as JsPDFType } from 'jspdf';
import { PDF_FONT_VFS } from './pdf-fonts-data';

/** Família registrada via {@link registerPdfFontsOn} — suporta acentuação pt-BR e símbolos Unicode. */
export const PDF_FONT_FAMILY = 'Roboto';

/**
 * Registra Roboto no documento ativo. O VFS é global, mas o mapeamento da fonte é por instância —
 * registrar só num doc temporário fazia o jsPDF cair no Helvetica e gerar &P&o&r&t&o.
 */
function registerPdfFontsOn(doc: JsPDFType): void {
  if (!doc.existsFileInVFS(PDF_FONT_VFS.regularFile)) {
    doc.addFileToVFS(PDF_FONT_VFS.regularFile, PDF_FONT_VFS.regular);
    doc.addFileToVFS(PDF_FONT_VFS.boldFile, PDF_FONT_VFS.bold);
  }

  const fontList = doc.getFontList();
  if (!fontList[PDF_FONT_FAMILY]) {
    doc.addFont(PDF_FONT_VFS.regularFile, PDF_FONT_FAMILY, 'normal');
    doc.addFont(PDF_FONT_VFS.boldFile, PDF_FONT_FAMILY, 'bold');
  }
}

export function ensurePdfFonts(doc: JsPDFType): void {
  registerPdfFontsOn(doc);
  doc.setFont(PDF_FONT_FAMILY, 'normal');
}

export function createPdfDocument(): JsPDFType {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerPdfFontsOn(doc);
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  return doc;
}
