// Ningún texto de "pendiente" (fondo, foto o imagen faltante) puede llegar a la pantalla del jugador.
// Si falta un fondo, se usa uno existente del mismo lugar con desenfoque y el aviso solo va a la consola en desarrollo.
// Uso: node tools/probar-pendientes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const leer = (r) => fs.readFileSync(path.join(raiz, r), 'utf8');
const archivos = (dir) => fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]));

// 1) Ningún texto de "pendiente" en lo que se dibuja (código, datos del juego y guia.html).
//    "Pendiente" del terreno (la capa de pendientes en grados) sí se permite: no es un aviso de arte faltante.
const AVISO = /(fondo|foto|imagen|arte|ilustraci[oó]n|sprite)s?\s+pendientes?|pendientes?\s+de\s+(revisi[oó]n|arte|ilustraci[oó]n)|etiqueta-pendiente|foto-pendiente/i;
const revisar = [...archivos('src').filter((f) => /\.(jsx?|json|css)$/.test(f)), 'public/guia.html', 'public/data/guia_supervivencia.json'];
const conAviso = revisar.filter((f) => leer(f).split('\n').some((l) => AVISO.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)));
ok(conAviso.length === 0, `ningún texto de "pendiente" llega a la pantalla${conAviso.length ? ` (aparece en: ${conAviso.join(', ')})` : ''}`);

// 2) Cada fondo que falta tiene un sustituto explícito que SÍ existe, del mismo lugar
const vite = await createServer({ root: raiz, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { SUSTITUTO, Fondo } = await vite.ssrLoadModule('/src/componentes/Personajes.jsx');
  const { React, renderToString } = await vite.ssrLoadModule('/tools/render-react.js');
  const hay = new Set(fs.readdirSync(path.join(raiz, 'public/img/fondos')));
  const base = (f) => f.replace(/\.[a-z0-9]+$/i, '');
  const existe = (f) => [...hay].some((x) => base(x) === base(f));
  const usados = new Map();
  for (const f of fs.readdirSync(path.join(raiz, 'src/data/capitulos'))) {
    for (const e of JSON.parse(leer(`src/data/capitulos/${f}`)).escenas ?? []) if (e.fondo) usados.set(e.fondo, [...(usados.get(e.fondo) ?? []), e.id]);
  }
  for (const p of JSON.parse(leer('src/data/pois.json'))) if (p.pov) usados.set(p.pov, [...(usados.get(p.pov) ?? []), `pois:${p.id}`]);
  const faltan = [...usados.keys()].filter((f) => !existe(f));
  const sinSustituto = faltan.filter((f) => !SUSTITUTO[base(f)] || !existe(SUSTITUTO[base(f)]));
  ok(sinSustituto.length === 0, `cada fondo que falta (${faltan.length}) tiene un sustituto que existe${sinSustituto.length ? ` (sin sustituto: ${sinSustituto.join(', ')})` : ''}`);
  const finales = faltan.filter((f) => f.startsWith('final_'));
  ok(finales.every((f) => /^bg_c0[3-9]_|^bg_c10_/.test(SUSTITUTO[base(f)] ?? '')), `los finales usan un fondo de la base o del Marswalk (${finales.map((f) => `${base(f)} → ${SUSTITUTO[base(f)]}`).join(', ')})`);
  const lugar = (f) => (/^bg_c0[12]_/.test(f) ? 'nave' : 'marte');
  ok(faltan.every((f) => f.startsWith('final_') || lugar(f) === lugar(SUSTITUTO[base(f)])), 'cada sustituto es del mismo lugar (nave con nave, Marte con Marte)');

  // 3) La lista para ilustradores está completa y al día
  const doc = fs.readFileSync(path.join(raiz, '../docs/fondos_faltantes.md'), 'utf8');
  const noListados = faltan.filter((f) => !doc.includes(`\`${f}\``));
  const yaLlegaron = [...doc.matchAll(/^\| `([^`]+\.(?:jpg|png|webp))`/gm)].map((m) => m[1]).filter((f) => existe(f));
  ok(noListados.length === 0, `docs/fondos_faltantes.md lista los ${faltan.length} fondos que faltan${noListados.length ? ` (faltan en la lista: ${noListados.join(', ')})` : ''}`);
  ok(yaLlegaron.length === 0, `docs/fondos_faltantes.md no lista fondos que ya llegaron${yaLlegaron.length ? ` (ya existen: ${yaLlegaron.join(', ')})` : ''}`);

  // 4) Dibujado: un fondo que falta no escribe nada en pantalla
  const h = React.createElement;
  for (const f of [...finales, faltan.find((x) => !x.startsWith('final_'))].filter(Boolean)) {
    const html = renderToString(h(Fondo, { archivo: f, capitulo: 10 }));
    const texto = html.replace(/<[^>]+>/g, '').trim();
    ok(texto === '' && !/pendiente/i.test(html), `Fondo("${f}") no escribe texto en pantalla`);
  }
} finally {
  await vite.close();
}

if (fallos) { console.log(`\n${fallos} prueba(s) de "pendiente" fallaron`); process.exit(1); }
console.log('\n✅ Sin avisos de "pendiente" en pantalla; cada fondo que falta tiene un sustituto del mismo lugar');
