// Dashboard logic — stats, charts, real-time updates

let flowChart = null;
let activityChart = null;

const STAGE_COLORS = {
  "Field Mapping": "#3a5f94",
  "Create DB Tables": "#515f74",
  "Glue Extraction": "#737780",
  "Lambda Refactor": "#a7c8ff",
  "Widget Review": "#d5e3ff",
  "End User QA": "#b9c7df",
  "Validated": "#00b27b"
};

/**
 * Update stat cards.
 */
function updateStats(widgets) {
  const total = widgets.length;
  const validated = widgets.filter(w => w.stage === "Validated").length;
  const remaining = widgets.filter(w => w.stage !== "Validated").length;
  const blocked = widgets.filter(w => w.priority === "BLOCKED").length;
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-validated").textContent = validated;
  document.getElementById("stat-remaining").textContent = remaining;
  document.getElementById("stat-blocked").textContent = blocked;
  document.getElementById("progress-pct").textContent = pct + "%";
  document.getElementById("progress-bar").style.width = pct + "%";

  // Tier breakdowns
  const tier1 = widgets.filter(w => w.tier === "Tier 1");
  const tier1Validated = tier1.filter(w => w.stage === "Validated").length;
  const tier1Pct = tier1.length > 0 ? Math.round((tier1Validated / tier1.length) * 100) : 0;
  document.getElementById("tier1-pct").textContent = tier1Pct + "%";
  document.getElementById("tier1-bar").style.width = tier1Pct + "%";
  document.getElementById("tier1-detail").textContent = `${tier1Validated} of ${tier1.length} validated`;

  const tier2 = widgets.filter(w => w.tier === "Tier 2");
  const tier2Validated = tier2.filter(w => w.stage === "Validated").length;
  const tier2Pct = tier2.length > 0 ? Math.round((tier2Validated / tier2.length) * 100) : 0;
  document.getElementById("tier2-pct").textContent = tier2Pct + "%";
  document.getElementById("tier2-bar").style.width = tier2Pct + "%";
  document.getElementById("tier2-detail").textContent = `${tier2Validated} of ${tier2.length} validated`;
}

/**
 * Build date labels from a start date to today.
 */
function buildDateRange(startDate) {
  const dates = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (d <= today) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Stacked area chart — widgets per stage over time.
 * Uses current widget states as baseline, then replays history backwards
 * to reconstruct past states, then plots forward.
 */
function updateFlowChart(widgets, history) {
  const ctx = document.getElementById("chart-flow").getContext("2d");

  if (!history.length) {
    // No history yet — show current snapshot as a single data point
    const today = toDateKey(new Date());
    const datasets = STAGES.map(stage => ({
      label: stage,
      data: [widgets.filter(w => w.stage === stage).length],
      backgroundColor: STAGE_COLORS[stage] + "80",
      borderColor: STAGE_COLORS[stage],
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: 3
    }));

    if (flowChart) { flowChart.destroy(); }
    flowChart = new Chart(ctx, {
      type: "line",
      data: { labels: [today], datasets },
      options: flowChartOptions()
    });
    return;
  }

  // Build date range from earliest history entry to today
  const dates = buildDateRange(history[0].timestamp);
  const dateKeys = dates.map(toDateKey);

  // Current stage counts
  const currentCounts = {};
  STAGES.forEach(s => { currentCounts[s] = widgets.filter(w => w.stage === s).length; });

  // Walk history backwards from today to reconstruct daily snapshots
  const snapshots = {};
  dateKeys.forEach(dk => { snapshots[dk] = null; });

  // Start with current state for today
  snapshots[dateKeys[dateKeys.length - 1]] = { ...currentCounts };

  // Reverse history to undo changes day by day
  const reversedHistory = [...history].reverse();
  const counts = { ...currentCounts };

  for (let i = dateKeys.length - 2; i >= 0; i--) {
    const dk = dateKeys[i];
    const nextDk = dateKeys[i + 1];
    // Undo any changes that happened on nextDk
    reversedHistory.forEach(h => {
      if (toDateKey(h.timestamp) === nextDk) {
        if (h.after && counts[h.after] > 0) counts[h.after]--;
        if (h.before) counts[h.before]++;
      }
    });
    snapshots[dk] = { ...counts };
  }

  const datasets = STAGES.map(stage => ({
    label: stage,
    data: dateKeys.map(dk => (snapshots[dk] || currentCounts)[stage] || 0),
    backgroundColor: STAGE_COLORS[stage] + "80",
    borderColor: STAGE_COLORS[stage],
    borderWidth: 1.5,
    fill: true,
    tension: 0.3,
    pointRadius: 0
  }));

  if (flowChart) { flowChart.destroy(); }
  flowChart = new Chart(ctx, {
    type: "line",
    data: { labels: dateKeys, datasets },
    options: flowChartOptions()
  });
}

function flowChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { family: "Inter", size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 }
      },
      tooltip: { mode: "index", intersect: false }
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { stepSize: 5, font: { family: "Inter", size: 10 } },
        grid: { color: "rgba(195, 198, 209, 0.2)" }
      },
      x: {
        ticks: { font: { family: "Inter", size: 9 }, maxTicksLimit: 10 },
        grid: { display: false }
      }
    }
  };
}

/**
 * Cumulative activity line — total forward stage moves per day.
 */
function updateActivityChart(history) {
  const ctx = document.getElementById("chart-activity").getContext("2d");

  if (!history.length) {
    if (activityChart) { activityChart.destroy(); }
    activityChart = new Chart(ctx, {
      type: "line",
      data: { labels: [toDateKey(new Date())], datasets: [{ label: "Moves", data: [0], borderColor: "#3a5f94", backgroundColor: "rgba(58, 95, 148, 0.1)", fill: true, tension: 0.3, pointRadius: 3 }] },
      options: activityChartOptions()
    });
    return;
  }

  // Count moves per day
  const movesPerDay = {};
  history.forEach(h => {
    const dk = toDateKey(h.timestamp);
    movesPerDay[dk] = (movesPerDay[dk] || 0) + 1;
  });

  const dates = buildDateRange(history[0].timestamp);
  const dateKeys = dates.map(toDateKey);

  // Build cumulative
  let cumulative = 0;
  const cumulativeData = dateKeys.map(dk => {
    cumulative += (movesPerDay[dk] || 0);
    return cumulative;
  });

  // Daily counts for bar overlay
  const dailyData = dateKeys.map(dk => movesPerDay[dk] || 0);

  if (activityChart) { activityChart.destroy(); }
  activityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dateKeys,
      datasets: [
        {
          type: "line",
          label: "Cumulative",
          data: cumulativeData,
          borderColor: "#3a5f94",
          backgroundColor: "rgba(58, 95, 148, 0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1"
        },
        {
          label: "Daily Moves",
          data: dailyData,
          backgroundColor: "#a7c8ff",
          borderRadius: 3,
          yAxisID: "y"
        }
      ]
    },
    options: activityChartOptions()
  });
}

function activityChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { family: "Inter", size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        position: "left",
        title: { display: true, text: "Daily", font: { family: "Inter", size: 10 } },
        ticks: { stepSize: 1, font: { family: "Inter", size: 10 } },
        grid: { color: "rgba(195, 198, 209, 0.2)" }
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "Cumulative", font: { family: "Inter", size: 10 } },
        ticks: { font: { family: "Inter", size: 10 } },
        grid: { display: false }
      },
      x: {
        ticks: { font: { family: "Inter", size: 9 }, maxTicksLimit: 10 },
        grid: { display: false }
      }
    }
  };
}

// Deadline: April 10, 2026
const DEADLINE = new Date("2026-04-10T23:59:59");

/** Count working days (Mon–Fri) between two dates. */
function countWorkingDays(from, to) {
  let count = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Add N working days to a date, skipping weekends. */
function addWorkingDays(from, numDays) {
  const d = new Date(from);
  let added = 0;
  while (added < numDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

/**
 * Calculate velocity and update the deadline banner.
 */
function updateDeadlineBanner(widgets) {
  const now = new Date();
  const msPerDay = 86400000;
  const workDaysRemaining = countWorkingDays(now, DEADLINE);

  const total = widgets.length;
  const validated = widgets.filter(w => w.stage === "Validated").length;
  const remaining = total - validated;

  // Velocity: only count widgets with a validatedAt timestamp (excludes pre-seeded P1s)
  const validatedWithTimestamp = widgets.filter(w => w.validatedAt);
  let velocity = 0;
  let projectedDate = null;

  if (validatedWithTimestamp.length > 0) {
    const timestamps = validatedWithTimestamp
      .map(w => w.validatedAt.toDate ? w.validatedAt.toDate() : new Date(w.validatedAt))
      .sort((a, b) => a - b);

    const earliest = timestamps[0];
    const daysSinceFirst = Math.max(1, (now - earliest) / msPerDay);

    // 7-day rolling window (calendar days — weekends naturally show 0 movement)
    const sevenDaysAgo = new Date(now - 7 * msPerDay);
    const recentCount = timestamps.filter(t => t >= sevenDaysAgo).length;

    if (recentCount > 0) {
      velocity = recentCount / 7;
    } else {
      velocity = validatedWithTimestamp.length / daysSinceFirst;
    }
  }

  if (velocity > 0 && remaining > 0) {
    const calendarDaysToComplete = remaining / velocity;
    projectedDate = addWorkingDays(now, Math.ceil(calendarDaysToComplete));
  }

  // Status
  let status, statusClass, statusIcon;
  if (remaining === 0) {
    status = "Complete";
    statusClass = "text-on-tertiary-container bg-tertiary-fixed";
    statusIcon = "check_circle";
  } else if (velocity === 0) {
    status = "No Data";
    statusClass = "text-on-surface-variant bg-surface-container-high";
    statusIcon = "hourglass_empty";
  } else if (projectedDate <= DEADLINE) {
    status = "On Track";
    statusClass = "text-on-tertiary-container bg-tertiary-fixed";
    statusIcon = "check_circle";
  } else {
    const daysOver = Math.ceil((projectedDate - DEADLINE) / msPerDay);
    if (daysOver <= 3) {
      status = "At Risk";
      statusClass = "text-[#7c5800] bg-[#ffedb3]";
      statusIcon = "warning";
    } else {
      status = "Behind";
      statusClass = "text-on-error-container bg-error-container";
      statusIcon = "error";
    }
  }

  // Required pace (per working day)
  const requiredPerDay = workDaysRemaining > 0 ? (remaining / workDaysRemaining).toFixed(1) : "—";

  // Render
  const banner = document.getElementById("deadline-banner");
  banner.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-2xl ${remaining === 0 ? 'text-on-tertiary-container' : workDaysRemaining <= 5 ? 'text-error' : 'text-primary'}">calendar_today</span>
        <div>
          <span class="font-headline font-bold text-2xl text-primary">${workDaysRemaining}</span>
          <span class="font-body text-sm text-on-surface-variant ml-1">work days until April 10</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block">Remaining</span>
          <span class="font-headline font-bold text-lg text-primary">${remaining} widgets</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block">Pace Needed</span>
          <span class="font-headline font-bold text-lg text-primary">${requiredPerDay}/day</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block">Velocity</span>
          <span class="font-headline font-bold text-lg text-primary">${velocity > 0 ? velocity.toFixed(1) + '/day' : '—'}</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block">Projected</span>
          <span class="font-headline font-bold text-lg text-primary">${projectedDate ? projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full ${statusClass}">
        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">${statusIcon}</span>
        <span class="font-label text-[11px] font-bold uppercase tracking-wider">${status}</span>
      </div>
    </div>
  `;
}

/**
 * Handle real-time widget updates.
 */
async function onDashboardUpdate(widgets) {
  updateStats(widgets);
  updateDeadlineBanner(widgets);
  const history = await getStageHistory();
  updateFlowChart(widgets, history);
  updateActivityChart(history);
}

/**
 * Initialize dashboard.
 */
async function init() {
  onWidgetsChange(null, onDashboardUpdate);
}

init();
