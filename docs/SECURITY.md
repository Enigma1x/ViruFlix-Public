# Security model

## Public boundary

The frontend exposes only `VITE_PUBLIC_API_BASE_URL` and `VITE_DEMO_MODE`. A URL is public configuration; it is not a credential. Provider credentials and database administration credentials belong exclusively in Supabase project secrets.

## Authentication

The Edge Function reads the Bearer token, asks Supabase Auth for the user, and uses that verified identity for profile and history queries. It does not authorize a request from a user identifier supplied in JSON. Live TV additionally requires `profiles.is_approved = true`. Administration additionally requires `profiles.role = 'admin'`.

## Release checks

`npm run verify:public` scans the source and generated build for environment files, credential-shaped values, private tokens, and removed legacy provider code. Run it after every build and before pushing a release.

Never commit a real `.env`, a service key, database password, personal data export, private playlist, or account credentials. If a secret was ever exposed, rotate it in its provider before publishing.
