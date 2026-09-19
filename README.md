# Leveling Up

Leveling Up is a static web application for goals, tasks, habits, skills,
notes, budgets, blog posts, and XP-based progression. The browser uses
Supabase for authentication and per-user data; it can also operate in a
local-only mode when Supabase is unavailable.

## Project structure

- `*.html` — page structure and page-specific controls.
- `*.js` — one small controller per page. Shared browser behavior lives in
  `supabaseClient.js`, `progression.js`, `habitScheduler.js`, `theme.js`, and
  `website-chat.js`.
- `styles.css` — shared design system and responsive styles.
- `supabase-*.sql` — idempotent database setup and migration scripts.
- `sw.js` — progressive web app cache configuration.

## Local development

Serve the project directory with any static web server. Do not open files via
`file://`, because Supabase redirects and service workers require an HTTP(S)
origin.

The public Supabase URL and publishable/anon key in `supabaseClient.js` are
safe to expose in a browser. Never add a Supabase `service_role` key, database
password, OAuth client secret, or any private API key to this repository.

## Supabase deployment order

For a new project, run `supabase-auth-setup.sql`, `supabase-app-setup.sql`,
the remaining feature table scripts (`goals`, `blogs`, `budget`, `notes`, and
`bucket-list`), `supabase-progress.sql`, `supabase-leaderboard.sql`, then
`supabase-security-hardening.sql`. The feature scripts are idempotent, so they
are also safe to apply to an existing project in that order.

For Google sign-in, enable Google in Supabase Authentication providers and add
the deployed application URL plus its `/dashboard.html` redirect URL to the
allowed redirect list.

## Security model

- RLS isolates private records by `auth.uid()`.
- XP is awarded through `complete_task_and_award_xp`, not a browser update.
- The leaderboard RPC exposes limited public standing data.
- User-provided text is escaped before being placed into HTML templates.
- The browser never stores user passwords.

Before release, verify RLS is enabled on every public table in Supabase. Enable
email confirmation, MFA where appropriate, and a password-strength policy in
Supabase Auth.
