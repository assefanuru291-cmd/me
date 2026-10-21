# EFPT-AMS Material Management System

A multi-organization inventory and material management application built with React, Node.js, Express, and MySQL/MariaDB.

Approval Management configures class-scoped material and asset workflows, including return inspections, requester/recipient acceptance, store-manager finalization, and voucher references. Existing databases must apply the dynamic approval migration after the role, approval-assignment, and asset migrations described in the project guide.

User Management records a unique organization-scoped FP No, supports lookup/search across local user profiles, and displays requester FP No in material and asset request tables. No external HR system connector is configured; use manual entry or an existing local profile lookup.

Existing databases must also apply `database/migrations/20261019_add_user_fp_number.sql` before using FP No fields.

## Documentation

See [EFPT Final Project Documentation](EFPT_FINAL_PROJECT_DOCUMENTATION.md) for current capabilities, roles, database setup, environment configuration, authentication behavior, security notes, and verification steps.

## Language and appearance

The interface supports English, Amharic, and Afan Oromo. Choose the language and the White, Dark, or Blue-black theme from the preference controls in the header or on the sign-in screen. Preferences are saved in the current browser. The selected language is sent with API requests so API `error` and `message` responses use the same language. Organization data and other user-entered values remain unchanged.

## Organization administration

Sign in with a username and password; organization selection and public organization registration are disabled. A one-time system administrator is provisioned from the backend terminal with `npm --prefix backend run setup:system-admin`. This command requires the organization-structure migration to be applied and prompts for the password without displaying it.

Organization admins can create additional organizations and their first organization-admin accounts from Organizations; system admins can list all organizations, while organization admins see only their own organization and ones they created. Each organization admin creates the hierarchy Main department → Department → Class under Organization Structure and assigns users with linked selectors in User Management. Approval routes can then target the assigned class. Existing department text is retained and migrated to the new hierarchy.

For an existing database, back it up and apply `database/migrations/20261020_add_system_admin_and_organization_structure.sql` and `database/migrations/20261020_track_organization_creator.sql`. For a new database, load `database/schema.sql` instead. Use globally unique usernames so username-only login identifies the intended account.

## Database migrations

`database/schema.sql` is the complete, current schema for a new installation. For an existing database, apply the files in `database/migrations/` in filename order with the bundled runner, which records what it applied in the `schema_migrations` table and skips changes that are already in place:

```powershell
npm --prefix backend run migrate:status   # list applied and pending migrations
npm --prefix backend run migrate          # apply pending migrations
```

`npm --prefix backend run verify:schema` loads `database/schema.sql` and `database/seeds.sql` into a throwaway database and reports any statement that fails, so the schema files stay verifiable without touching the configured database.

## Development commands

Install dependencies in the repository root and in `backend/`, configure `backend/.env` using `backend/.env.example`, and initialize a local database using the SQL files in `database/`. The detailed setup guide includes commands and cautions about development seed data.

```powershell
npm run dev:full
npm run lint
npm run build
npm --prefix backend run check
npm --prefix backend test
npm --prefix backend run migrate
npm --prefix backend run verify:schema
```

The frontend runs at `http://localhost:5173` (or `http://127.0.0.1:5173`) and proxies `/api` requests to the API at `http://127.0.0.1:5000`. Set `VITE_API_URL` to `/api` for local development; for a separately hosted API, set it to the API base URL and configure `FRONTEND_URL` in the backend.

## Security note

`database/seeds.sql` contains development accounts with a shared test password. Use only with a disposable local database. Never deploy those credentials or sample records.
