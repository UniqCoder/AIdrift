import { createServer } from './app.mjs';

const server = createServer();
const port = Number(process.env.PORT || 10000);
server.listen(port, '0.0.0.0', () => process.stdout.write(`DRIFTVEIL API listening on ${port}\n`));
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
