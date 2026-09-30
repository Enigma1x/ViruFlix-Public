# ViruFlix Public

ViruFlix Public is a portfolio-ready streaming catalogue built with React, Vite, Electron, and a Supabase Edge Function API. It demonstrates a complete product surface—catalogue browsing, search, details, playback, authentication, watch history, recommendations, administration, and protected Live TV—without publishing provider credentials or private business data.

This repository is the sanitized public edition of ViruFlix. It is independent from the private development project and can be reviewed, built, and run by another developer.

## CV summary

Designed and implemented a cross-platform streaming application with a React frontend, Electron desktop shell, server-side API gateway, protected user flows, approval-based Live TV access, local demo data, automated secret checks, and reproducible public releases.

## Technology

- React 19, React Router, Vite, Tailwind/PostCSS, Framer Motion
- Electron and electron-builder for the desktop installer
- Supabase Auth, Postgres, and Edge Functions for the optional backend
- TMDB and MyAnimeList accessed only by the server-side proxy
- Videasy as the primary playback provider, with a local demo player fallback
- Vitest, ESLint, and a public-bundle verification script

## Architecture

The renderer has one public configuration boundary: `VITE_PUBLIC_API_BASE_URL` and `VITE_DEMO_MODE`. It never contains a database URL, provider key, service role key, or user authorization decision. When demo mode is enabled, catalog, anime, history, Live TV, and playback use safe local sample data. When a backend URL is configured, the frontend calls `supabase/functions/public-api/index.ts` using short HTTPS requests and Bearer tokens.

The Edge Function owns authentication, profile access, history ownership, recommendations, catalog proxying, Live TV approval checks, and administrator authorization. Every protected operation obtains the user from the Bearer token; a client-supplied `user_id` is never used for authorization.

## Quick start

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

The default experience is demo mode. No account, API key, or external service is needed to browse the public sample catalogue and use the demo player.

## Backend configuration

Create a separate Supabase project for the public deployment. Apply `supabase/bootstrap.sql`, apply the migrations, deploy the function, and configure these server-side secrets in Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN`
- `MAL_CLIENT_ID`
- `CORS_ALLOWED_ORIGINS`

These values must never be placed in `.env`, the frontend bundle, GitHub Actions logs, or the Electron package. Set the frontend only with:

```env
VITE_PUBLIC_API_BASE_URL=https://YOUR_PROJECT.supabase.co/functions/v1/public-api
VITE_DEMO_MODE=false
```

The public API has the following route groups: authentication, profile, history, recommendations, TMDB catalog, anime catalog, Live TV, and administration. It returns `{ "data": ... }` for successful calls and `{ "error": { "code": ..., "message": ... } }` for failures.

## Live TV approval flow

Registration creates a normal user who remains pending. An administrator signs in, opens the administration panel, and approves the profile. Only an authenticated approved profile can request Live TV channels. External channel playlists are included as configurable public sources; deployers are responsible for confirming that each source is authorized for their use and territory.

No demo account password is published.

## Build and verify

```powershell
npm run lint
npm run test:run
npm run build:public
npm run verify:public
npm run electron:build:public
```

`dist/` is intentionally versioned so the portfolio repository can show the generated web artifact. Installer output is written to the sibling directory `ViruFlix-Public-Releases`; it is not committed. Attach the Windows installer, `latest.yml`, a SHA-256 checksum, and release notes to a GitHub Release.

## Limitations and external providers

The demo catalogue and demo player are sample content. Live catalog data, anime data, external playback availability, and channel streams depend on the configured providers and their terms. A deployed backend is required for real accounts, history synchronization, recommendations, administration, and approved Live TV access.

## License

MIT © Steven Miranda.
