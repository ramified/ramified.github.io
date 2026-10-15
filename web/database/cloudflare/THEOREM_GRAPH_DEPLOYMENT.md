# Personal theorem graph storage

The public GitHub page keeps its existing preset files. Edits are saved locally in
IndexedDB; the separately deployed personal editor also synchronizes to a D1
database in your Cloudflare account. Only `ramified` can sign in. No email or
Cloudflare Access configuration is needed.

## What is implemented

- Local drafts, including raw text and active editor context, survive reloads.
- The Import tab contains a small sign-in link. The right-side **My graphs** card
  appears only after sign-in and disappears on sign-out or session expiry.
- Cloud writes are debounced by 4 seconds, with a 30-second maximum wait while editing.
- Each graph has one current record. No Git commits or site deployments occur on save.
- Before a restore, on a new cloud editing session, or after five minutes of changes,
  the previous content becomes a checkpoint. Each graph retains 50 checkpoints.
- Restore opening version, preview history, restore a checkpoint, and download JSON.
- Save conflicts never overwrite a newer revision. Opening the cloud version preserves
  the displaced local draft as a recovered graph. Conflicting local tabs also fork a copy.
- Unacknowledged cloud requests retain their operation ID across reloads for safe retries.
- Graphs are private server-side. The editor's static files can be visited publicly;
  every document read/write and history endpoint requires an authenticated session.

## Deploy to Cloudflare

Prerequisites: Node.js 22.13+ (Node.js 24 recommended for the local test server),
a Cloudflare account with Workers and D1 enabled, and Wrangler. The database ID and
Worker URL below are account-specific; do not invent them.

From this `cloudflare` directory:

```powershell
npx wrangler login
npx wrangler d1 create theorem-graph-personal
```

Copy the returned database UUID into `database_id` in `theorem-graph.wrangler.toml`.
The database name is `theorem-graph-personal`; in the Cloudflare dashboard it appears
under D1. It contains `documents`, `history`, `sessions`, and `login_limits`.

```powershell
npx wrangler d1 execute theorem-graph-personal --remote --file theorem-graph-schema.sql --config theorem-graph.wrangler.toml
npx wrangler deploy --config theorem-graph.wrangler.toml
node set-theorem-password.mjs --deploy
```

The password command asks twice without echoing the input. Use a unique password or
passphrase of at least 14 characters. It sends only a salted PBKDF2-SHA256 verifier
to the Worker secret `ADMIN_PASSWORD_HASH`. The password is never stored in the
HTML, Git repository, shell arguments, or command history. Until that secret is set,
all storage endpoints fail closed with 503. Run the same command to change the
password; sessions made with the old verifier cease to authenticate.

Open the exact HTTPS URL returned by Wrangler, followed by
`/theorem_graph_calculator.html`. Open **Import / Export → Import → Sign in to My graphs**
and sign in as `ramified`. This is the personal editor.
The build includes the calculator, its dependencies, and the public preset catalog;
it does not upload deployment scripts, databases, credentials, or other project files.

To add a link from the public GitHub page, set `window.THEOREM_GRAPH_PERSONAL_URL`
in `../js/theorem_graph_cloud_config.js` to that personal editor URL, bump its cache
query in the HTML, and publish the public site normally. This is a one-time setup.
The personal and GitHub origins have separate browser storage. Transfer an existing
public-page local graph with the existing whole-graph export and import.

## Local preview without a Cloudflare account

From the repository's `web/database` directory:

```powershell
node cloudflare/build-theorem-graph-assets.mjs
node cloudflare/set-theorem-password.mjs --local
node cloudflare/theorem-graph-local-server.mjs
```

Visit `http://127.0.0.1:8788/theorem_graph_calculator.html`. The local password hash
and SQLite database live in ignored `cloudflare/.theorem-local/`. This server binds
only to loopback. It uses the actual Worker request handler with a SQLite D1 adapter;
it does not replace verification on a real Workers deployment.

## Storage, recovery, and limits

- A save is limited to 1 MiB, including editor drafts. The library supports 500 graphs.
  Larger graphs remain on the device and can be downloaded; the UI shows a sync error.
- Only the server's acknowledgement marks a cloud save successful. Offline work stays
  in IndexedDB and retries on reconnect or with Sync now. Closing a browser cannot
  guarantee a final network request, so saving runs throughout editing.
- The latest 50 checkpoints are a rolling history, not permanent archival storage.
  Download JSON for independent backups. JSON export includes the graph model;
  uncommitted form drafts remain in local/cloud personal records.
- A lost response is retried with the same write ID. A conflicting remote revision
  requires opening the cloud version or saving the current work as a new graph.
- Sign out revokes the current server session. Local drafts remain on that device,
  including unsynced work. Anyone using the same browser profile can access its local
  storage; use a separate OS/browser profile on shared devices.
- Login is limited to 10 attempts per client IP per 15-minute bucket, plus 60 attempts
  per bucket globally. Sessions last seven days and use an HttpOnly, SameSite=Strict,
  Secure cookie in production. Mutations require the exact same Origin and a custom
  request header; browser CORS access is not enabled.
- `LOCAL_HTTP=true` only relaxes the Secure cookie flag for literal loopback hosts.
  The production configuration does not set it and never bypasses authentication.
- Cloud data is owned by the configured Cloudflare account. Download a D1 backup:

```powershell
npx wrangler d1 export theorem-graph-personal --remote --output theorem-backup.sql --config theorem-graph.wrangler.toml
```

Store that backup outside the public repository. Cloudflare backups and the application's
per-graph history serve different purposes; individual restores create a new head
while retaining the displaced current version in application history.

## Verification

Run from `web/database`:

```powershell
node js/theorem_graph_calculator_regression_test.js
node js/theorem_graph_storage_test.js
node cloudflare/theorem-graph.worker_test.mjs
node cloudflare/build-theorem-graph-assets.mjs
node js/theorem_graph_personal_ui_test.js
node js/calculator_input_drafts_test.js
node js/calculator_input_drafts_ui_test.js
```

The browser tests use an isolated headless Edge profile and a local HTTP server.
The theorem graph is not included in the native workspace editor catalog, so this
feature does not change or rebuild that bundle.

For an additional smoke test with the actual local Workers runtime, run
`node cloudflare/theorem-graph.workerd_test.mjs` with Miniflare installed, or pass
the path to the `miniflare/dist/src/index.js` installed alongside Wrangler. This
checks Web Crypto password verification and D1 trigger behavior in workerd.

After deployment, also verify HTTPS login, saving and reloading on two devices,
conflict recovery, logout, and denied document reads without a session. Check the
Worker CPU metrics for password verification on the Free plan before regular use.
