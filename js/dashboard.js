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

/**
 * Handle real-time widget updates.
 */
function onDashboardUpdate(widgets) {
  updateStats(widgets);
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
