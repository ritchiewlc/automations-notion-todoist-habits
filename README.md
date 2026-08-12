# notion-todoist-habits (SST)

Single source of truth for habit-close.

Local: `~/Repositories/wlc-automations/notion-todoist-habits`  
GitHub: [`ritchiewlc/automations-notion-todoist-habits`](https://github.com/ritchiewlc/automations-notion-todoist-habits)  
Live: https://habit-close-worker.ritchiewlc.workers.dev

Open this folder (or this GitHub repo) for every habit-close cook. Do not open the retired GitHub `ritchiewlc/notion-todoist-habits` or treat `personal/habit-close-worker/` as the home (mirror / pointer only).

## Flow

1. Notion automation: **Send webhook only** → `POST …/close/<habit>`
2. Worker closes the Todoist task.
3. Slack (optional): posts to `#todoist-automation` **as Notion** when `SLACK_BOT_TOKEN` is set, **except** `morning` and `evening` (wake / sleep). Those close Todoist only. No Slack.

## Habits

| Path | Todoist | Slack |
| --- | --- | --- |
| `/close/morning` | close | never |
| `/close/evening` | close | never |
| `/close/running` | close | yes if token |
| `/close/workout` | close | yes if token |
| `/close/clean-diet` | close | yes if token |
| `/close/basketball` | close | yes if token |
| `/close/yoga` | close | yes if token |
| `/close/cheat-meal` | close | yes if token |
| `/close/haircut` | close | yes if token |
| `/reopen/<habit>` | undo a test close | no |
| `/reschedule/sleep` | evening/Sleep due → today | no |

## Secrets

| Secret | Where |
| --- | --- |
| `TODOIST_API_KEY` | Cloudflare Worker (required) |
| `SLACK_BOT_TOKEN` | Cursor Dashboard Secrets → sync with `bash scripts/habit-slack-cf-secret-sync.sh` |
| `WEBHOOK_SECRET` | Cloudflare Worker (optional) |

Never paste tokens in chat.

## HARD GATE: smoke + Todoist proof

1. Health: `curl -sS https://habit-close-worker.ritchiewlc.workers.dev/`
2. Slack face (no Todoist): `bash scripts/habit-slack-display-smoke.sh`
3. Close path: **only** `bash scripts/habit-close-smoke.sh <habit>`
4. Done audit: `bash scripts/habit-todoist-audit.sh` (or scoped). Show **AUDIT PASS**.
5. Never ad-hoc `curl /close`. Never `td task update … --json`.

## Deploy

```bash
cd ~/Repositories/wlc-automations/notion-todoist-habits
npx wrangler deploy
```

## Cloud Agents / Build mode

Repo-level env: `.cursor/environment.json` (installs wrangler for faster Builds).

1. [GitHub integration](https://cursor.com/dashboard/integrations): grant `automations-notion-todoist-habits` (or All repositories).
2. [Cloud Agents environments](https://cursor.com/dashboard/cloud-agents#environments): select this repo, run setup / Build once.
3. Secrets checklist (paste in dashboard, never chat): `SLACK_BOT_TOKEN`, and Cloudflare deploy token only if Cloud should `wrangler deploy` (`CLOUDFLARE_API_TOKEN` + account). `TODOIST_API_KEY` stays on the Worker unless Cloud must call Todoist CLI.

## Retired

| Path | Status |
| --- | --- |
| GitHub `ritchiewlc/notion-todoist-habits` | Retired. README points here. Archive/delete needs explicit go. |
| `personal/habit-close-worker/` | Mirror / pointer only. Not the open target. |
