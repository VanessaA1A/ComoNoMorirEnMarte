import { z } from 'zod';

// Mensajes de zod en español
const TIPOS = {
  string: 'texto', number: 'un número', integer: 'un número entero',
  object: 'un objeto', array: 'una lista', boolean: 'verdadero o falso',
};
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' ? 'es obligatorio' : `debe ser ${TIPOS[issue.expected] ?? issue.expected}` };
    case 'too_small':
      if (issue.type === 'string') return { message: issue.minimum === 1 ? 'no puede estar vacío' : `debe tener al menos ${issue.minimum} caracteres` };
      return { message: `debe ser como mínimo ${issue.minimum}` };
    case 'too_big':
      return { message: issue.type === 'string' ? `debe tener como máximo ${issue.maximum} caracteres`
        : issue.type === 'array' ? `admite como máximo ${issue.maximum} elementos` : `debe ser como máximo ${issue.maximum}` };
    case 'invalid_enum_value':
      return { message: `debe ser uno de: ${issue.options.join(', ')}` };
    case 'invalid_string':
      return { message: issue.validation === 'uuid' ? 'debe ser un UUID válido' : 'tiene un formato no válido' };
    default:
      return { message: ctx.defaultError };
  }
});

const entero = (min, max) => z.coerce.number().int().min(min).max(max);
const barra = z.number().int().min(0).max(100);
const texto = (max) => z.string().trim().min(1).max(max);

export const playerId = z.string().uuid();
export const paramsJugador = z.object({ playerId });
export const paramsRanura = z.object({ playerId, slot: entero(0, 3) });

export const barras = z.object({
  oxigeno: barra, bateria: barra, alimentacion: barra, integridad: barra, radiacion: barra,
});

export const nuevoJugador = z.object({
  nombre: texto(30),
  pronombre: z.enum(['el', 'ella', 'elle']),
});

// Campos extra (nombre, slot, historial...) se descartan: no se guardan
export const partida = z.object({
  capitulo: z.number().int().min(1).max(10),
  escena: texto(60),
  barras,
  minutos: z.number().int().min(-1000).max(1000),
  muestras: z.array(texto(20)).max(10).default([]),
  flags: z.record(z.union([z.boolean(), z.number(), z.string().max(60)])).default({}),
  fichas: z.array(texto(20)).max(100).default([]),
});

export const decision = z.object({
  playerId,
  capitulo: z.number().int().min(1).max(10),
  escena: texto(60),
  opcion: texto(200),
  barras,
});

const CAUSAS = {
  bueno: ['exito'],
  intermedio: ['tiempo', 'rescate', 'radiacion'],
  malo: ['oxigeno', 'integridad', 'radiacion'],
};
export const final = z.object({
  playerId,
  final: z.enum(['bueno', 'intermedio', 'malo']),
  causa: z.enum(['exito', 'tiempo', 'rescate', 'radiacion', 'oxigeno', 'integridad']),
  barras,
  muestras: z.number().int().min(0).max(3),
}).refine((f) => CAUSAS[f.final].includes(f.causa), {
  path: ['causa'], message: 'no corresponde al final indicado',
});

export const nuevaFicha = z.object({ datoId: texto(20) });

// Chat con Zinn-IA: se usan solo los últimos 12 mensajes; el texto NO se guarda
export const chatZinnia = z.object({
  playerId: playerId.optional(),
  mensajes: z.array(z.object({
    rol: z.enum(['usuario', 'zinnia']),
    texto: texto(500),
  })).min(1).max(12),
  contexto: z.object({
    capitulo: z.number().int().min(1).max(10).nullable(),
    escenaId: z.string().trim().max(60).nullable(),
    nombre: z.string().trim().max(30).nullable(),
    pronombre: z.enum(['el', 'ella', 'elle']).nullable(),
    oxigeno: barra.nullable(),
    alimentacion: barra.nullable(),
    bateria: barra.nullable(),
    integridad: barra.nullable(),
    radiacion: barra.nullable(),
    minutos: z.number().int().min(-1000).max(1000).nullable(),
    muestras: z.number().int().min(0).max(10).nullable(),
    fichasDesbloqueadas: z.array(texto(20)).max(100),
  }).partial().default({}),
}).refine((c) => c.mensajes.at(-1).rol === 'usuario', { path: ['mensajes'], message: 'el último mensaje debe ser del usuario' });
export const filtroDatos = z.object({ uso: z.enum(['Z', 'C', 'F']).optional() });
