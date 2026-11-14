# API — Cómo no morir en Marte

Express 5 + PostgreSQL (Neon). El juego funciona sin esta API; aquí solo están el guardado en la nube, el catálogo científico y las estadísticas.

## 1. Instalar (Node 20.6 o más reciente)

```bash
cd Backend
npm install
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
```

## 2. Crear la base en Neon

1. Entra a <https://neon.tech>, crea un proyecto (plan gratis) y la región más cercana (us-east).
2. En **Connection string** copia la URL que empieza con `postgresql://` y termina en `?sslmode=require`.
3. Pégala en `DATABASE_URL` dentro de `.env`. **Nunca subas el `.env` al repo** (`.gitignore` ya lo excluye); compártela por privado.
4. Si al conectar aparece un error de autenticación, SCRAM o *channel binding*, quita solo `&channel_binding=require` del final de la URL.

## 3. Crear tablas y cargar datos

```bash
npm run db:schema   # crea las tablas (se puede repetir sin problema)
npm run db:seed     # carga Frontend/src/data/capas.json, pois.json y datos.json (los que existan)
```

Cuando Sefora corrija los JSON, vuelve a correr `npm run db:seed`: actualiza sin duplicar (UPSERT en una sola transacción; si una fila falla, no se guarda nada). Los campos extra de los JSON, como `provisional` o `etiqueta`, se ignoran.

Resultado esperado: **6 capas** (incluida `geologia`), **8 pois** y **30 datos**.

**Capa Geología (tipo `geologico`).** `schema.sql` la acepta y trae una migración idempotente: si tu base se creó antes, `npm run db:schema` reemplaza el CHECK viejo de `capas.tipo` (busca en `pg_constraint` aunque tenga otro nombre) por `capas_tipo_check` con los 6 tipos. Córrelo antes del seed.

## 4. Levantar en local

```bash
npm run dev         # se reinicia solo al guardar cambios
```

Prueba en <http://localhost:3001/api/salud> → `{ "ok": true, "db": true }`.
Para probar todo, abre `pruebas.http` con la extensión **REST Client** de VS Code.

## 5. Despliegue

| Dónde | Variable | Valor |
|---|---|---|
| **Render** (esta API) | `DATABASE_URL` | La URL **pooled** de Neon, la que tiene `-pooler` en el host (solo en el panel de Render, nunca en el repo). En local usa la directa para `db:schema` y `db:seed` |
| **Render** (esta API) | `CORS_ORIGIN` | El dominio de Vercel y, si quieres, el local, separados por coma: `https://tu-juego.vercel.app,http://localhost:5173` |
| **Render** (esta API) | `ANTHROPIC_API_KEY` | La key de la Claude Console para Zinn-IA (solo en el panel de Render; nunca en el frontend) |
| **Render** (esta API) | `ZINNIA_MODEL` | `claude-haiku-5-5` |
| **Vercel** (el juego) | `VITE_API_URL` | La URL de Render terminada en `/api`: `https://<tu-api>.onrender.com/api` |

**CORS_ORIGIN debe incluir el dominio exacto de Vercel** (con `https://` y sin `/` al final). Si no, el navegador bloquea las peticiones y el juego sigue funcionando solo en local, con el aviso "Sin señal con la Tierra". `PORT` no se configura: Render lo pone solo y el servidor lo lee de `process.env.PORT`. `npm start` no usa `--env-file`: en Render las variables vienen del panel.

**Opción rápida (Blueprint):** el repo trae `render.yaml` en la raíz. En Render: **New → Blueprint**, elige el repo y escribe en el panel los valores de `DATABASE_URL`, `CORS_ORIGIN`, `ANTHROPIC_API_KEY` y `ZINNIA_MODEL` (están con `sync: false`, así que nunca se guardan en el repo). Usa el plan gratis y revisa la salud en `/api/salud`.

**Opción manual:**

1. **New → Web Service**, conecta el repo de GitHub.
2. **Root Directory:** `Backend` · **Build Command:** `npm install` · **Start Command:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = la URL pooled de Neon
   - `CORS_ORIGIN` = `https://tu-juego.vercel.app,http://localhost:5173` (separados por coma)
   - `ANTHROPIC_API_KEY` = la key de la Claude Console · `ZINNIA_MODEL` = `claude-haiku-5-5`
   - `PORT` no hace falta: Render lo pone solo.
4. Copia la URL que te da Render (ej. `https://marte-api.onrender.com`) y ponla en Vercel como `VITE_API_URL=https://marte-api.onrender.com/api`.

Render gratis se duerme tras 15 min sin uso; antes de una demo, abrir `/api/salud` unos 2 minutos antes (la primera petición tarda ~50 s).

## Endpoints (`/api`)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/salud` | `{ ok, db }` |
| POST | `/players` | `{ nombre, pronombre }` → 201 `{ id, nombre, pronombre }` |
| GET | `/saves/:playerId` | Resumen de ranuras |
| GET / PUT / DELETE | `/saves/:playerId/:slot` | Partida completa (slot 0 = autoguardado, 1–3 manuales) |
| GET | `/capas`, `/pois`, `/datos?uso=C` | Catálogo científico |
| POST / GET | `/fichas/:playerId` | Desbloquear `{ datoId }` / listar fichas |
| POST | `/decisiones` | `{ playerId, capitulo, escena, opcion, barras }` |
| POST | `/finales` | `{ playerId, final, causa, barras, muestras }` |
| GET | `/stats` | Partidas, finales, causas, opción más elegida, fichas top |

Errores: 400 con `detalles` en español si los datos no son válidos, 404 si no existe, 500 genérico (el detalle queda en la consola del servidor).
