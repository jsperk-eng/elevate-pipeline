// Slack integration — webhook notifications for stage changes, blocked toggles, and notes

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

const STAGE_ICONS = {
  "Field Mapping": ":mag:",
  "Create DB Tables": ":hammer_and_wrench:",
  "Glue Extraction": ":gear:",
  "Lambda Refactor": ":zap:",
  "Widget Review": ":eyes:",
  "End User QA": ":test_tube:",
  "Validated": ":white_check_mark:"
};

/**
 * Post a message to Slack via incoming webhook.
 *
 * Uses no-cors mode with application/x-www-form-urlencoded so the browser
 * sends a CORS "simple request" (no preflight). The trade-off: no-cors means
 * the fetch always resolves with an opaque response — you cannot inspect
 * response.ok or read the body. The message either lands in Slack or fails
 * silently. If notifications stop arriving, verify the webhook URL is still
 * active in Slack's app settings.
 */
async function slackNotify(text) {
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "payload=" + encodeURIComponent(JSON.stringify({ text }))
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}

/**
 * Notify Slack when a widget moves to a new stage.
 */
function notifyStageChange(widgetName, oldStage, newStage, user) {
  const icon = STAGE_ICONS[newStage] || ":arrow_right:";
  const text = `${icon} *${widgetName}* moved from _${oldStage}_ to *${newStage}* by ${user}`;
  slackNotify(text);
}

/**
 * Notify Slack when a widget is blocked or unblocked.
 */
function notifyBlockedChange(widgetName, isBlocked, user) {
  const text = isBlocked
    ? `:no_entry: *${widgetName}* has been *blocked* by ${user}`
    : `:large_green_circle: *${widgetName}* has been *unblocked* by ${user}`;
  slackNotify(text);
}

/**
 * Notify Slack when a note is added to a widget.
 */
function notifyNoteAdded(widgetName, note, stage, user) {
  const icon = STAGE_ICONS[stage] || ":arrow_right:";
  const text = `:memo: *${widgetName}* (${icon} _${stage}_) — note added by ${user}:\n> ${note}`;
  slackNotify(text);
}
