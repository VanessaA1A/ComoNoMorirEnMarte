// Prueba la ANTHROPIC_API_KEY con UNA llamada mínima (max_tokens 50). NUNCA imprime la key.
// Uso (desde la raíz del repo; necesita Backend/node_modules):  node tools/probar_zinnia.mjs
// Lee la key de la variable de entorno o, si no está, de Backend/.env. Solo informa:
//   si existe, cuántos caracteres tiene, si empieza con "sk-ant-api" y si tiene espacios, comillas o BOM.
// Resultado: OK · 401 (key inválida) · 400 (sin crédito u otra petición inválida) · 404 (modelo) · otro.
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';

const backend = new URL('../Backend/', import.meta.url);
const require = createRequire(new URL('package.json', backend));
const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');

// ---------- formato de la key (sin mostrarla) ----------
let crudo = process.env.ANTHROPIC_API_KEY;
let bom = false;
const env = new URL('.env', backend);
if (crudo === undefined && existsSync(env)) {
  const bytes = readFileSync(env);
  bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const linea = bytes.toString('utf8').split(/\r?\n/).find((l) => /^\s*ANTHROPIC_API_KEY\s*=/.test(l));
  crudo = linea?.replace(/^\s*ANTHROPIC_API_KEY\s*=/, '');
}
if (!crudo) { console.log('ANTHROPIC_API_KEY: no existe (ni en el entorno ni en Backend/.env)'); process.exit(1); }
const key = crudo.trim().replace(/^['"]|['"]$/g, '');
console.log(`key: existe · ${key.length} caracteres · empieza con "sk-ant-api": ${key.startsWith('sk-ant-api') ? 'sí' : 'NO'} · espacios: ${/\s/.test(crudo.trim()) || crudo !== crudo.trim() ? 'SÍ' : 'no'} · comillas: ${/['"]/.test(crudo) ? 'SÍ' : 'no'} · BOM: ${bom ? 'SÍ' : 'no'}`);

// ---------- una llamada mínima ----------
const modelo = process.env.ZINNIA_MODEL || 'claude-haiku-5-5';
const cliente = new Anthropic({ apiKey: key, timeout: 15000, maxRetries: 0 });
try {
  const r = await cliente.messages.create({
    model: modelo, max_tokens: 50, thinking: { type: 'disabled' }, output_config: { effort: 'low' },
    messages: [{ role: 'user', content: 'Responde solo: ok' }],
  });
  console.log(`OK · modelo ${r.model} · tokens ${r.usage.input_tokens} + ${r.usage.output_tokens} · texto: ${r.content.filter((b) => b.type === 'text').map((b) => b.text).join('')}`);
} catch (e) {
  const msg = String(e?.error?.error?.message ?? e?.message ?? '').slice(0, 160);
  if (e instanceof Anthropic.AuthenticationError) console.log('401: la key no es válida → crea una nueva en la Claude Console (API keys); tiene que empezar con sk-ant-api');
  else if (e instanceof Anthropic.NotFoundError) console.log(`404: el modelo "${modelo}" no existe para esta key → revisa ZINNIA_MODEL`);
  else if (e instanceof Anthropic.BadRequestError) console.log(`400: ${/credit balance/i.test(msg) ? 'sin crédito → carga saldo en Plans & Billing de la Claude Console' : msg}`);
  else if (e instanceof Anthropic.PermissionDeniedError) console.log(`403: sin permiso → ${msg}`);
  else if (e instanceof Anthropic.APIConnectionError) console.log(`sin conexión con la API: ${msg}`);
  else if (e instanceof Anthropic.APIError) console.log(`${e.status ?? 'error'}: ${msg}`);
  else console.log(`error: ${msg}`);
  process.exitCode = 1;
}
