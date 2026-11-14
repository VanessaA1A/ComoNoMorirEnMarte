// Acceso seguro a localStorage (puede fallar en modo privado o con el almacenamiento lleno).
const PREFIJO = 'cnmm_';

export function leer(clave, defecto = null) {
  try {
    const v = globalThis.localStorage?.getItem(PREFIJO + clave);
    return v == null ? defecto : JSON.parse(v);
  } catch {
    return defecto;
  }
}

export function escribir(clave, valor) {
  try {
    globalThis.localStorage?.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch { /* sin almacenamiento: el juego sigue, solo no guarda */ }
}

export function borrar(clave) {
  try { globalThis.localStorage?.removeItem(PREFIJO + clave); } catch { /* nada */ }
}
