// Acceso seguro a localStorage. Puede fallar en modo privado, con el almacenamiento bloqueado
// o con la cuota llena: el juego NUNCA se rompe por eso, solo avisa (una vez) y sigue en memoria.
const PREFIJO = 'cnmm_';
const oyentesFallo = new Set();
let yaAviso = false;

/** Registra una función que se llama la PRIMERA vez que el almacenamiento falla. */
export function alFallarAlmacen(f) {
  oyentesFallo.add(f);
  return () => oyentesFallo.delete(f);
}

function avisarFallo(err) {
  if (yaAviso) return;
  yaAviso = true;
  oyentesFallo.forEach((f) => f(err));
}

export function leer(clave, defecto = null) {
  try {
    const v = globalThis.localStorage?.getItem(PREFIJO + clave);
    return v == null ? defecto : JSON.parse(v);
  } catch {
    return defecto; // dato corrupto o almacenamiento bloqueado: se usa el valor por defecto
  }
}

/** Devuelve true si se guardó y false si el navegador no lo permitió. */
export function escribir(clave, valor) {
  try {
    if (!globalThis.localStorage) throw new Error('localStorage no disponible');
    globalThis.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    return true;
  } catch (err) {
    avisarFallo(err);
    return false;
  }
}

export function borrar(clave) {
  try { globalThis.localStorage?.removeItem(PREFIJO + clave); } catch { /* nada que hacer */ }
}

/** Solo para pruebas: vuelve a permitir el aviso. */
export const _reiniciarAviso = () => { yaAviso = false; };
