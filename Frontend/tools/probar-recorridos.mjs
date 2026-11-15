// Juega los 3 recorridos oficiales con el motor real (src/engine/motor.js), forzando el azar donde
// el recorrido lo indica, y compara las barras finales: O2 · Batería · Alimentación · Integridad · Radiación · Reloj.
// Si algo no coincide NO se toca el guion ni las reglas: se muestra la diferencia paso a paso.
// Uso: node tools/probar-recorridos.mjs
import { nuevaPartida, escena, opcionesVisibles, continuar, elegir } from '../src/engine/motor.js';

// Decisión por escena: texto (o comienzo del texto) de la opción a elegir; azar: 'exito' | 'fallo'
const RECORRIDOS = [
  {
    nombre: 'A · La científica cuidadosa', jugador: 'Ana',
    decisiones: {
      c01_02: 'Ella', c01_05: 'Comer normal', c02_03: 'Ir al refugio', c03_04: 'Kit de reparación',
      c04_02: 'Sí, revisar', c05_02: 'La roca que marca CRISM', c06_01: 'Camino largo',
      c07_02: 'Ir al depósito', c07_04: 'Sí, tomar muestra', c08_01: 'Rodear', c08_kit: 'Guardarlo',
      c08_04: 'Sí, tomar muestra', c09_03: 'Regresar a la base ya',
    },
    azar: {},
    esperado: { barras: [46, 57, 59, 100, 30, 5], final: 'bueno:exito', muestras: 3 },
  },
  {
    nombre: 'B · El temerario', jugador: 'Beto',
    decisiones: {
      c01_02: 'Él', c01_05: 'Racionar', c02_03: 'Seguir ordenando', c03_04: 'Batería de repuesto',
      c04_02: 'No, sigamos', c05_02: 'Ninguna', c06_01: 'Atajo', c06_04: 'No tengo hambre',
      c07_02: 'No hay tiempo', c07_04: 'No, seguir', c08_01: 'Bajar de frente', c08_04: 'No, ya es hora',
      c09_03: 'Subir al mirador alto',
    },
    azar: { c06_01: 'fallo', c08_01: 'fallo' },
    esperado: { barras: null, final: 'malo:oxigeno', oxigeno: 0 },
  },
  {
    nombre: 'C · Le curiose', jugador: 'Cris',
    decisiones: {
      c01_02: 'Elle', c01_05: 'Comer normal', c02_03: 'Ir al refugio', c03_04: 'Raciones extra',
      c04_02: 'Sí, revisar', c05_02: 'La roca que marca CRISM', c06_01: 'Atajo',
      c07_02: 'Ir al depósito', c07_04: 'Sí, tomar muestra', c08_01: 'Rodear', c08_04: 'Sí, tomar muestra',
      c09_03: 'Subir al mirador alto', c09_rac: 'Comer las raciones',
    },
    azar: { c06_01: 'exito', c09_03: 'exito' },
    esperado: { barras: [22, 49, 74, 85, 69, -20], final: 'intermedio:tiempo' },
  },
];

const barras = (s) => [s.oxigeno, s.bateria, s.alimentacion, s.integridad, s.radiacion, s.minutos];
const fmt = (b) => b.map((v, i) => (i === 5 ? `${v} min` : v)).join(' · ');
let fallos = 0;

for (const r of RECORRIDOS) {
  let s = { ...nuevaPartida(), nombre: r.jugador };
  const pasos = [];
  const problemas = [];
  const visitadas = [];
  let antesCancion = null;
  let clicsCancion = 0;
  for (let i = 0; i < 300 && !s.final; i++) {
    const id = s.escena;
    visitadas.push(id);
    // Canción del cap. 1: un clic por verso (botón de una sola respuesta) y esperarGuia (abrir la Guía o "La abro después")
    if (id === 'c01_04') { antesCancion = barras(s).join(); clicsCancion += escena(id).lineas.filter((l) => l.respuesta).length; }
    if (escena(id).accion === 'esperarGuia') clicsCancion += 1;
    const ops = opcionesVisibles(escena(id), s);
    if (!ops.length) {
      s = continuar(s).estado;
      if (id === 'c01_04c' && barras(s).join() !== antesCancion) problemas.push(`La canción cambió las barras: ${antesCancion} → ${barras(s).join()}`);
      continue;
    }
    const quiero = r.decisiones[id];
    const op = quiero && ops.find((o) => o.texto.startsWith(quiero));
    if (!op) { problemas.push(`En ${id} el recorrido no dice qué elegir (opciones: ${ops.map((o) => o.texto).join(' / ')})`); break; }
    let tiroAzar = false;
    const forzado = r.azar[id];
    const azar = () => {
      tiroAzar = true;
      if (!forzado) problemas.push(`En ${id} se tiró el azar y el recorrido no indica el resultado (se usó "sale bien")`);
      return forzado === 'fallo' ? 0.999999 : 0;
    };
    s = elegir(s, op, { azar }).estado;
    pasos.push(`${id.padEnd(8)} → ${op.texto.slice(0, 42).padEnd(42)}${tiroAzar ? ` [azar: ${forzado ?? 'sin indicar'}]` : ''}  ⇒ ${fmt(barras(s))}`);
  }
  const final = s.final ? `${s.final.final}:${s.final.causa}` : '(sin final)';
  const iC = visitadas.indexOf('c01_05');
  if (!['c01_04', 'c01_04b', 'c01_04c'].every((x) => visitadas.includes(x))) problemas.push('El recorrido no pasó por la canción (c01_04 → c01_04b → c01_04c)');
  if (clicsCancion !== 8) problemas.push(`La canción debería pedir 8 clics (7 versos + esperarGuia) y pidió ${clicsCancion}`);
  if (iC < 0) problemas.push('El recorrido no llegó a c01_05');
  const e = r.esperado;
  if (e.barras && JSON.stringify(barras(s)) !== JSON.stringify(e.barras)) problemas.push(`Barras: esperado ${fmt(e.barras)} · obtenido ${fmt(barras(s))}`);
  if (final !== e.final) problemas.push(`Final: esperado ${e.final} · obtenido ${final}`);
  if (e.muestras != null && s.muestras.length !== e.muestras) problemas.push(`Muestras: esperado ${e.muestras} · obtenido ${s.muestras.length}`);
  if (e.oxigeno != null && s.oxigeno !== e.oxigeno) problemas.push(`O2: esperado ${e.oxigeno} · obtenido ${s.oxigeno}`);
  for (const [id] of Object.entries(r.azar)) if (!pasos.some((p) => p.startsWith(id) && p.includes('[azar'))) problemas.push(`El azar de ${id} nunca se tiró (el recorrido terminó antes o la opción no tiene riesgo)`);

  console.log(`\n${problemas.length ? '✗' : '✓'} ${r.nombre}: ${final} · ${fmt(barras(s))} · muestras ${s.muestras.length} · pronombre ${s.pronombre} · canción: ${clicsCancion} clics`);
  if (problemas.length) {
    fallos++;
    problemas.forEach((p) => console.log(`   DIFERENCIA: ${p}`));
    console.log('   Paso a paso (barras después de cada decisión: O2 · Batería · Alimentación · Integridad · Radiación · Reloj):');
    pasos.forEach((p) => console.log(`     ${p}`));
  }
}

if (fallos) { console.log(`\n❌ ${fallos} recorrido(s) no coinciden con lo esperado (no se cambió el guion ni las reglas)`); process.exit(1); }
console.log('\n✅ Los 3 recorridos oficiales dan exactamente las barras y el final esperados');
