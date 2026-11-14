# Cómo no morir en Marte — frontend

Novela visual en React + Vite (JavaScript). El juego funciona **sin backend y sin imágenes**: guarda en el navegador y dibuja respaldos mientras no existan los fondos, sprites y capas.

## Correr en local (Node 20+)

```bash
cd Frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run probar       # motor vs simulador (154.197 rutas) + pruebas de Zinn-IA
npm run assets       # regenera tools/assets-pendientes.md (lista para Valeria)
```

Para validar el guion a mano: `node tools/validar.mjs src/data/capitulos`.

## Variables de entorno

Copia `.env.example` como `.env`:

```
VITE_API_URL=http://localhost:3001/api
```

- Con `VITE_API_URL`: se guarda también en la API (`Backend/`), se registran decisiones, finales y fichas, y si la conexión se cae aparece el aviso de Zinn-IA "Perdimos la señal con la Tierra". Lo que no se pudo enviar queda en una cola y se reenvía al volver la conexión.
- Sin `VITE_API_URL`: el juego es 100 % local y **no** muestra el aviso de sin conexión.

## Modo demo

Agrega `?demo=1` a la URL (`http://localhost:5173/?demo=1`): las decisiones con riesgo siempre salen bien, para que la presentación al jurado salga como se ensayó. Aparece la etiqueta "MODO DEMO" arriba.

## Despliegue en Vercel

1. New Project → importar el repo.
2. **Root Directory:** `Frontend` · Framework: Vite (build `npm run build`, salida `dist`).
3. **Environment Variables:** `VITE_API_URL=https://<tu-api>.onrender.com/api`.
4. En el backend (Render), agrega la URL de Vercel a `CORS_ORIGIN`.

## Estructura

| Carpeta | Qué hay |
| --- | --- |
| `src/engine/` | Motor del juego (reglas, finales, navegación). **No tocar** sin correr `npm run probar` |
| `src/data/capitulos/` | Guion: `index.json`, `cap01…cap10.json`, `finales.json` |
| `src/data/` | `datos.json` (D01–D28), `capas.json`, `pois.json` (provisionales), `marte.json`, `glosario.json`, `tutorial.json`, `pistas.json`, `zinnia_respuestas.json`. Los tres primeros también los carga el seed del backend |
| `src/juego/` | Estado de la interfaz, guardado (localStorage), fichas, tutorial y lecturas de Zinn-IA |
| `src/componentes/` | Pantallas, mapas SVG, HUD, Guía, panel de Zinn-IA |
| `public/img/` | Imágenes: `fondos/`, `personajes/`, `capas/`, `mapa_marte_mola.jpg`, `zinnia_sin_conexion.gif` |
| `tools/` | `validar.mjs`, `probar-motor.mjs`, `probar-zinnia.mjs`, `assets-pendientes.mjs` |

## Imágenes

Ver `tools/assets-pendientes.md`. Basta con subir el archivo con el nombre exacto a `public/img/...`: el componente `Recurso` lo usa solo y, si no existe, muestra el respaldo (degradado, silueta del astronauta, logo de Zinn-IA con efectos, mapa esquemático).

## Datos pendientes de verificar (Sefora)

- `datos.json`: las fuentes que dicen "(enlace pendiente)" necesitan su URL; todos los datos tienen `verificado: false`.
- `pois.json`: coordenadas `x, y` provisionales en un lienzo de 1000×700; reemplazarlas por las medidas en Mars Trek sobre la imagen base.
- `marte.json`: Viking 2, Perseverance, Zhurong y los destinos están `"aproximado": true`.
