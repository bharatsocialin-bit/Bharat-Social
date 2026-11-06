/**
 * Local dev Postgres for sandbox verification (NOT part of the production app).
 * Starts an embedded Postgres on 127.0.0.1:5544 with database `lordsbook_dev`.
 * Idempotent: if the data dir is already initialized it just starts the server.
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const DATA_DIR = new URL('./pgdata', import.meta.url).pathname;
const PORT = 5544;

async function main() {
  const firstRun = !fs.existsSync(`${DATA_DIR}/PG_VERSION`);
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
  });

  if (firstRun) {
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) {
    await pg.createDatabase('lordsbook_dev');
  }
  console.log(`postgres ready on 127.0.0.1:${PORT} db=lordsbook_dev`);
  // Keep the process alive.
  process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error('pgdev failed:', err);
  process.exit(1);
});
