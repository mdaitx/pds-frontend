/**
 * Gera src/lib/pdf-fonts-data.ts com Roboto Regular/Bold em base64 (offline, sem fetch em runtime).
 * Fontes: Google Fonts (Apache 2.0) — https://github.com/googlefonts/roboto
 *
 * Uso: node scripts/generate-pdf-fonts.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/lib/pdf-fonts-data.ts');

const SOURCES = {
  regular:
    'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf',
  bold: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf',
};

async function fetchBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

const [regular, bold] = await Promise.all([fetchBase64(SOURCES.regular), fetchBase64(SOURCES.bold)]);

const content = `/**
 * Roboto embutida para jsPDF (UTF-8 / pt-BR). Gerado por scripts/generate-pdf-fonts.mjs — não editar.
 * Licença: Apache 2.0 (Google Fonts).
 */
export const PDF_FONT_VFS = {
  regularFile: 'Roboto-Regular.ttf',
  boldFile: 'Roboto-Bold.ttf',
  regular: ${JSON.stringify(regular)},
  bold: ${JSON.stringify(bold)},
} as const;
`;

writeFileSync(OUT, content, 'utf8');
console.log(`Gerado ${OUT} (${Math.round(regular.length / 1024)}k + ${Math.round(bold.length / 1024)}k base64)`);
