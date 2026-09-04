# Ramified Minigames analytics deployment

The analytics endpoint uses the existing `GAME_ROOM` Durable Object namespace. It stores one anonymous aggregate object per UTC day, so no D1 or KV resource is required.

## Data collected

- page visits
- active visible playtime, grouped by selected game
- two-letter country code supplied by Cloudflare, stored only in daily aggregates

The tracker does not send or store IP addresses, names, room codes, persistent visitor IDs, URLs, user agents, or game state. It does not run when the browser enables Do Not Track or Global Privacy Control.

## Deploy

From the `cloudflare` directory, set a long random dashboard password as an encrypted Worker secret:

```powershell
npx wrangler secret put ANALYTICS_ADMIN_TOKEN --config ramified-chess.wrangler.toml
```

Then deploy the Worker:

```powershell
npx wrangler deploy --config ramified-chess.wrangler.toml
```

Publish the updated website files as usual. Open:

```text
https://ramified-chess.ramified.workers.dev/admin/analytics
```

Use `admin` as the username and the secret value as the password. The username is informational; the password is what the Worker verifies.

If the webpage moves to another origin, add that exact origin to the comma-separated `ANALYTICS_ALLOWED_ORIGINS` value in `ramified-chess.wrangler.toml` before deploying.
