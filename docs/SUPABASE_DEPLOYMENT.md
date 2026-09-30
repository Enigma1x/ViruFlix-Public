# Supabase deployment

1. Create a new Supabase project dedicated to the public portfolio deployment.
2. Run `supabase/bootstrap.sql` in the SQL editor and apply the migrations in filename order.
3. Set the server secrets with the Supabase dashboard or CLI. Keep them out of the repository.
4. Deploy the function:

   ```powershell
   supabase functions deploy public-api
   ```

5. Configure `CORS_ALLOWED_ORIGINS` with the deployed web origin(s), separated by commas.
6. Set the two frontend variables in a local build environment and run `npm run build:public`.
7. Register a new account, verify that it is pending, approve it from an administrator account, sign in again, and confirm that Live TV is accessible.

The function reads provider secrets only on the server. Do not put them in Vite variables: Vite embeds `VITE_*` values into JavaScript at build time.

## Required secrets

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN`, `MAL_CLIENT_ID`, and `CORS_ALLOWED_ORIGINS`.

## Operational responsibility

The deployer owns the Supabase project, email settings, source authorization, provider terms, rate limits, and account approval process. The repository intentionally does not contain a pre-approved account or password.
