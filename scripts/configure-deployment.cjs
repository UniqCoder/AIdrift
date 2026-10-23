const fs = require('node:fs');
const assert = require('node:assert/strict');
const url = new URL(process.argv[2]);
assert.ok(url.protocol === 'https:' && url.hostname.endsWith('.onrender.com') && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Supply the HTTPS root URL of the deployed Render API.');
const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json', framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist',
  env: { VITE_API_BASE: '/api' },
  rewrites: [
    { source: '/api/:path*', destination: `${url.origin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
};
fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n');
process.stdout.write(`Vercel API proxy configured for ${url.origin}\n`);
