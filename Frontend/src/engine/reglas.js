// Reglas de las barras y de los finales.
// IMPORTANTE: deben ser idénticas a las de tools/validar.mjs (el simulador del guion).
// Si cambian una regla aquí, cámbienla también allá y corran: node tools/probar-motor.mjs

export const BARRAS = ['oxigeno', 'bateria', 'alimentacion', 'integridad', 'radiacion'];
const limitar = (v) => Math.max(0, Math.min(100, v));

/** Aplica un efecto ({oxigeno:-10, minutos:-15, ...}) y devuelve un estado NUEVO. */
export function aplicarEfecto(estado, efecto = {}, esDecision = false) {
  const s = { ...estado, flags: { ...estado.flags } };
  const mult = {};
  if (s.bateria <= 0) { mult.oxigeno = 2; mult.alimentacion = 2; } // sin batería: sin regulación ni calefacción
  for (const [clave, valor0] of Object.entries(efecto)) {
    let valor = valor0;
    if (valor < 0 && mult[clave]) valor *= mult[clave];
    if (clave === 'minutos') {
      if (valor < 0 && s.alimentacion < 30) valor = Math.round(valor * 1.5); // poca energía: paso lento
      s.minutos += valor;
    } else if (BARRAS.includes(clave)) {
      s[clave] = limitar(s[clave] + valor);
    }
  }
  if (esDecision && s.integridad < 30) s.oxigeno = limitar(s.oxigeno - 10); // fuga por traje dañado
  if (s.alimentacion <= 0) s.flags.rescate = true;
  return s;
}

/** Final malo inmediato (se revisa después de CADA efecto). Devuelve 'malo:causa' o null. */
export function finalInmediato(s) {
  if (s.oxigeno <= 0) return 'malo:oxigeno';
  if (s.integridad <= 0) return 'malo:integridad';
  if (s.radiacion >= 100) return 'malo:radiacion';
  return null;
}

/** Final al volver a la Base (accion "evaluarFinal" del capítulo 10). */
export function finalAlVolver(s) {
  const malo = finalInmediato(s);
  if (malo) return malo;
  if (s.minutos < 0) return 'intermedio:tiempo';
  if (s.flags.rescate) return 'intermedio:rescate';
  if (s.radiacion >= 70) return 'intermedio:radiacion';
  return 'bueno:exito';
}

/** Condiciones de "requiere" y de "ramas[].si". */
export function cumple(cond, s) {
  if (!cond) return true;
  if (cond.flag && !s.flags[cond.flag]) return false;
  if (cond.noFlag && s.flags[cond.noFlag]) return false;
  if (cond.muestrasMin != null && s.muestras.length < cond.muestrasMin) return false;
  if (cond.muestrasMax != null && s.muestras.length > cond.muestrasMax) return false;
  return true;
}

/** Color de una barra según su valor (radiación va al revés). */
export function colorBarra(clave, valor) {
  if (clave === 'radiacion') return valor >= 70 ? 'rojo' : valor >= 40 ? 'amarillo' : 'verde';
  return valor < 25 ? 'rojo' : valor <= 50 ? 'amarillo' : 'verde';
}
