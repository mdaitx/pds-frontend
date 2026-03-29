/**
 * Espera o Nest (pds-backend) responder em /health antes de subir o Next.
 * Evita requisições a :4000 enquanto a API ainda não está no ar.
 */
import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PDS_BACKEND_WAIT_PORT ?? '4000');
const PATH = process.env.PDS_BACKEND_WAIT_PATH ?? '/health';
const INTERVAL_MS = 400;
const TIMEOUT_MS = Number(process.env.PDS_BACKEND_WAIT_TIMEOUT_MS ?? '120000');

function check() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: HOST, port: PORT, path: PATH, method: 'GET', timeout: 5000 },
      (res) => {
        res.resume();
        if (res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}`));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

const deadline = Date.now() + TIMEOUT_MS;

async function main() {
  for (;;) {
    try {
      await check();
      process.exit(0);
    } catch {
      if (Date.now() > deadline) {
        console.error(
          `\n[pds-frontend] Backend não respondeu em http://${HOST}:${PORT}${PATH} dentro de ${TIMEOUT_MS}ms.`,
          '\nVerifique se o Nest sobe sem erros (Prisma, .env, porta 4000 livre).\n',
        );
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  }
}

main();
