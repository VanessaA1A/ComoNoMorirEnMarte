import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Copia .env.example como .env y pon la URL de Neon.');
  process.exit(1);
}

const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: esLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => console.error('Error inesperado en la conexión a Postgres:', err));
