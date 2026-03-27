// Pipeline board logic — rendering, drag-and-drop, filtering, detail modal

let currentFilter = "all";
let unsubscribe = null;
let widgetMap = {}; // id -> widget data for modal lookup

// Priority badge config
const PRIORITY_CONFIG = {
  P1: { class: "badge-p1", label: "P1" },
  P2: { class: "badge-p2", label: "P2" },
  P3: { class: "badge-p3", label: "P3" },
  BLOCKED: { class: "badge-blocked", label: "BLOCKED" }
};

const CHANNEL_CONFIG = {
  TPO: { class: "badge-tpo" },
  Retail: { class: "badge-retail" },
  Both: { class: "badge-both" },
  "N/A": { class: "badge-both" }
};

// Top metadata fields — rendered in a 2x2 grid
const GRID_FIELDS = [
  { key: "tier", label: "Tier" },
  { key: "priority", label: "Priority" },
  { key: "channel", label: "Channel" },
  { key: "stage", label: "Current Stage" }
];

// Remaining fields — rendered full-width below the grid
const DETAIL_FIELDS = [
  { key: "filters", label: "Required Filters", codeChips: true },
  { key: "fieldsNeeded", label: "Fields Needed", codeChips: true },
  { key: "currentDataSource", label: "Current Data Source" },
  { key: "architectureNotes", label: "Architecture Notes" },
  { key: "createdAt", label: "Created", format: v => formatTimestamp(v) },
  { key: "updatedAt", label: "Updated", format: v => formatTimestamp(v) }
];

function formatTimestamp(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

/**
 * Render a single widget card.
 */
function renderCard(widget) {
  const priority = PRIORITY_CONFIG[widget.priority] || PRIORITY_CONFIG.P3;
  const channel = CHANNEL_CONFIG[widget.channel] || CHANNEL_CONFIG["N/A"];
  const isValidated = widget.stage === "Validated";

  return `
    <div class="widget-card bg-surface-container-lowest p-4 rounded-xl shadow-[0_4px_12px_rgba(0,30,64,0.02)] border border-outline-variant/10 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${isValidated ? 'border-l-4 border-l-on-tertiary-container' : ''}"
         data-id="${widget.id}">
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.class}">${priority.label}</span>
          <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${channel.class}">${widget.channel}</span>
          <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${widget.tier === 'Tier 1' ? 'badge-tier1' : 'badge-tier2'}">${widget.tier === 'Tier 1' ? 'T1' : 'T2'}</span>
          ${isValidated ? '<span class="material-symbols-outlined text-on-tertiary-container text-sm ml-auto" style="font-variation-settings: \'FILL\' 1;">verified</span>' : ''}
        </div>
        <h4 class="font-body font-semibold text-sm text-on-surface leading-tight">${widget.name}</h4>
      </div>
    </div>
  `;
}

/**
 * Show the detail modal for a widget.
 */
function showDetail(widgetId) {
  const widget = widgetMap[widgetId];
  if (!widget) return;

  const priority = PRIORITY_CONFIG[widget.priority] || PRIORITY_CONFIG.P3;
  const channel = CHANNEL_CONFIG[widget.channel] || CHANNEL_CONFIG["N/A"];

  const gridCells = GRID_FIELDS.map(field => {
    let value = widget[field.key];
    if (field.format) value = field.format(value);
    if (value === undefined || value === null || value === "") value = "—";
    return `
      <div class="flex flex-col gap-0.5">
        <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">${field.label}</span>
        <span class="font-body text-sm text-on-surface">${value}</span>
      </div>
    `;
  }).join("");

  const rows = DETAIL_FIELDS.map(field => {
    let value = widget[field.key];
    if (field.format) value = field.format(value);
    if (value === undefined || value === null || value === "") value = "—";

    let rendered;
    if (field.codeChips && value !== "—") {
      const cleaned = value.replace(/,\s*(optional|required)/gi, '');
      const chips = cleaned.split('),').map(v => v.trim().replace(/\)$/, '')).map(v => v.includes('(') ? v + ')' : v).filter(Boolean);
      rendered = `<div class="flex flex-wrap gap-1.5 mt-1">${chips.map(c =>
        `<code class="font-mono text-[11px] text-on-surface bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/10">${c}</code>`
      ).join("")}</div>`;
    } else {
      rendered = `<span class="font-body text-sm text-on-surface">${value}</span>`;
    }

    return `
      <div class="flex flex-col gap-0.5 py-3 border-b border-outline-variant/10 last:border-b-0">
        <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">${field.label}</span>
        ${rendered}
      </div>
    `;
  }).join("");

  const modal = document.getElementById("widget-modal");
  const content = document.getElementById("modal-content");

  content.innerHTML = `
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.class}">${priority.label}</span>
        <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${channel.class}">${widget.channel}</span>
        <span class="font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${widget.tier === 'Tier 1' ? 'badge-tier1' : 'badge-tier2'}">${widget.tier}</span>
      </div>
      <button id="modal-close" class="text-on-surface-variant/60 hover:text-on-surface transition-colors">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <h3 class="font-headline font-bold text-xl text-primary mb-2">${widget.name}</h3>
    ${widget.endpoint ? `<code class="font-mono text-[11px] text-surface-tint bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/10 inline-block mb-4">${widget.endpoint}</code>` : ''}
    <div class="mb-4">
      <button id="toggle-blocked" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${widget.priority === 'BLOCKED' ? 'badge-blocked border-error/20' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'}">
        <span class="material-symbols-outlined text-sm">${widget.priority === 'BLOCKED' ? 'block' : 'check_circle'}</span>
        ${widget.priority === 'BLOCKED' ? 'Blocked' : 'Mark as Blocked'}
      </button>
    </div>
    <div class="grid grid-cols-2 gap-4 py-3 mb-3 border-b border-outline-variant/10">${gridCells}</div>
    <div class="flex flex-col">${rows}</div>
  `;

  modal.classList.remove("hidden");
  document.getElementById("modal-close").addEventListener("click", hideDetail);
  document.getElementById("toggle-blocked").addEventListener("click", () => toggleBlocked(widgetId));
}

function hideDetail() {
  document.getElementById("widget-modal").classList.add("hidden");
}

async function toggleBlocked(widgetId) {
  const widget = widgetMap[widgetId];
  if (!widget) return;

  const newPriority = widget.priority === "BLOCKED" ? widget._prevPriority || "P2" : widget.priority;
  const updates = {
    priority: widget.priority === "BLOCKED" ? newPriority : "BLOCKED",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Store previous priority so we can restore it when unblocking
  if (widget.priority !== "BLOCKED") {
    updates._prevPriority = widget.priority;
  }

  await db.collection("widgets").doc(widgetId).update(updates);

  // Re-fetch and re-render the modal in place
  const updatedDoc = await db.collection("widgets").doc(widgetId).get();
  widgetMap[widgetId] = { id: widgetId, ...updatedDoc.data() };
  showDetail(widgetId);
}

/**
 * Render the entire Kanban board.
 */
function renderBoard(widgets) {
  // Update lookup map
  widgetMap = {};
  widgets.forEach(w => { widgetMap[w.id] = w; });

  const board = document.getElementById("kanban-board");
  board.innerHTML = "";

  STAGES.forEach(stage => {
    const stageWidgets = widgets.filter(w => w.stage === stage);
    const isValidated = stage === "Validated";

    const column = document.createElement("div");
    column.className = "kanban-column";
    column.innerHTML = `
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <div class="w-1 h-6 ${isValidated ? 'bg-on-tertiary-container' : 'bg-surface-tint'} rounded-full"></div>
          <h3 class="font-label text-xs font-bold uppercase tracking-wider ${isValidated ? 'text-on-tertiary-container' : 'text-on-surface-variant'}">${stage}</h3>
          <span class="${isValidated ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high'} px-2 py-0.5 rounded-full text-[10px] font-bold">${stageWidgets.length}</span>
        </div>
      </div>
      <div class="card-list flex flex-col gap-3 min-h-[8rem]" data-stage="${stage}">
        ${stageWidgets.length > 0
          ? stageWidgets.map(renderCard).join("")
          : `<div class="border-2 border-dashed border-outline-variant/20 rounded-xl h-32 flex items-center justify-center">
               <span class="text-[10px] font-label text-on-surface-variant/40 uppercase tracking-widest">No Widgets</span>
             </div>`
        }
      </div>
    `;

    board.appendChild(column);
  });

  // Initialize SortableJS on each column's card list
  document.querySelectorAll(".card-list").forEach(list => {
    Sortable.create(list, {
      group: "pipeline",
      animation: 200,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: handleDrop,
      // Track drag vs click — only open modal on clean clicks
      onChoose: () => { window._dragging = true; },
      onUnchoose: () => { setTimeout(() => { window._dragging = false; }, 50); }
    });
  });

  // Attach click listeners (distinguish from drag)
  document.querySelectorAll(".widget-card").forEach(card => {
    let startX, startY;
    card.addEventListener("pointerdown", e => {
      startX = e.clientX;
      startY = e.clientY;
    });
    card.addEventListener("click", e => {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      // Only open modal if the pointer barely moved (not a drag)
      if (dx < 5 && dy < 5) {
        showDetail(card.dataset.id);
      }
    });
  });
}

/**
 * Handle a card being dropped into a new column.
 */
async function handleDrop(evt) {
  const cardEl = evt.item;
  const widgetId = cardEl.dataset.id;
  const newStage = evt.to.dataset.stage;
  const newIndex = evt.newIndex;

  try {
    await updateWidgetStage(widgetId, newStage, newIndex);
  } catch (err) {
    console.error("Failed to update widget stage:", err);
  }
}

/**
 * Set up tier filter buttons.
 */
function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => {
        b.classList.remove("active");
        b.classList.add("text-on-surface-variant", "bg-surface-container-lowest");
      });
      btn.classList.add("active");
      btn.classList.remove("text-on-surface-variant", "bg-surface-container-lowest");

      const filter = btn.dataset.filter;
      currentFilter = filter;
      subscribeToWidgets();
    });
  });
}

/**
 * Subscribe to real-time widget updates with current filter.
 */
function subscribeToWidgets() {
  if (unsubscribe) unsubscribe();

  const tierFilter = currentFilter === "all" ? null : currentFilter;
  unsubscribe = onWidgetsChange(tierFilter, renderBoard);
}

/**
 * Initialize the app.
 */
async function init() {
  await seedWidgets();
  initFilters();
  initModal();
  subscribeToWidgets();
}

/**
 * Set up modal backdrop click-to-close and Escape key.
 */
function initModal() {
  const modal = document.getElementById("widget-modal");
  modal.addEventListener("click", e => {
    if (e.target === modal) hideDetail();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideDetail();
  });
}

init();
