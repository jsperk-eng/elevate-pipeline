// Slack integration — webhook notifications for stage changes and blocked toggles

const SLACK_PROXY_URL = "/api/slack";

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
 * Post a message to Slack via webhook.
 */
async function slackNotify(text) {
  try {
    // Slack webhooks block browser CORS, so use no-cors mode.
    // The request still reaches Slack — we just can't read the response.
    await fetch(SLACK_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
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
