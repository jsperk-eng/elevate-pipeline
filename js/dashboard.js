// Dashboard logic — stats, charts, real-time updates

let stagesChart = null;
let priorityChart = null;

const CHART_COLORS = {
  stages: [
    "#3a5f94", // Field Mapping
    "#515f74", // Create DB Tables
    "#737780", // Glue Extraction
    "#a7c8ff", // Lambda Refactor
    "#d5e3ff", // Widget Review
    "#b9c7df", // End User QA
    "#00b27b"  // Validated
  ],
  priority: {
    P1: "#1f477b",
    P2: "#ba1a1a",
    P3: "#3a485b",
    BLOCKED: "#ffdad6"
  }
};

/**
 * Update stat cards.
 */
function updateStats(widgets) {
  const total = widgets.length;
  const validated = widgets.filter(w => w.stage === "Validated").length;
  const p2Remaining = widgets.filter(w => w.priority === "P2" && w.stage !== "Validated").length;
  const blocked = widgets.filter(w => w.priority === "BLOCKED").length;
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-validated").textContent = validated;
  document.getElementById("stat-p2").textContent = p2Remaining;
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
 * Create or update the stages bar chart.
 */
function updateStagesChart(widgets) {
  const stageCounts = STAGES.map(stage =>
    widgets.filter(w => w.stage === stage).length
  );

  const ctx = document.getElementById("chart-stages").getContext("2d");

  if (stagesChart) {
    stagesChart.data.datasets[0].data = stageCounts;
    stagesChart.update();
    return;
  }

  stagesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: STAGES.map(s => s.length > 14 ? s.slice(0, 12) + "..." : s),
      datasets: [{
        data: stageCounts,
        backgroundColor: CHART_COLORS.stages,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => STAGES[items[0].dataIndex]
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: "Inter", size: 10 } },
          grid: { color: "rgba(195, 198, 209, 0.2)" }
        },
        x: {
          ticks: { font: { family: "Inter", size: 9 }, maxRotation: 45 },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Create or update the priority doughnut chart.
 */
function updatePriorityChart(widgets) {
  const priorities = ["P1", "P2", "P3", "BLOCKED"];
  const counts = priorities.map(p => widgets.filter(w => w.priority === p).length);

  const ctx = document.getElementById("chart-priority").getContext("2d");

  if (priorityChart) {
    priorityChart.data.datasets[0].data = counts;
    priorityChart.update();
    return;
  }

  priorityChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: priorities,
      datasets: [{
        data: counts,
        backgroundColor: priorities.map(p => CHART_COLORS.priority[p]),
        borderWidth: 2,
        borderColor: "#f7f9fb"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "Inter", size: 11 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        }
      }
    }
  });
}

// Deadline: April 10, 2026
const DEADLINE = new Date("2026-04-10T23:59:59");

/**
 * Calculate velocity and update the deadline banner.
 */
function updateDeadlineBanner(widgets) {
  const now = new Date();
  const msPerDay = 86400000;
  const daysRemaining = Math.max(0, Math.ceil((DEADLINE - now) / msPerDay));

  const total = widgets.length;
  const validated = widgets.filter(w => w.stage === "Validated").length;
  const blocked = widgets.filter(w => w.priority === "BLOCKED").length;
  const remaining = total - validated - blocked;

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

    // 7-day rolling window
    const sevenDaysAgo = new Date(now - 7 * msPerDay);
    const recentCount = timestamps.filter(t => t >= sevenDaysAgo).length;

    if (recentCount > 0) {
      velocity = recentCount / 7;
    } else {
      velocity = validatedWithTimestamp.length / daysSinceFirst;
    }
  }

  if (velocity > 0 && remaining > 0) {
    const daysToComplete = remaining / velocity;
    projectedDate = new Date(now.getTime() + daysToComplete * msPerDay);
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

  // Required pace
  const requiredPerDay = daysRemaining > 0 ? (remaining / daysRemaining).toFixed(1) : "—";

  // Render
  const banner = document.getElementById("deadline-banner");
  banner.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-2xl ${remaining === 0 ? 'text-on-tertiary-container' : daysRemaining <= 5 ? 'text-error' : 'text-primary'}">calendar_today</span>
        <div>
          <span class="font-headline font-bold text-2xl text-primary">${daysRemaining}</span>
          <span class="font-body text-sm text-on-surface-variant ml-1">days until April 10</span>
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
function onDashboardUpdate(widgets) {
  updateStats(widgets);
  updateDeadlineBanner(widgets);
  updateStagesChart(widgets);
  updatePriorityChart(widgets);
}

/**
 * Initialize dashboard.
 */
async function init() {
  await seedWidgets();
  onWidgetsChange(null, onDashboardUpdate);
}

init();
