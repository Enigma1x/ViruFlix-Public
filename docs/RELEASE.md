# Public release checklist

- Run `npm ci`, `npm run lint`, and `npm run test:run`.
- Run `npm run build:public` with demo mode enabled.
- Run `npm run verify:public` and inspect the generated `dist/`.
- Preview the build with `npm run preview`.
- Build the installer with `npm run electron:build:public`.
- Generate a SHA-256 checksum for the installer outside the repository.
- Attach the installer, `latest.yml`, checksum, and release notes to a GitHub Release.
- Confirm that the release contains no credentials and no demo password.
