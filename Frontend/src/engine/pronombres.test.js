import { conPronombre } from './pronombres.js';

const pruebas = [
  {
    entrada: '¿Estás list{o|a|e}, {nombre}?',
    pronombre: 'el',
    nombre: 'Moisés',
    esperado: '¿Estás listo, Moisés?'
  },
  {
    entrada: 'Desde hoy eres {el|la|le} {primer|primera|primere} habitante de Marte.',
    pronombre: 'ella',
    nombre: 'Kelly',
    esperado: 'Desde hoy eres la primera habitante de Marte.'
  },
  {
    entrada: 'Tranquil{o|a|e}, {nombre}: volveremos viv{o|a|e}.',
    pronombre: 'elle',
    nombre: 'Alex',
    esperado: 'Tranquile, Alex: volveremos vive.'
  }
];

pruebas.forEach((p, idx) => {
  const salida = conPronombre(p.entrada, p.pronombre, p.nombre);
  if (salida !== p.esperado) {
    console.error(`❌ Error en prueba ${idx + 1}: esperaba "${p.esperado}" y salió "${salida}"`);
    process.exit(1);
  }
  console.log(`✅ Prueba ${idx + 1} pasada: ${salida}`);
});