-- Esquema de "Cómo no morir en Marte". Se puede correr varias veces sin romper nada.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS players (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 30),
  pronombre TEXT NOT NULL CHECK (pronombre IN ('el', 'ella', 'elle')),
  creado    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- slot 0 = autoguardado, 1-3 = ranuras manuales
CREATE TABLE IF NOT EXISTS saves (
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot         INT  NOT NULL CHECK (slot BETWEEN 0 AND 3),
  capitulo     INT  NOT NULL CHECK (capitulo BETWEEN 1 AND 10),
  escena       TEXT NOT NULL,
  oxigeno      INT  NOT NULL CHECK (oxigeno BETWEEN 0 AND 100),
  bateria      INT  NOT NULL CHECK (bateria BETWEEN 0 AND 100),
  alimentacion INT  NOT NULL CHECK (alimentacion BETWEEN 0 AND 100),
  integridad   INT  NOT NULL CHECK (integridad BETWEEN 0 AND 100),
  radiacion    INT  NOT NULL CHECK (radiacion BETWEEN 0 AND 100),
  minutos      INT  NOT NULL, -- puede ser negativo (el módulo ya despegó)
  muestras     JSONB NOT NULL DEFAULT '[]',
  flags        JSONB NOT NULL DEFAULT '{}',
  fichas       JSONB NOT NULL DEFAULT '[]',
  actualizado  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slot)
);

CREATE TABLE IF NOT EXISTS capas (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  tipo        TEXT CHECK (tipo IN ('optico', 'topografico', 'termico', 'minerales', 'radiacion')),
  mision      TEXT,
  instrumento TEXT,
  imagen      TEXT,
  descripcion TEXT,
  limitacion  TEXT,
  fuente      TEXT
);

CREATE TABLE IF NOT EXISTS pois (
  id     TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo   TEXT CHECK (tipo IN ('parada', 'muestra', 'peligro', 'base', 'deposito')),
  x      REAL,
  y      REAL,
  nota   TEXT,
  dato   TEXT,
  mision TEXT,
  fuente TEXT,
  pov    TEXT
);

-- Banco de datos científicos (uso: Z = Zinn-IA, C = pantalla de carga, F = ficha)
CREATE TABLE IF NOT EXISTS datos (
  id         TEXT PRIMARY KEY,
  texto      TEXT NOT NULL,
  uso        TEXT,
  capitulo   TEXT,
  fuente     TEXT,
  verificado BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS fichas_jugador (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  dato_id   TEXT NOT NULL REFERENCES datos(id) ON DELETE CASCADE,
  fecha     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, dato_id)
);

CREATE TABLE IF NOT EXISTS decisiones (
  id        SERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  capitulo  INT  NOT NULL CHECK (capitulo BETWEEN 1 AND 10),
  escena    TEXT NOT NULL,
  opcion    TEXT NOT NULL,
  barras    JSONB NOT NULL,
  fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finales (
  id        SERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  final     TEXT NOT NULL CHECK (final IN ('bueno', 'intermedio', 'malo')),
  causa     TEXT NOT NULL CHECK (causa IN ('exito', 'tiempo', 'rescate', 'radiacion', 'oxigeno', 'integridad')),
  barras    JSONB NOT NULL,
  muestras  INT  NOT NULL CHECK (muestras BETWEEN 0 AND 3),
  fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decisiones_capitulo_idx ON decisiones (capitulo);
CREATE INDEX IF NOT EXISTS finales_final_idx ON finales (final);
