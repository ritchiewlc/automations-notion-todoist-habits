# MEMORIES (notion-todoist-habits)

> Repo ops Hot only. Cap ~20. Cloudflare is not memory. After every deploy or route change: update this file + README same turn.

## Hot
- [live:sst] 2026-08-12. SST = this folder + GitHub `ritchiewlc/automations-notion-todoist-habits`. Retired GitHub: `ritchiewlc/notion-todoist-habits`. personal/habit-close-worker is mirror only.
- [live:routes] 2026-08-12. Worker `habit-close-worker`. Base `https://habit-close-worker.ritchiewlc.workers.dev`. Close: morning,evening,running,workout,clean-diet,basketball,yoga,cheat-meal,haircut. Reschedule: sleep. Slack skipped for morning+evening only.
- [decision:no-slack-wake-sleep] 2026-08-12. `/close/morning` and `/close/evening` close Todoist, never Slack (`habit_no_slack`).
- [secret:cf+cursor] `TODOIST_API_KEY` on CF. `SLACK_BOT_TOKEN` via Cursor Secrets + `scripts/habit-slack-cf-secret-sync.sh`. Never commit.
- [miss:no-repo-memory] 2026-07-25. Never treat CF as diary; inventory routes before overwrite deploy.
