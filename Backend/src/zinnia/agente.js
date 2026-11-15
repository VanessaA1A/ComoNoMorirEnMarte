// Agente Zinn-IA: bucle de tool use de máximo 3 vueltas. Devuelve { texto, acciones[], herramientas[], tokens }.
// No guarda ni registra el texto de los mensajes (privacidad 13+).
import Anthropic from '@anthropic-ai/sdk';
import { personaje, contexto } from './personaje.js';
import { HERRAMIENTAS, ejecutar } from './herramientas.js';

export const MODELO = process.env.ZINNIA_MODEL || 'claude-haiku-5-5';
const MAX_TOKENS = 400;
const VUELTAS = 3;
const LIMITE_MS = 15000;

export const hayIA = () => Boolean(process.env.ANTHROPIC_API_KEY);
let cliente = null;
const clienteIA = () => (cliente ??= new Anthropic({ maxRetries: 0 })); // la key sale de ANTHROPIC_API_KEY

/** [{rol, texto}] -> mensajes de la API: empieza y termina en el usuario; turnos seguidos del mismo rol se unen. */
export function aMensajes(mensajes) {
  const salida = [];
  for (const m of mensajes) {
    const role = m.rol === 'zinnia' ? 'assistant' : 'user';
    if (!salida.length && role === 'assistant') continue;
    const ultimo = salida.at(-1);
    if (ultimo?.role === role) ultimo.content += `\n${m.texto}`;
    else salida.push({ role, content: m.texto });
  }
  while (salida.at(-1)?.role === 'assistant') salida.pop();
  return salida;
}

const SIN_EMOJIS = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const textoDe = (r) => r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').replace(SIN_EMOJIS, '').trim();

/** Error con .sinIA = true: la ruta responde 503 { modo: 'sin_ia' } y el frontend usa el respaldo. */
const sinIA = (motivo) => Object.assign(new Error(motivo), { sinIA: true, motivo });

export async function conversar({ mensajes, contexto: c = {} }) {
  if (!hayIA()) throw sinIA('sin_key');
  const historial = aMensajes(mensajes);
  if (!historial.length) throw Object.assign(new Error('Falta un mensaje del usuario'), { status: 400 });

  const system = [{ type: 'text', text: personaje(c) }, { type: 'text', text: contexto(c) }];
  const inicio = Date.now();
  const acciones = [];
  const herramientas = [];
  const tokens = { entrada: 0, salida: 0 };
  const textos = [];

  for (let vuelta = 1; vuelta <= VUELTAS; vuelta++) {
    const resta = LIMITE_MS - (Date.now() - inicio);
    if (resta < 500) throw sinIA('timeout');
    let r;
    try {
      r = await clienteIA().messages.create({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        // Respuestas cortas de chat: sin razonamiento extendido y esfuerzo bajo (Haiku 5.5 lo acepta con effort <= high)
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system,
        tools: HERRAMIENTAS,
        messages: historial,
      }, { timeout: resta });
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) throw sinIA('timeout');
      if (err instanceof Anthropic.RateLimitError) throw sinIA('limite_api');
      if (err instanceof Anthropic.APIConnectionError) throw sinIA('conexion');
      if (err instanceof Anthropic.APIError) throw sinIA(`api_${err.status ?? 'error'}_${err.type ?? ''}`);
      throw err;
    }
    tokens.entrada += r.usage?.input_tokens ?? 0;
    tokens.salida += r.usage?.output_tokens ?? 0;
    const t = textoDe(r);
    if (t) textos.push(t);

    if (r.stop_reason === 'refusal') {
      return { texto: 'Mmm, de eso no puedo hablar. ¿Volvemos a Marte? Puedo contarte de las capas del mapa o de los peligros reales.', acciones, herramientas, tokens };
    }
    if (r.stop_reason !== 'tool_use') break;

    // Ejecutar TODAS las herramientas pedidas y devolver todos los resultados en un solo mensaje
    const usos = r.content.filter((b) => b.type === 'tool_use');
    historial.push({ role: 'assistant', content: r.content });
    const resultados = usos.map((u) => {
      herramientas.push(u.name);
      const { resultado, accion, error } = ejecutar(u.name, u.input);
      if (accion && !acciones.some((a) => a.tipo === accion.tipo && a.id === accion.id)) acciones.push(accion);
      return { type: 'tool_result', tool_use_id: u.id, content: resultado, ...(error ? { is_error: true } : {}) };
    });
    historial.push({ role: 'user', content: resultados });
  }

  const texto = textos.at(-1) || (acciones.length ? '¡Listo! Te lo abrí en la pantalla.' : '');
  if (!texto) throw sinIA('sin_texto');
  return { texto, acciones, herramientas, tokens };
}
