# DRIFTVEIL deployment

Requested topology: Vercel frontend → same-origin `/api` proxy → Render `driftveil-api` Docker web service.

The service executes the shared OutcomeGuard, DriftGate and ChainRestore engine. It is stateless: each request has an isolated synthetic ledger. Browser approvals and records remain operator-controlled fixtures; adding a server does not turn them into authenticated enterprise authority or durable audit storage.

## Local verification

```powershell
npm test
npm run test:api
npm run build
npm run build:api
npm run start:api
```

The API listens on `0.0.0.0:10000`, or the `PORT` environment variable. `/health` and `/api/health` return service, engine and USP metadata. POST endpoints are `/api/outcome`, `/api/change`, `/api/reference`, `/api/recovery` and `/api/evaluation`.

To run the UI against the local API, use a second terminal:

```powershell
$env:VITE_API_BASE = '/api'
npm run dev -- --host 127.0.0.1 --configLoader native
```

Vite proxies `/api` to `127.0.0.1:10000`. Without `VITE_API_BASE`, the existing local-browser evaluator remains available and is labeled accordingly. When API mode is enabled, failures show an error and do not silently fall back or save a fabricated result. Browser previews remain local calculations; saved executions identify their execution location.

## Docker and Render

```powershell
docker build --platform linux/amd64 -t driftveil-api:prototype .
docker run --rm -p 10000:10000 driftveil-api:prototype
```

The multi-stage Dockerfile compiles the existing engine with the installed TypeScript dependency. The final image contains the Node runtime, compiled engine and HTTP server; it runs as the non-root `node` user. It requires no database, credentials, hosted model or runtime npm dependencies.

Render can build this image directly from a pushed Git repository. Configure a Docker web service named `driftveil-api`, repository root Docker context, `./Dockerfile`, and HTTP health path `/health`. Keep the image's default command. Choose the intended workspace before creating anything, and inspect existing services to avoid duplicating a deployment. A prebuilt registry image is optional; do not claim one exists until a Docker build/push actually succeeds.

Before publishing, push the current application source to a repository the connected account can write. Both currently connected GitHub accounts reported `push: false` for `xemorph64/exorcist` during this task. No source was pushed and no Render service was created from outdated remote code.

## Vercel

After the Render service is live and its health and workflow endpoints pass checks, configure its actual URL:

```powershell
node scripts/configure-deployment.cjs https://ACTUAL-SERVICE.onrender.com
```

This writes the API proxy and `VITE_API_BASE=/api` build configuration to `vercel.json`. It rejects non-HTTPS and non-Render origins. The file initially contains SPA routing only and preserves the working local calculation mode; no unverified backend hostname is hardcoded.

Deploy the project root on Vercel using the supplied Vite build/output settings. Verify `/demo`, direct incident URLs and `/api/health`, then execute a purchase, change and recovery through the deployed frontend. A deployment request is not success until the provider reports ready/live and these checks pass.

## Current publication status

The deployment files and seven HTTP/client integration tests are implemented. Public deployment is pending repository write access, confirmation of the Render workspace, and a working Vercel connection. The local Vercel CLI could not reach its API from this environment; the Vercel integration has been suggested but its connection has not been confirmed. Docker Desktop's Linux engine was unavailable when checked, so neither a local container build nor a registry push is claimed.
