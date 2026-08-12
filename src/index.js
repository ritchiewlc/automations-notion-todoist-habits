/**
 * habit-close-worker
 * Notion webhook → close Todoist habit → optional Slack ping.
 * Slack only when SLACK_BOT_TOKEN is set (CF Worker secret).
 */

const HABITS = {
  morning: "6Rv7q3HCJ3wGMfvF",
  evening: "6Rv7qwcpV4CFWQ5F",
  running: "69fRWfmQ4vXfPfCm",
  workout: "6RvcVG6r8G3J9x8F",
  "clean-diet": "6X5MF4WvMv5Fjfrm",
  basketball: "6RMX3jJvV9r8C3Hm",
  yoga: "6RJ68vrrp7qQ3VGF",
  "cheat-meal": "6fXRqjC9vJM62Pvm",
  haircut: "694w43cWcGJFWWjm",
};

const RESCHEDULE = {
  sleep: "6Rv7qwcpV4CFWQ5F",
};

/** Habits that close Todoist but never post Slack (wake / sleep). */
const SLACK_DISABLED = new Set(["morning", "evening"]);

/** Slack copy per habit (matches prior Notion notify wording). */
const SLACK_TEXT = {
  running: "running task completed",
  workout: "workout task done",
  "clean-diet": "clean diet task done",
  basketball: "basketball task done",
  yoga: "yoga task done",
  "cheat-meal": "cheat meal task done",
  haircut: "haircut task done",
};

const SLACK_CHANNEL = "C0BH8VD2QU8"; // #todoist-automation
const SLACK_MENTION = "U01AQ1A9141"; // ritchiewlc
/** Display as Notion (Notion triggers the flow). Still the cursor Slack app. Needs chat:write.customize. */
const SLACK_AS_NOTION = {
  username: "Notion",
  // Public Notion mark (PNG). Slack ignores username/icon without chat:write.customize.
  icon_url:
    "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
};

/** Fallback Open in Notion targets: live habit logbook DBs (not empty twins). */
const LOGBOOK_URL = {
  morning: "https://www.notion.so/34b170bf84a1807aab14fa813b764dfe",
  evening: "https://www.notion.so/34b170bf84a1801ba3f8db05c020d6e9",
  running: "https://www.notion.so/346170bf84a1800f8629ee305902c1ec",
  workout: "https://www.notion.so/346170bf84a1800fb3d8e9fe28f2037b",
  "clean-diet": "https://www.notion.so/34b170bf84a180d1b3aac940b880a476",
  "cheat-meal": "https://www.notion.so/34b170bf84a180d1b3aac940b880a476",
  basketball: "https://www.notion.so/2f8170bf84a180219e39c0c260d40047",
  yoga: "https://www.notion.so/346170bf84a18066a50ef04a4197a7f0",
  haircut: "https://www.notion.so/34b170bf84a180c9b023ffcca3c37fe1",
};

function notionUrlFromId(id) {
  if (!id || typeof id !== "string") return null;
  const hex = id.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `https://www.notion.so/${hex}`;
}

/** Prefer row URL/id from Notion webhook body; else habit logbook. */
function resolveNotionUrl(habit, payload) {
  if (payload && typeof payload === "object") {
    const direct =
      payload.url ||
      payload.data?.url ||
      payload.source?.url ||
      payload.page?.url;
    if (typeof direct === "string" && direct.includes("notion.")) return direct;
    const id =
      payload.page_id ||
      payload.id ||
      payload.data?.page_id ||
      payload.data?.id ||
      payload.page?.id;
    const fromId = notionUrlFromId(typeof id === "string" ? id : "");
    if (fromId) return fromId;
  }
  return LOGBOOK_URL[habit] || null;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function authorized(request, env) {
  const expected = env.WEBHOOK_SECRET;
  if (!expected) return true;
  const header = request.headers.get("X-Webhook-Secret");
  if (header && header === expected) return true;
  const auth = request.headers.get("Authorization");
  if (auth && auth === `Bearer ${expected}`) return true;
  return false;
}

function todoistHeaders(env) {
  return {
    Authorization: `Bearer ${env.TODOIST_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function notifySlack(habit, env, notionUrl) {
  if (SLACK_DISABLED.has(habit)) {
    return { skipped: true, reason: "habit_no_slack" };
  }
  if (!env.SLACK_BOT_TOKEN) {
    return { skipped: true, reason: "missing_slack_bot_token" };
  }
  const line = SLACK_TEXT[habit] || `${habit} task done`;
  const text = `<@${SLACK_MENTION}> ${line}`;
  const msg = {
    channel: env.SLACK_CHANNEL_ID || SLACK_CHANNEL,
    text,
    username: env.SLACK_USERNAME || SLACK_AS_NOTION.username,
    icon_url: env.SLACK_ICON_URL || SLACK_AS_NOTION.icon_url,
  };
  if (notionUrl) {
    msg.blocks = [
      { type: "section", text: { type: "mrkdwn", text } },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in Notion" },
            url: notionUrl,
            action_id: "open_in_notion",
          },
        ],
      },
    ];
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(msg),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok !== true) {
    return {
      ok: false,
      status: res.status,
      error: body.error || "slack_post_failed",
      detail: body,
    };
  }
  return {
    ok: true,
    channel: body.channel,
    ts: body.ts,
    as: "Notion",
    notion_url: notionUrl || null,
  };
}

async function closeHabit(habit, taskId, env, notionUrl) {
  const closeUrl = `https://api.todoist.com/api/v1/tasks/${taskId}/close`;
  const res = await fetch(closeUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TODOIST_API_KEY}` },
  });

  let closed = false;
  let note;
  if (res.status === 204 || res.status === 200) {
    closed = true;
  } else if (res.status === 404) {
    closed = false;
    note = "task_not_found_or_already_gone";
  } else {
    const detail = await res.text();
    return json(502, {
      ok: false,
      error: "todoist_close_failed",
      habit,
      taskId,
      status: res.status,
      detail: detail.slice(0, 500),
    });
  }

  const slack = await notifySlack(habit, env, notionUrl);
  return json(200, {
    ok: true,
    habit,
    taskId,
    closed,
    ...(note ? { note } : {}),
    slack,
  });
}

async function reopenHabit(habit, taskId, env) {
  const reopenUrl = `https://api.todoist.com/api/v1/tasks/${taskId}/reopen`;
  const res = await fetch(reopenUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TODOIST_API_KEY}` },
  });
  if (res.status === 204 || res.status === 200) {
    return json(200, { ok: true, habit, taskId, reopened: true });
  }
  if (res.status === 404) {
    return json(200, {
      ok: true,
      habit,
      taskId,
      reopened: false,
      note: "task_not_found_or_already_open",
    });
  }
  const detail = await res.text();
  return json(502, {
    ok: false,
    error: "todoist_reopen_failed",
    habit,
    taskId,
    status: res.status,
    detail: detail.slice(0, 500),
  });
}

async function rescheduleHabit(habit, taskId, env) {
  const getUrl = `https://api.todoist.com/api/v1/tasks/${taskId}`;
  const getRes = await fetch(getUrl, {
    method: "GET",
    headers: todoistHeaders(env),
  });
  if (getRes.status === 404) {
    return json(200, {
      ok: true,
      habit,
      taskId,
      rescheduled: false,
      note: "task_not_found_or_already_gone",
    });
  }
  if (!getRes.ok) {
    const detail2 = await getRes.text();
    return json(502, {
      ok: false,
      error: "todoist_get_failed",
      habit,
      taskId,
      status: getRes.status,
      detail: detail2.slice(0, 500),
    });
  }
  const task = await getRes.json();
  const due = task.due;
  let due_string = "today";
  const recurring = due?.is_recurring || due?.isRecurring;
  if (recurring && due.string) {
    const base = String(due.string).replace(/\s+starting\s+.*/i, "").trim();
    due_string = `${base} starting today`;
  }
  const updateRes = await fetch(getUrl, {
    method: "POST",
    headers: todoistHeaders(env),
    body: JSON.stringify({ due_string }),
  });
  if (updateRes.status === 200 || updateRes.status === 204) {
    let updated = null;
    try {
      updated = await updateRes.json();
    } catch {
      updated = null;
    }
    return json(200, {
      ok: true,
      habit,
      taskId,
      rescheduled: true,
      due_string,
      due: updated?.due ?? null,
    });
  }
  const detail = await updateRes.text();
  return json(502, {
    ok: false,
    error: "todoist_reschedule_failed",
    habit,
    taskId,
    status: updateRes.status,
    detail: detail.slice(0, 500),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json(200, {
        ok: true,
        service: "habit-close-worker",
        habits: Object.keys(HABITS),
        reschedule: Object.keys(RESCHEDULE),
        slack: env.SLACK_BOT_TOKEN ? "configured" : "missing_token",
        usage:
          "POST /close/:habit | POST /reopen/:habit | POST /reschedule/:habit (optional header X-Webhook-Secret)",
      });
    }
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }
    if (!authorized(request, env)) {
      return json(401, { ok: false, error: "unauthorized" });
    }
    if (!env.TODOIST_API_KEY) {
      return json(500, { ok: false, error: "missing_todoist_api_key" });
    }
    const closeMatch = url.pathname.match(/^\/close\/([a-z0-9-]+)\/?$/);
    if (closeMatch) {
      const habit = closeMatch[1];
      const taskId = HABITS[habit];
      if (!taskId) {
        return json(404, {
          ok: false,
          error: "unknown_habit",
          habit,
          habits: Object.keys(HABITS),
        });
      }
      let webhookBody = null;
      try {
        webhookBody = await request.json();
      } catch {
        webhookBody = null;
      }
      const notionUrl = resolveNotionUrl(habit, webhookBody);
      return closeHabit(habit, taskId, env, notionUrl);
    }
    const reopenMatch = url.pathname.match(/^\/reopen\/([a-z0-9-]+)\/?$/);
    if (reopenMatch) {
      const habit = reopenMatch[1];
      const taskId = HABITS[habit];
      if (!taskId) {
        return json(404, {
          ok: false,
          error: "unknown_habit",
          habit,
          habits: Object.keys(HABITS),
        });
      }
      return reopenHabit(habit, taskId, env);
    }
    const rescheduleMatch = url.pathname.match(
      /^\/reschedule\/([a-z0-9-]+)\/?$/,
    );
    if (rescheduleMatch) {
      const habit = rescheduleMatch[1];
      const taskId = RESCHEDULE[habit];
      if (!taskId) {
        return json(404, {
          ok: false,
          error: "unknown_reschedule",
          habit,
          reschedule: Object.keys(RESCHEDULE),
        });
      }
      return rescheduleHabit(habit, taskId, env);
    }
    return json(404, {
      ok: false,
      error: "not_found",
      habits: Object.keys(HABITS),
      reschedule: Object.keys(RESCHEDULE),
    });
  },
};
