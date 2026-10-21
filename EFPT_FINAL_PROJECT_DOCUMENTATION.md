# EFPT Asset Management System

**Application:** EFPT-AMS Material Management System  
**Documentation version:** 1.1  
**Reviewed:** October 20, 2026  
**Runtime:** React, Node.js, Express, MySQL/MariaDB  
**Timezone:** Configure the operating system and database consistently for the deployment.

> This guide documents the implementation in this repository. It is not a production security certification. Confirm deployment settings, institutional policy, and data-handling requirements before using real records.

## 1. Purpose and current scope

EFPT-AMS is a multi-organization material and inventory management application. It provides system-admin-controlled organization creation, account authentication, organization structure and user assignment, material and warehouse administration, stock receipts and issuances, material requests and approvals, dashboard summaries, and audit records.

This repository is a JavaScript application. It does not require PHP, Apache, or XAMPP. The browser UI is a React single-page application; an Express API reads and writes MySQL-compatible data through `mysql2`.

Features described by older project material, such as CCTV, HR integration, multilingual UI, PDF reporting, and two-factor authentication, are not represented as implemented workflows in the current source tree. Asset return inspection is supported as an approval branch with written reviewer remarks; work-order scheduling is not implemented.

## 2. Technology

| Area | Implementation |
|---|---|
| Frontend | React 19, React Router 7, Vite 8 |
| API | Node.js, Express 5 |
| Database client | `mysql2` promise API |
| Database | MySQL 8 or compatible MariaDB |
| Password hashing | `bcryptjs` with 12 salt rounds |
| API authentication | Bearer JWT, default expiry 7 days |
| Browser token storage | `localStorage` |

Use a Node.js release supported by the installed Vite version. Install dependencies separately in the repository root and `backend/`.

## 3. Capabilities and roles

Current data and routes support:

- System administrator setup and organization-scoped inventory administration.
- Organization hierarchy management for main departments, departments, and classes.
- Material requisitions and receipts, issuances, and stock transaction history.
- Configurable approval chains for material issues and asset issue, transfer, and return requests.
- Sequential role or person approvals, requester/recipient acceptance, return inspections, and final voucher references.
- Fixed and consumable asset management, movement history, and depreciation reports.

The schema defines these roles:

| Role | Intended access |
|---|---|
| `system_admin` | Create organizations and their first organization administrators |
| `admin` | Organization-scoped administration and user management |
| `store_manager` | Inventory operations and finalization of assigned requests |
| `main_department_head` | Approve requests assigned to their configured stage |
| `department_head` | Approve assigned requests and submit material requests |
| `class_head` | Approve assigned requests and submit material requests |
| `finance_compliance` | Approve requests assigned to finance or compliance review |
| `maintenance_head` | Review return inspections and approve inspection results |
| `maintenance_inspection_team` | Record inspection results for assigned asset returns |
| `regular_user` | View inventory and submit material requests |

Administrators assign predefined roles in User Management; custom role creation is not supported. The Approval Management screen scopes active chains by request type, requester main department, department, and role. Requests retain a snapshot of their approvers after submission.

Material requests use the active `material_issue` chain matching the requester's organizational assignment. Approvers act in order, the requester accepts before final Store Manager approval, and final approval records an `MV` voucher. Stock is issued separately through the warehouse issuance workflow.

Asset requests use an action-specific chain matched to the requester's organizational assignment. Transfers include acceptance by the destination warehouse manager. A return reaches a Store Manager decision, who can proceed directly or route it through Maintenance Head -> Inspector -> Maintenance Head result review. Requester acceptance and final Store Manager finalization follow; completed issue, transfer, and return actions receive `IV`, `TV`, or `RV` vouchers. Request owners and assigned reviewers can inspect approval history.

## 4. Repository layout

| Path | Responsibility |
|---|---|
| `src/` | React application, pages, components, and authentication context |
| `src/pages/ApprovalManagement.jsx` | Admin configuration for request-scoped approval chains and assigned user classes |
| `src/pages/Organizations.jsx` | System-admin organization and initial-admin creation |
| `src/pages/OrganizationStructure.jsx` | Organization-admin main department, department, and class setup |
| `src/pages/Assets.jsx` | Asset register and action request workflows |
| `backend/server.js` | Express setup, middleware, API route registration, and HTTP listener |
| `backend/routes/` | Authentication, inventory, requests, assets, approvals, and dashboard endpoints |
| `backend/middleware/auth.js` | JWT verification and role checks |
| `backend/config/database.js` | MySQL connection configuration |
| `database/schema.sql` | Database tables, indexes, inventory, approvals, and asset tracking |
| `database/migrations/20261019_add_operational_roles.sql` | Expand the `users.role` enum with the operational roles |
| `database/migrations/20261019_add_user_fp_number.sql` | Add organization-scoped FP No to existing user records |
| `database/migrations/20261019_add_approval_assignments.sql` | Add approver organization, main department, department, and class fields |
| `database/migrations/20261019_add_asset_management.sql` | Create the asset register, asset request, and asset transaction tables |
| `database/migrations/20261019_add_asset_reporting.sql` | Add acquisition fields and maintenance history for asset reports |
| `database/migrations/20261019_add_dynamic_asset_approval.sql` | Add class-scoped routes, approval history, maintenance branches, and vouchers |
| `database/migrations/20261020_add_system_admin_and_organization_structure.sql` | Add system-admin accounts and normalized organization hierarchy; migrate existing department names |
| `database/migrations/20261020_track_organization_creator.sql` | Track which administrator created each organization for scoped organization lists |
| `database/migrations/20261020_add_asset_category_hierarchy.sql` | Add the asset category, subcategory, and asset name lookup tables |
| `backend/scripts/migrate.js` | Migration runner that applies pending migrations and records them in `schema_migrations` |
| `backend/scripts/verify-schema.js` | Loads `schema.sql` and `seeds.sql` into a throwaway database to verify them |
| `backend/scripts/check-syntax.js` | Parses every backend JavaScript file |
| `scripts/check-i18n.mjs` | Verifies that every translation key used in the frontend exists in every language |
| `scripts/check-i18n-dynamic.mjs` | Verifies the translation keys that are built at runtime |
| `scripts/check-routes.mjs` | Verifies that role route grants, rendered routes, and sidebar links agree |
| `database/seeds.sql` | Development sample organizations, users, and inventory data |
| `public/` | Static browser assets |

## 5. Authentication and password handling

1. Public organization registration is disabled. Run the one-time interactive `npm --prefix backend run setup:system-admin` command to create the first system administrator; it will not echo the password and refuses to create a second system admin through bootstrap.
2. System administrators can list every organization. Organization administrators can list only their own organization and organizations they created. Either role can create an organization with its first administrator; passwords are bcrypt-hashed before insertion. An organization admin's organization creation access does not grant access to data in the new organization.
3. Login uses globally unique usernames and passwords without an organization selector. If legacy duplicate usernames match the same password, the login is rejected as ambiguous.
4. Protected API calls send `Authorization: Bearer <token>`. The API re-reads the account and checks that it remains active.
5. The frontend stores the JWT in browser `localStorage` and restores the user by calling `GET /api/auth/me`.

Organization-admin and staff passwords must be at least 8 characters and no more than 72 UTF-8 bytes. The bootstrap system-admin password must be at least 12 characters. The bcrypt byte limit prevents silently treating different long passwords as the same bcrypt input.

The development seed uses the password `Mengistu@2026` for all seeded user accounts. This was checked against the hash in `database/seeds.sql`. The old comment claiming `password123` for the sample users was incorrect. Seed accounts and data are local test fixtures only; do not import them into a production database. Create unique credentials and remove or rotate every seed account before handling real data.

Because bearer tokens are stored in `localStorage`, a successful cross-site scripting attack could expose a token. Use HTTPS in deployed environments, keep frontend dependencies current, validate and escape user-controlled content, and apply an appropriate Content Security Policy at the deployment layer. The application does not currently implement a password reset flow, verified-email flow, or multi-factor authentication.

## 6. Main workflows

### Organization and account setup

An organization admin or system admin can create an organization with its initial organization-admin account. Organization admins manage the hierarchy main department → department → class within their own organization and assign users from that structure. Existing main-department and department text fields are migrated into linked organization-specific records; class assignments are optional. FP No and email remain unique within an organization, and usernames must be globally unique for organization-free login. User Management supports local profile lookup and search by FP No; no external HR connector is configured. Deactivation is implemented for non-admin accounts; the UI does not deactivate administrators.

### Request and approval

A user creates a material request with line items, priority, and purpose. The active chain matching the user's main department, department, and role is snapshotted onto the request. Assigned reviewers act in sequence; requester acceptance precedes final Store Manager approval, which records an `MV` voucher. Direct status updates cannot bypass approval. Stock is issued separately through the warehouse issuance workflow.

### Receiving and issuing inventory

Authorized staff record receipts and issuances against a warehouse and materials. Stock levels and transaction records provide the quantity and movement history used by dashboard and inventory views. Reconcile physical stock with recorded quantities as part of operational controls.

### Fixed and consumable assets

Administrators and store managers register fixed and consumable assets. Users submit issue, full-quantity transfer, or eligible return requests. The active chain matching the requester and action is snapshotted on submission. Transfers include acceptance by the destination warehouse manager. Returns reach a Store Manager decision, who can continue directly or activate a Maintenance Head, Inspector, and Maintenance Head result-review branch. Requester acceptance precedes final Store Manager finalization. Finalization updates custody, quantity, or location and writes the transaction and `IV`, `TV`, or `RV` voucher atomically. Request owners and assigned reviewers can inspect approval history.

Transfers currently move the full available asset quantity between warehouses. Partial transfers and work-order scheduling are not implemented; inspection findings are recorded as approval remarks.

## 7. Data model overview

The schema is defined in `database/schema.sql`. Principal table groups include:

| Group | Tables |
|---|---|
| Organization and identity | `organizations`, `users` |
| Inventory setup | `material_categories`, `materials`, `suppliers`, `warehouses` |
| Quantities and movement | `stock_levels`, `stock_transaction_types`, `stock_transactions` |
| Requests and approvals | `material_requests`, `request_items`, `material_request_approvals`, `asset_request_approvals`, `approval_chains`, `approval_chain_steps` |
| Receiving and issuing | `material_receipts`, `receipt_items`, `material_issuances`, `issuance_items` |
| Asset custody and movements | `organization_assets`, `asset_requests`, `asset_transactions` |
| Traceability | `audit_logs` |

The schema uses foreign keys and organization identifiers. Preserve these constraints when making schema changes. Back up the database and test migrations against a copy before applying them to important data.

## 8. Local setup

### Prerequisites

- Node.js supported by Vite 8 and npm.
- MySQL 8 or a compatible MariaDB server.
- A database account with privileges limited to the application database.

### Install and configure

1. Install the frontend dependencies from the repository root:

   ```powershell
   npm install
   ```

2. Install the backend dependencies:

   ```powershell
   npm --prefix backend install
   ```

3. Create the database and load its schema. `schema.sql` creates `efpt_ams` if it does not exist:

   ```powershell
   mysql -u <DB_USER> -p < database/schema.sql
   ```

   `schema.sql` is the complete current schema, including the asset category
   hierarchy and every column added by the migrations below.

   If the database already exists, apply the pending migrations with the bundled
   runner instead of running the files by hand. It records what it applied in
   the `schema_migrations` table and skips changes that are already in place, so
   it is safe to run repeatedly:

   ```powershell
   npm --prefix backend run migrate:status   # list applied and pending migrations
   npm --prefix backend run migrate          # apply pending migrations
   ```

   The migrations are also listed here for reference and can be applied with a
   MySQL client when the runner is not available. Apply them in filename order.

   Expand the `users.role` enum with the operational roles:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_operational_roles.sql
   ```

   Add the organization-scoped FP No field to existing users:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_user_fp_number.sql
   ```

   Apply the approval assignment migration to add organization, main department, department, and approver class fields:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_approval_assignments.sql
   ```

   Apply the asset workflow migration to create its tables:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_asset_management.sql
   ```

   Add acquisition fields and maintenance history support for asset reports:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_asset_reporting.sql
   ```

   Apply dynamic request approval routes, approval history, and vouchers after the approval-assignment and asset migrations:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261019_add_dynamic_asset_approval.sql
   ```

   Add system-admin accounts and the normalized organization hierarchy, which migrates existing department values:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261020_add_system_admin_and_organization_structure.sql
   ```

   Track who created each organization for safely scoped organization lists:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261020_track_organization_creator.sql
   ```

   Add the asset category, subcategory, and asset name lookup tables:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/migrations/20261020_add_asset_category_hierarchy.sql
   ```

4. For local development only, load the sample data:

   ```powershell
   mysql -u <DB_USER> -p efpt_ams < database/seeds.sql
   ```

   The seed data can be verified without touching the configured database:

   ```powershell
   npm --prefix backend run verify:schema
   ```

5. Copy `backend/.env.example` to `backend/.env`. Set the database host, username, password, and database name. Generate and write a unique JWT secret with:

   ```powershell
   npm --prefix backend run setup:jwt
   ```

6. Start the backend, then create the first system administrator from an interactive terminal:

   ```powershell
   npm --prefix backend run setup:system-admin
   ```

   The setup command requires an interactive terminal; it does not accept passwords from command-line arguments or echo them. Log in with this account to create organizations and their initial organization admins.

   This updates only `JWT_SECRET` in `backend/.env` and does not print the secret. Keep the file private and out of source control.

6. Run the API in one terminal:

   ```powershell
   npm run dev:backend
   ```

7. Run the frontend from the repository root in a second terminal:

   ```powershell
   npm run dev
   ```

8. Open `http://localhost:5173/login`. The frontend expects the API at `http://localhost:5000/api` by default. Set `VITE_API_URL` at frontend build time when the API is hosted elsewhere. The Vite development proxy is configured for `localhost:5000`.

## 9. Configuration reference

Backend settings are loaded from `backend/.env` by `dotenv`:

| Variable | Purpose | Local default or guidance |
|---|---|---|
| `PORT` | Express listening port | `5000` |
| `DB_HOST` | MySQL/MariaDB host | `localhost` |
| `DB_USER` / `DB_PASS` | Database login | Use a dedicated account; do not use root in deployment |
| `DB_NAME` | Application database | `efpt_ams` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `JWT_SECRET` | Signs and verifies API tokens | Required at API startup; must be at least 32 characters and unique per environment |
| `JWT_EXPIRES_IN` | Token lifetime accepted by `jsonwebtoken` | `7d` |
| `VITE_API_URL` | Frontend API base URL | Defaults to `http://localhost:5000/api` |

Asset depreciation reports use the straight-line method, calculated monthly from acquisition cost less salvage value over the configured useful life. Fixed assets without acquisition cost, date, or useful life remain visible as not configured and are excluded from depreciation totals.

Do not commit `.env` files, credentials, production data, or generated backups. Rotate secrets that may have been exposed.

## 10. API route groups

The API is mounted under `/api`:

| Route group | Typical operations |
|---|---|
| `/auth` | Login, current user |
| `/organizations` | System-admin organization creation and listing |
| `/organization-structure` | Organization-admin hierarchy management |
| `/users` | Admin-only user listing, creation, updates, and deactivation |
| `/materials`, `/categories`, `/suppliers` | Inventory catalog management |
| `/warehouses` | Warehouse and stock queries |
| `/requests`, `/approval` | Requisition and approval workflows |
| `/receipts`, `/issuances` | Stock receiving and issuing |
| `/assets` | Fixed/consumable asset register and issue/transfer/return request workflows |
| `/dashboard` | Statistics, recent activity, and low-stock data |

Use the route files as the source of truth for exact methods, request fields, and permissions; endpoint contracts can evolve independently of this summary.

## 11. Verification

Run these checks from the repository root and backend directory:

```powershell
npm run lint
npm run build
npm run check          # lint, translation keys, route tables, and backend syntax
npm --prefix backend test
npm --prefix backend run verify:schema
```

`npm run check` runs the frontend lint, the translation key checks for both
static and runtime-built keys, the route consistency check, and the backend
syntax check. `npm --prefix backend run verify:schema` loads `database/schema.sql`
and `database/seeds.sql` into a throwaway database and reports any statement that
fails, so the schema files stay verifiable without touching the configured
database.

The backend auth tests exercise disabled public registration, login, and token-backed `/me` with an isolated mocked database. For a local smoke test with a disposable database, verify:

1. The API starts and connects to the configured database.
2. The login page has username and password only; a wrong password is rejected.
3. A seeded development account can log in using a globally unique username and the development-only password above.
4. A correct password survives page reload via `/auth/me`.
5. An organization admin can create an organization and its first admin; public registration and non-admin organization creation are rejected.
6. An organization admin can create the three hierarchy levels and assign users to valid parent-child combinations only.
7. A user can access only data and actions allowed for their organization and role.
8. Representative request, approval, receipt, issuance, and stock views work.
9. Logging out removes the browser token and protected API calls are rejected without a valid token.

Do not run test writes against production data. Record which manual checks were performed; a successful frontend build alone does not prove API or database workflows.

## 12. Security and operations

- Deploy behind HTTPS and restrict database network access to the API host.
- Use a least-privilege database account and unique secrets per environment.
- Do not use development seed accounts or sample data in production.
- Review every API route for authentication, role checks, and organization scoping when adding features.
- Back up both database and any future uploaded files; test restoration on an isolated system.
- Monitor application and database errors without logging passwords, tokens, or secrets.
- The current server allows JSON bodies up to 10 MB and uses a configured CORS origin. Review limits, proxy headers, rate limiting, security headers, and production logging before public deployment.
- The current application does not provide an established production deployment pipeline. A migration runner is included (`npm --prefix backend run migrate`) and records applied migrations in `schema_migrations`, but treat schema changes as reviewed, backed-up operational changes and back up the database before running it against real data.

## 13. Troubleshooting

**Database connection errors:** verify the MySQL service, `backend/.env` values, database grants, and whether the database host is reachable from the Node.js process.

**Login fails:** confirm the globally unique username, active account status, and correct password. Check that the API process loaded `JWT_SECRET` and that the account password was stored as a bcrypt hash.

**Browser cannot reach the API:** verify the backend is listening on port 5000, `FRONTEND_URL` matches the page origin, and `VITE_API_URL` is correct for the build. Restart Vite after changing environment values.

**Unexpected access or missing records:** inspect role middleware and ensure every relevant query is scoped by `organization_id`; do not treat hidden UI controls as authorization.

## 14. Change and release checklist

1. Review application and schema changes, including authorization and organization scoping.
2. Back up the target database and test schema changes on a copy.
3. Run lint and production build checks; smoke-test the API with representative roles.
4. Deploy with HTTPS, private environment configuration, restricted database access, and no sample seed credentials.
5. Verify login, request/approval, receipt/issuance, and inventory reconciliation after release.
6. Monitor logs and retain a rollback plan for both application and database changes.