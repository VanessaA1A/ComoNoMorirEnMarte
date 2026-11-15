// Conocimiento verificado de Zinn-IA: los MISMOS archivos que usa el juego (una sola fuente).
// buscar(tema) devuelve los 3 resultados más relevantes, sin acentos y en minúsculas.
import { readFileSync, existsSync } from 'node:fs';
import { fragmentosGuia } from '../../../Frontend/src/juego/guiaConocimiento.js';

const DATA = new URL('../../../Frontend/src/data/', import.meta.url);
const PUBLICO = new URL('../../../Frontend/public/data/', import.meta.url);

function leer(base, archivo, defecto = []) {
  const url = new URL(archivo, base);
  if (!existsSync(url)) { console.warn(`[zinnia] no encontré ${archivo}; sigo sin él`); return defecto; }
  return JSON.parse(readFileSync(url, 'utf8'));
}

export const DATOS = leer(DATA, 'datos.json');
export const GLOSARIO = leer(DATA, 'glosario.json');
export const CAPAS = leer(DATA, 'capas.json');
export const POIS = leer(DATA, 'pois.json');
export const RECURSOS = leer(DATA, 'recursos_nasa.json');
export const CHISTES = leer(DATA, 'chistes.json');
export const MARTE = leer(DATA, 'marte.json', { aterrizajes: [], destinos: [] });
export const GUIA = leer(PUBLICO, 'guia_supervivencia.json', { secciones: [] });

const fuenteDe = (idDato) => DATOS.find((d) => d.id === idDato)?.fuente ?? null;
const limpiar = (t) => String(t ?? '').replace(/\*\*?/g, '').replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, '$1/$2/$3');

/** Ids válidos para las acciones del frontend (las herramientas solo aceptan estos). */
export const IDS = {
  capas: CAPAS.map((c) => c.id),
  fichas: DATOS.map((d) => d.id),
  pois: [...POIS.map((p) => p.id), ...MARTE.destinos.map((d) => d.id), ...MARTE.aterrizajes.map((a) => a.id)],
};

/** Todas las entradas buscables: { id, tipo, titulo, texto, fuente } */
export const ENTRADAS = [
  ...DATOS.map((d) => ({ id: d.id, tipo: 'ficha', titulo: d.id, texto: d.texto, fuente: d.fuente })),
  ...GLOSARIO.map((g) => ({ id: `glosario:${g.termino}`, tipo: 'glosario', titulo: g.termino, texto: `${g.termino}: ${g.definicion}`, fuente: 'Glosario del juego' })),
  ...CAPAS.map((c) => ({
    id: `capa:${c.id}`, tipo: 'capa', titulo: c.nombre,
    texto: `Capa ${c.etiqueta ?? c.nombre} (${c.nombre}): ${c.descripcion} Misión: ${c.mision}. Instrumento: ${c.instrumento}. Limitación: ${c.limitacion}`,
    fuente: c.fuente,
  })),
  ...POIS.map((p) => ({ id: `poi:${p.id}`, tipo: 'poi', titulo: p.nombre, texto: `${p.nombre} (parada de la ruta en el cráter Gale): ${p.dato ?? ''}. ${p.nota ?? ''} Misión: ${p.mision ?? ''}`, fuente: p.fuente })),
  ...MARTE.destinos.map((d) => ({ id: `poi:${d.id}`, tipo: 'lugar', titulo: d.nombre, texto: `${d.nombre} (Mapa de Marte): ${d.dato}`, fuente: fuenteDe(d.ficha) })),
  ...MARTE.aterrizajes.map((a) => ({ id: `poi:${a.id}`, tipo: 'aterrizaje', titulo: a.mision, texto: `${a.mision} aterrizó en ${a.lugar} en ${a.anio}. ${a.dato}`, fuente: a.galeria ?? null })),
  ...RECURSOS.map((r) => ({ id: `recurso:${r.id}`, tipo: 'recurso', titulo: r.nombre, texto: `${r.nombre}: ${r.que_es}`, fuente: r.url })),
  ...CHISTES.map((c) => ({ id: c.id, tipo: 'chiste', titulo: 'chiste', texto: c.texto, fuente: c.dato ? fuenteDe(c.dato) : null, ficha: c.dato })),
  // Guía de supervivencia (docs/guia_supervivencia.md): cada fragmento con su sección y la URL de su cita [n]
  ...fragmentosGuia(GUIA).map((f) => ({
    id: f.id, tipo: 'guia', titulo: f.subtitulo ? `${f.parte} · ${f.subtitulo}` : f.parte, texto: limpiar(f.texto),
    fuente: f.fuente ?? `Guía de supervivencia, ${f.parte}`,
  })),
];

const VACIAS = new Set(('a al como con cual cuales cuando de del donde el en es esta este esto fue ha hay la las le les lo los mas me mi muy no o para pero por que se si sin sobre su sus te tu un una uno y ya yo cuanto cuanta cuantos cuantas quien quienes dime sabes puedes explica explicame cuentame quiero saber marte'
  + ' the a an of in on is are what how why does do tell me about mars').split(' '));
export const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const raiz = (p) => (p.length > 5 ? p.replace(/(es|s)$/, '') : p);
// Sinónimos (y algo de inglés) -> palabras que sí aparecen en los datos del juego
const SINONIMOS = {
  topografia: 'relieve elevacion altura mola', topografica: 'relieve elevacion mola', altura: 'relieve elevacion', montana: 'relieve mount sharp',
  geologica: 'geologia geologico roca', geologico: 'geologia roca', termica: 'terreno themis inercia', mineral: 'minerales crism',
  aire: 'atmosfera oxigeno presion', respirar: 'oxigeno atmosfera',
  day: 'dia sol', days: 'dia sol', long: 'dura', dust: 'polvo', storm: 'tormenta', radiation: 'radiacion', water: 'agua', life: 'vida biofirma',
  map: 'mapa capa', layer: 'capa', where: 'donde', gravity: 'gravedad', moon: 'luna', moons: 'luna fobos deimos', cold: 'frio temperatura',
  temperature: 'temperatura frio', rover: 'rover curiosity perseverance', volcano: 'volcan olympus', crater: 'crater', ice: 'hielo polo',
  frio: 'frio temperatura', vida: 'vida biofirma', distancia: 'distancia senal minutos', senal: 'senal radio distancia',
};
const palabras = (t) => normalizar(t).split(/[^a-z0-9]+/).filter((p) => p.length > 1 && !VACIAS.has(p))
  .flatMap((p) => [p, ...(SINONIMOS[p] ?? SINONIMOS[raiz(p)] ?? '').split(' ').filter(Boolean)]).map(raiz);
const prefijoComun = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const parecidas = (a, b) => a.length > 4 && b.length > 4 && prefijoComun(a, b) >= Math.max(5, Math.ceil(Math.min(a.length, b.length) * 0.75));
const mezclar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

const INDICE = ENTRADAS.map((e) => ({ e, bolsa: new Set(palabras(`${e.titulo} ${e.texto}`)), titulo: new Set(palabras(e.titulo)) }));

/** Los 3 resultados más relevantes para `tema` (ids de ficha, términos del glosario, capas, lugares, guía, chistes). */
export function buscar(tema, n = 3) {
  const consulta = [...new Set(palabras(tema))];
  if (!consulta.length) return [];
  const pedirChiste = consulta.some((p) => /^(chiste|broma|joke)/.test(p));
  if (pedirChiste) { // chistes al azar: "otro chiste" no repite siempre el mismo
    return mezclar(ENTRADAS.filter((e) => e.tipo === 'chiste')).slice(0, n)
      .map((e) => ({ id: e.id, texto: e.texto, fuente: e.fuente ?? 'Chistes de Zinn-IA', ...(e.ficha ? { ficha: e.ficha } : {}) }));
  }
  return INDICE
    .map(({ e, bolsa, titulo }) => {
      let puntos = 0;
      for (const p of consulta) {
        if (bolsa.has(p)) puntos += 2;
        else if ([...bolsa].some((b) => parecidas(b, p))) puntos += 1;
        if (titulo.has(p)) puntos += 2;
      }
      if (e.tipo === 'ficha') puntos += 0.5; // las fichas tienen fuente propia: van primero si empatan
      if (e.tipo === 'chiste') puntos = pedirChiste ? puntos + 3 : puntos - 3;
      return { e, puntos };
    })
    .filter((r) => r.puntos > 1)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, n)
    .map(({ e }) => ({ id: e.id, texto: e.texto, fuente: e.fuente ?? 'Datos del juego', ...(e.ficha ? { ficha: e.ficha } : {}) }));
}
