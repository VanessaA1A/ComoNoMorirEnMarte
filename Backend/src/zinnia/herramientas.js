// Herramientas de Zinn-IA. buscar_dato se ejecuta aquí; las otras tres vuelven al frontend como acciones.
// strict + enum: el modelo solo puede pedir ids que existen en el juego.
import { buscar, IDS } from './conocimiento.js';

export const HERRAMIENTAS = [
  {
    name: 'buscar_dato',
    description: 'Busca en los datos verificados del juego (fichas con fuente NASA/USGS, glosario, capas del mapa, lugares, guía de supervivencia y chistes de Marte). Devuelve hasta 3 resultados con id, texto y fuente. Úsala antes de dar cualquier cifra o hecho sobre Marte, sus misiones o el juego, y para buscar un chiste. Para otros temas (ciencia general, la Tierra, matemáticas) no hace falta.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { tema: { type: 'string', description: 'Tema a buscar, en pocas palabras (por ejemplo: "tormentas de polvo", "MOLA", "chiste").' } },
      required: ['tema'],
      additionalProperties: false,
    },
  },
  {
    name: 'abrir_capa',
    description: 'Abre en la pantalla del jugador el mapa de la ruta con una capa: optica (HiRISE), relieve (MOLA, topografía), termico (THEMIS, terreno), minerales (CRISM), radiacion (RAD y REMS) o geologia (mapa geológico USGS-NASA).',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { capa_id: { type: 'string', enum: IDS.capas } },
      required: ['capa_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'mostrar_ficha',
    description: 'Abre en la Guía la ficha de un dato (D01 a D33) para que el jugador vea el texto y la fuente completa.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { ficha_id: { type: 'string', enum: IDS.fichas } },
      required: ['ficha_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'marcar_poi',
    description: 'Marca un lugar en el mapa: una parada de la ruta en el cráter Gale (H, P1–P5, D1, DEP) o un lugar del Mapa de Marte (jezero, olympus, valles, hellas, polos, gediz, airy0 o un aterrizaje como curiosity o perseverance).',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { poi_id: { type: 'string', enum: IDS.pois } },
      required: ['poi_id'],
      additionalProperties: false,
    },
  },
];

const ACCION = { abrir_capa: ['capa_id', IDS.capas], mostrar_ficha: ['ficha_id', IDS.fichas], marcar_poi: ['poi_id', IDS.pois] };

/**
 * Ejecuta una herramienta. Devuelve { resultado (texto para el modelo), accion (para el frontend o null) }.
 * Los ids desconocidos no generan acción.
 */
export function ejecutar(nombre, entrada = {}) {
  if (nombre === 'buscar_dato') {
    const r = buscar(String(entrada.tema ?? '').slice(0, 200));
    return { resultado: r.length ? JSON.stringify(r) : 'Sin resultados en los datos verificados.', accion: null };
  }
  const def = ACCION[nombre];
  if (!def) return { resultado: 'Herramienta desconocida.', accion: null, error: true };
  const [campo, validos] = def;
  const id = entrada[campo];
  if (!validos.includes(id)) return { resultado: `El id "${String(id).slice(0, 30)}" no existe en el juego.`, accion: null, error: true };
  return { resultado: `Listo: ${nombre} ${id} se abrió en la pantalla del jugador.`, accion: { tipo: nombre, id } };
}
