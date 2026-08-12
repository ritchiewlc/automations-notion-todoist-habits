# AGENTS.md (notion-todoist-habits)

Identity: `/Users/ritchiewlc/Repositories/personal/SOUL.md` and `AGENTS.md`.

This repo is the **SST** for habit-close (Notion webhook → CF Worker → Todoist close; optional Slack as Notion).  
Local: `/Users/ritchiewlc/Repositories/wlc-automations/notion-todoist-habits`  
GitHub: `ritchiewlc/automations-notion-todoist-habits`

Ops memory: `MEMORIES.md` (read on open; update after every deploy/route change).  
Human URLs: `README.md`.

Routes: `POST /close/:habit`, `POST /reopen/:habit`, `POST /reschedule/sleep`.  
Slack: all close habits except `morning` and `evening` (Todoist only).

HARD GATE: `.cursor/rules/habit-close-todoist-undo.mdc` + skill `.cursor/skills/habit-close`.  
Secrets stay in Cloudflare / Cursor Dashboard. Never commit tokens.  
Open on demand only. Daily homes are `personal` and `xchool`.
