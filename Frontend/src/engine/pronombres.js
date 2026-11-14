const IDX = { el: 0, ella: 1, elle: 2 };

export function conPronombre(texto, pronombre = 'elle', nombre = '') {
  if (!texto || typeof texto !== 'string') return '';

  const indice = IDX[pronombre] ?? 2;

  return texto
    .replaceAll('{nombre}', nombre)
    .replace(/\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}/g, (_, a, b, c) => {
      return [a, b, c][indice];
    });
}