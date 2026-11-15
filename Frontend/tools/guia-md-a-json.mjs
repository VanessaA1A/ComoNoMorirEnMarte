// Convierte docs/guia_supervivencia.md (la guía que escribe el equipo) en public/data/guia_supervivencia.json,
// que leen la Guía del juego, public/guia.html y Zinn-IA (frontend y backend). Una sola fuente.
// Uso: node tools/guia-md-a-json.mjs           (escribe el JSON)
//      node tools/guia-md-a-json.mjs --revisar (solo comprueba que el JSON esté al día; lo usa npm run probar)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD = path.join(raiz, '..', 'docs', 'guia_supervivencia.md');
const JSON_SALIDA = path.join(raiz, 'public', 'data', 'guia_supervivencia.json');

// id y nombre corto (pestaña) de cada parte
const PARTES = {
  0: { id: 'como-leer', corto: 'Cómo leer esta guía' },
  1: { id: 'reglas', corto: 'Reglas del juego' },
  2: { id: 'mapa', corto: 'Tu mapa' },
  3: { id: 'situaciones', corto: 'Situación por situación' },
  4: { id: 'datos', corto: 'Marte en datos' },
  5: { id: 'ciencia', corto: 'Mentes científicas' },
  6: { id: 'glosario', corto: 'Glosario' },
};

export function convertir(md) {
  const lineas = md.replace(/\r/g, '').split('\n');
  const guia = { titulo: '', subtitulo: '', intro: '', secciones: [], referencias: {} };
  let seccion = { id: PARTES[0].id, titulo: 'Cómo leer esta guía', corto: PARTES[0].corto, bloques: [] };
  let parrafo = [];
  let lista = null;
  let tabla = null;

  const cerrar = () => {
    if (parrafo.length) {
      const t = parrafo.join(' ').trim();
      if (/^\*[^*].*[^*]\*$/.test(t)) seccion.bloques.push({ tipo: 'nota', texto: t.slice(1, -1) });
      else if (seccion.id === 'referencias' && /^\*\*.*\*\*$/.test(t)) seccion.bloques.push({ tipo: 'subtitulo', texto: t.replace(/\*/g, '') });
      else seccion.bloques.push({ tipo: 'parrafo', texto: t });
      parrafo = [];
    }
    if (lista) { seccion.bloques.push(lista); lista = null; }
    if (tabla) { seccion.bloques.push(tabla); tabla = null; }
  };
  const nuevaSeccion = (s) => { cerrar(); if (seccion.bloques.length) guia.secciones.push(seccion); seccion = { ...s, bloques: [] }; };
  const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  for (const l of lineas) {
    if (/^# /.test(l)) { guia.titulo = l.slice(2).trim(); continue; }
    if (!guia.subtitulo && /^\*[^*].*\*$/.test(l.trim()) && !guia.secciones.length && !seccion.bloques.length) { guia.subtitulo = l.trim().slice(1, -1); continue; }
    if (/^> /.test(l)) { guia.intro = l.slice(2).trim(); continue; }
    if (/^---\s*$/.test(l)) { cerrar(); continue; }
    let m;
    if ((m = l.match(/^## Parte (\d+)\. (.+)$/))) { const n = Number(m[1]); nuevaSeccion({ id: PARTES[n].id, numero: n, titulo: m[2].trim(), corto: PARTES[n].corto }); continue; }
    if (/^## Referencias/.test(l)) { nuevaSeccion({ id: 'referencias', titulo: 'Referencias', corto: 'Referencias' }); continue; }
    if ((m = l.match(/^### (.+)$/))) { cerrar(); seccion.bloques.push({ tipo: 'subtitulo', texto: m[1].trim() }); continue; }
    if (/^\|/.test(l)) {
      if (parrafo.length || lista) { const t = tabla; tabla = null; cerrar(); tabla = t; }
      if (/^\|[\s|:-]+\|$/.test(l.trim())) continue; // separador
      if (!tabla) tabla = { tipo: 'tabla', encabezados: celdas(l), filas: [] };
      else tabla.filas.push(celdas(l));
      continue;
    }
    if ((m = l.match(/^(- |\d+\. )(.+)$/))) {
      const ordenada = /^\d/.test(m[1]);
      if (parrafo.length || tabla) { const li = lista; lista = null; cerrar(); lista = li; }
      if (!lista || lista.ordenada !== ordenada) { if (lista) cerrar(); lista = { tipo: 'lista', ordenada, items: [] }; }
      const item = m[2].trim();
      lista.items.push(item);
      const ref = item.match(/^\[(\d+)\]\s+(.+)$/);
      if (seccion.id === 'referencias' && ref) {
        const url = ref[2].match(/https?:\/\/\S+/)?.[0] ?? null;
        guia.referencias[ref[1]] = { texto: ref[2].replace(/\s*https?:\/\/\S+.*$/, '').replace(/\*/g, '').trim(), url };
      }
      continue;
    }
    if (!l.trim()) { cerrar(); continue; }
    if (lista || tabla) cerrar();
    parrafo.push(l.trim());
  }
  nuevaSeccion({});
  return guia;
}

/** Números [n] citados en la guía que no están en Referencias (debe ser vacío). */
export function citasSinReferencia(guia) {
  const texto = JSON.stringify(guia.secciones.filter((s) => s.id !== 'referencias'));
  return [...new Set([...texto.matchAll(/\[(\d+)\]/g)].map((m) => m[1]))].filter((n) => !guia.referencias[n]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const guia = convertir(readFileSync(MD, 'utf8'));
  const sin = citasSinReferencia(guia);
  if (sin.length) { console.log(`❌ Citas sin referencia: ${sin.join(', ')}`); process.exit(1); }
  const json = `${JSON.stringify(guia, null, 2)}\n`;
  if (process.argv.includes('--revisar')) {
    const actual = readFileSync(JSON_SALIDA, 'utf8').replace(/\r/g, '');
    if (actual !== json) { console.log('❌ public/data/guia_supervivencia.json no coincide con docs/guia_supervivencia.md. Corre: node tools/guia-md-a-json.mjs'); process.exit(1); }
    console.log(`✅ Guía al día: ${guia.secciones.length} secciones, ${Object.keys(guia.referencias).length} referencias`);
  } else {
    writeFileSync(JSON_SALIDA, json);
    console.log(`Guía escrita: ${guia.secciones.length} secciones, ${Object.keys(guia.referencias).length} referencias → public/data/guia_supervivencia.json`);
  }
}
