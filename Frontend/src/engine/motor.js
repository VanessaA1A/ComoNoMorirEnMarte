// Navegación del guion. Funciones puras: reciben un estado y devuelven uno nuevo.
// El orden de reglas es el mismo de tools/validar.mjs.
import { ESCENAS, FINAL_POR_CAUSA, INDEX, inicioCapitulo } from './guion.js';
import { aplicarEfecto, finalInmediato, finalAlVolver, cumple } from './reglas.js';

export function estadoInicial() {
  return {
    ...INDEX.estadoInicial,
    nombre: '',
    pronombre: 'el',
    capitulo: 1,
    escena: inicioCapitulo(1),
    muestras: [],
    flags: {},
    fichas: [],
    hud: false,
    final: null,       // { final, causa } cuando termina la partida
    decisiones: [],    // historial corto de decisiones: { escena, opcion }
  };
}

export const escena = (id) => ESCENAS.get(id);

/** Líneas visibles de una escena (filtra "requiere"). */
export function lineasVisibles(esc, estado) {
  return (esc.lineas || []).filter((l) => cumple(l.requiere, estado));
}

/** Opciones visibles de una escena (filtra "requiere"). */
export function opcionesVisibles(esc, estado) {
  return (esc.opciones || []).filter((o) => cumple(o.requiere, estado));
}

function irAFinal(estado, codigo) {
  const id = FINAL_POR_CAUSA.get(codigo);
  const [final, causa] = codigo.split(':');
  return { ...estado, escena: id, final: { final, causa } };
}

/**
 * Entra a una escena: aplica su "efecto", revisa el final malo y salta sola
 * las escenas de paso (sin líneas ni opciones). Devuelve { estado, cambioCapitulo }.
 * cambioCapitulo = número de capítulo nuevo si se cruzó a otro capítulo.
 */
export function entrar(estado, id) {
  let s = { ...estado };
  let cambioCapitulo = null;
  for (let guardia = 0; guardia < 50; guardia++) {
    const esc = ESCENAS.get(id);
    if (!esc) throw new Error(`Escena no encontrada: ${id}`);
    if (esc.capitulo !== s.capitulo && !esc.esFinal) { cambioCapitulo = esc.capitulo; s.capitulo = esc.capitulo; }
    s.escena = id;
    if (esc.esFinal) return { estado: s, cambioCapitulo };
    if (esc.efecto) {
      s = aplicarEfecto(s, esc.efecto);
      const malo = finalInmediato(s);
      if (malo) return { estado: irAFinal(s, malo), cambioCapitulo };
    }
    if (esc.accion === 'mostrarHUD') s.hud = true;
    // Escena de paso: sin líneas visibles y sin opciones -> seguir sola.
    const hayLineas = lineasVisibles(esc, s).length > 0;
    if (!hayLineas && !esc.opciones && esc.accion !== 'evaluarFinal' && esc.accion !== 'pedirNombre') {
      id = siguienteId(esc, s);
      continue;
    }
    return { estado: s, cambioCapitulo };
  }
  throw new Error('Demasiados saltos seguidos: revisa el guion');
}

/** A dónde va una escena sin opciones cuando terminan sus líneas. */
function siguienteId(esc, s) {
  const rama = (esc.ramas || []).find((r) => cumple(r.si, s));
  if (rama) return rama.ir;
  if (esc.siguienteCapitulo) return inicioCapitulo(esc.siguienteCapitulo);
  return esc.ir;
}

/** Terminaron las líneas de una escena sin opciones: avanzar. */
export function continuar(estado) {
  const esc = ESCENAS.get(estado.escena);
  if (esc.accion === 'evaluarFinal') return { estado: irAFinal(estado, finalAlVolver(estado)), cambioCapitulo: null };
  return entrar(estado, siguienteId(esc, estado));
}

/**
 * Elegir una opción. azar() devuelve un número entre 0 y 1 (Math.random por defecto).
 * modoDemo = true hace que toda probabilidad salga bien (para la presentación).
 */
export function elegir(estado, opcion, { azar = Math.random, modoDemo = false } = {}) {
  let s = aplicarEfecto(estado, opcion.efecto, true);
  if (opcion.marca) s.flags[opcion.marca] = true;
  if (opcion.muestra) s.muestras = [...s.muestras, opcion.muestra];
  if (opcion.pronombre) s.pronombre = opcion.pronombre;
  s.decisiones = [...(s.decisiones || []), { escena: estado.escena, opcion: opcion.texto }].slice(-30);
  const malo = finalInmediato(s);
  if (malo) return { estado: irAFinal(s, malo), cambioCapitulo: null };
  let destino = opcion.ir;
  if (opcion.probabilidad && !modoDemo && azar() >= opcion.probabilidad.exito) destino = opcion.probabilidad.ir_fallo;
  return entrar(s, destino);
}

/** Nueva partida: entra a la primera escena. */
export function nuevaPartida() {
  return entrar(estadoInicial(), inicioCapitulo(1)).estado;
}
