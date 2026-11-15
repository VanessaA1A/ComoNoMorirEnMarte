// Revisión rápida antes de npm run dev / build / probar: ¿la versión de Node sirve y están instaladas
// TODAS las dependencias de package.json en la versión correcta? Si algo falta, dice en español cómo arreglarlo.
// Caso típico: después de un git pull que agregó dependencias (por ejemplo leaflet o three) sin correr npm install,
// Vite falla con "Rollup failed to resolve import ...".
// Uso: node tools/revisar-entorno.mjs [--todo]   (lo corren solos predev y prebuild; preprobar con --todo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
const problemas = [];

// 1) Node: mínimo el de "engines" (Vite 6, las pruebas con import ... with { type: 'json' } y jsdom)
const minimo = (pkg.engines?.node ?? '>=20.19.0').replace(/[^\d.]/g, '').split('.').map(Number);
const actual = process.versions.node.split('.').map(Number);
const viejo = actual[0] < minimo[0] || (actual[0] === minimo[0] && (actual[1] < minimo[1] || (actual[1] === minimo[1] && actual[2] < (minimo[2] ?? 0))));
if (viejo) problemas.push(`Tu Node es ${process.versions.node} y el juego necesita ${minimo.join('.')} o más nuevo. Instala Node 22 o 24 (LTS) desde https://nodejs.org/ y vuelve a abrir la terminal.`);

// 2) Dependencias: cada una instalada y en la versión de package.json
const faltan = [];
const distintas = [];
// dev y build: lo necesario para compilar; probar (--todo): también las de las pruebas (jsdom)
const PARA_COMPILAR = ['vite', '@vitejs/plugin-react'];
const todo = process.argv.includes('--todo');
const revisar = { ...pkg.dependencies, ...Object.fromEntries(Object.entries(pkg.devDependencies ?? {}).filter(([n]) => todo || PARA_COMPILAR.includes(n))) };
for (const [nombre, version] of Object.entries(revisar)) {
  const archivo = path.join(raiz, 'node_modules', nombre, 'package.json');
  if (!fs.existsSync(archivo)) { faltan.push(nombre); continue; }
  const instalada = JSON.parse(fs.readFileSync(archivo, 'utf8')).version;
  if (/^\d+\.\d+\.\d+$/.test(version) && instalada !== version) distintas.push(`${nombre} (tienes ${instalada}, se usa ${version})`);
}
if (faltan.length) problemas.push(`Faltan dependencias: ${faltan.join(', ')}.`);
if (distintas.length) problemas.push(`Hay dependencias en otra versión: ${distintas.join(', ')}.`);
if (faltan.length || distintas.length) problemas.push('Arreglo: en la carpeta Frontend corre  npm install  (hazlo después de cada git pull).');

if (problemas.length) {
  console.error(`\n✗ El entorno no está listo para el juego:\n  - ${problemas.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`✓ Entorno listo: Node ${process.versions.node} y ${Object.keys(revisar).length} dependencias instaladas`);
