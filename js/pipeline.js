// Pipeline board logic — rendering, drag-and-drop, filtering, detail modal

let currentFilter = "all";
let currentSearch = "";
let unsubscribe = null;
let widgetMap = {}; // id -> widget data for modal lookup

// Team members for assignment
const TEAM_MEMBERS = ["Julian", "Freddie", "Bedon", "JP", "John", "Daniel", "James M", "Plainbox QA"];

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
  { key: "updatedAt", label: "Updated", format: v => formatTimestamp(v) },
  { key: "lastUpdatedBy", label: "Updated By" }
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
          ${widget.userNotes ? `<span class="material-symbols-outlined text-on-surface-variant/50 text-sm ${isValidated ? '' : 'ml-auto'}" style="font-variation-settings: 'FILL' 1; font-size:16px;" title="Has notes">sticky_note_2</span>` : ''}
        </div>
        <h4 class="font-body font-semibold text-sm text-on-surface leading-tight">${widget.name}</h4>
        ${widget.assignedTo ? `<div class="flex items-center gap-1 mt-0.5"><span class="material-symbols-outlined text-on-surface-variant/50" style="font-size:14px">person</span><span class="font-label text-[10px] text-on-surface-variant/70">${widget.assignedTo}</span></div>` : ''}
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
    <div class="flex items-center gap-3 mb-4">
      <button id="toggle-blocked" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${widget.priority === 'BLOCKED' ? 'badge-blocked border-error/20' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'}">
        <span class="material-symbols-outlined text-sm">${widget.priority === 'BLOCKED' ? 'block' : 'check_circle'}</span>
        ${widget.priority === 'BLOCKED' ? 'Blocked' : 'Mark as Blocked'}
      </button>
      <div class="flex items-center gap-2 ml-auto">
        <span class="material-symbols-outlined text-on-surface-variant/50" style="font-size:18px">person</span>
        <select id="assign-select" class="bg-surface-container rounded-lg border border-outline-variant/15 px-3 py-1.5 font-body text-sm text-on-surface focus:outline-none focus:border-surface-tint cursor-pointer">
          <option value="">Unassigned</option>
          ${TEAM_MEMBERS.map(m => `<option value="${m}" ${widget.assignedTo === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 py-3 mb-3 border-b border-outline-variant/10">${gridCells}</div>
    <div class="flex flex-col">${rows}</div>
    <div class="mt-4 pt-4 border-t border-outline-variant/10">
      <span class="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50 block mb-2">Notes</span>
      <textarea id="widget-notes" class="w-full bg-surface-container rounded-lg border border-outline-variant/10 p-3 font-body text-sm text-on-surface resize-none focus:outline-none focus:border-surface-tint" rows="3" placeholder="Add a note...">${widget.userNotes || ''}</textarea>
      <div class="flex gap-2 mt-2">
        <button id="save-notes" class="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all">Save</button>
        ${widget.userNotes ? `<button id="delete-notes" class="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-outline-variant/20 text-on-surface-variant hover:text-error hover:border-error/20 transition-all">Delete</button>` : ''}
      </div>
    </div>
    <div class="mt-4 pt-4 border-t border-outline-variant/10">
      <button id="delete-widget-btn" class="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-outline-variant/20 text-on-surface-variant transition-all">Delete Card</button>
    </div>
  `;

  modal.classList.remove("hidden");
  document.getElementById("modal-close").addEventListener("click", hideDetail);
  document.getElementById("toggle-blocked").addEventListener("click", () => toggleBlocked(widgetId));
  document.getElementById("assign-select").addEventListener("change", (e) => assignWidget(widgetId, e.target.value));
  document.getElementById("save-notes").addEventListener("click", () => saveNotes(widgetId));
  const deleteBtn = document.getElementById("delete-notes");
  if (deleteBtn) deleteBtn.addEventListener("click", () => deleteNotes(widgetId));
  document.getElementById("delete-widget-btn").addEventListener("click", () => deleteWidget(widgetId));
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
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: getCurrentUser()
  };

  // Store previous priority so we can restore it when unblocking
  if (widget.priority !== "BLOCKED") {
    updates._prevPriority = widget.priority;
  }

  const isNowBlocked = updates.priority === "BLOCKED";
  await db.collection("widgets").doc(widgetId).update(updates);

  logWidgetChange(widgetId, widget.name, isNowBlocked ? "blocked" : "unblocked", widget.priority, updates.priority);
  notifyBlockedChange(widget.name, isNowBlocked, getCurrentUser());

  // Re-fetch and re-render the modal in place
  const updatedDoc = await db.collection("widgets").doc(widgetId).get();
  widgetMap[widgetId] = { id: widgetId, ...updatedDoc.data() };
  showDetail(widgetId);
}

async function saveNotes(widgetId) {
  const textarea = document.getElementById("widget-notes");
  const btn = document.getElementById("save-notes");
  const note = textarea.value.trim();

  const oldNotes = widgetMap[widgetId].userNotes || null;
  await db.collection("widgets").doc(widgetId).update({
    userNotes: note,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: getCurrentUser()
  });

  logWidgetChange(widgetId, widgetMap[widgetId].name, "note_saved", oldNotes, note);
  widgetMap[widgetId].userNotes = note;
  if (note) {
    notifyNoteAdded(widgetMap[widgetId].name, note, widgetMap[widgetId].stage, getCurrentUser());
  }
  btn.textContent = "Saved";
  setTimeout(() => { btn.textContent = "Save"; }, 1500);
}

async function deleteNotes(widgetId) {
  const oldNotes = widgetMap[widgetId].userNotes || null;
  await db.collection("widgets").doc(widgetId).update({
    userNotes: firebase.firestore.FieldValue.delete(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: getCurrentUser()
  });

  logWidgetChange(widgetId, widgetMap[widgetId].name, "note_deleted", oldNotes, null);
  widgetMap[widgetId].userNotes = null;
  showDetail(widgetId);
}

async function assignWidget(widgetId, assignee) {
  const updates = {
    assignedTo: assignee || firebase.firestore.FieldValue.delete(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: getCurrentUser()
  };

  const oldAssignee = widgetMap[widgetId].assignedTo || null;
  await db.collection("widgets").doc(widgetId).update(updates);

  logWidgetChange(widgetId, widgetMap[widgetId].name, assignee ? "assigned" : "unassigned", oldAssignee, assignee || null);
  widgetMap[widgetId].assignedTo = assignee || null;
}

/**
 * Add a new widget card to Firestore.
 */
async function addCard(name, priority, tier, channel, endpoint, filters, fieldsNeeded, currentDataSource, architectureNotes) {
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection("widgets").add({
    name,
    priority,
    tier,
    channel,
    stage: "Field Mapping",
    stageOrder: 9999,
    validated: false,
    notes: "",
    endpoint: endpoint || "",
    filters: filters || "",
    fieldsNeeded: fieldsNeeded || "",
    currentDataSource: currentDataSource || "",
    architectureNotes: architectureNotes || "",
    issues: 0,
    createdAt: now,
    updatedAt: now,
    lastUpdatedBy: getCurrentUser()
  });
  logWidgetChange(ref.id, name, "created", null, "Field Mapping");
}

/**
 * Delete a widget card from Firestore (with confirmation state).
 */
async function deleteWidget(widgetId) {
  const widget = widgetMap[widgetId];
  const btn = document.getElementById("delete-widget-btn");
  if (!btn) return;

  if (btn.dataset.confirm !== "true") {
    btn.dataset.confirm = "true";
    btn.textContent = "Confirm Delete";
    btn.classList.add("badge-blocked");
    btn.classList.remove("text-on-surface-variant", "border-outline-variant/20");
    setTimeout(() => {
      if (btn && btn.dataset.confirm === "true") {
        btn.dataset.confirm = "";
        btn.textContent = "Delete Card";
        btn.classList.remove("badge-blocked");
        btn.classList.add("text-on-surface-variant", "border-outline-variant/20");
      }
    }, 3000);
    return;
  }

  await db.collection("widgets").doc(widgetId).delete();
  logWidgetChange(widgetId, widget?.name || widgetId, "deleted", widget?.stage || null, null);
  hideDetail();
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
      <div class="card-list flex flex-col gap-3 min-h-[8rem] flex-1 pb-40" data-stage="${stage}">
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

  // Auto-scroll state for drag operations
  let _autoScrollRAF = null;

  function startAutoScroll(evt) {
    window._dragging = true;
    // Listen for mousemove/touchmove to auto-scroll while dragging
    const onPointerMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const edgeSize = 80; // px from viewport edge to trigger scroll
      const maxSpeed = 18; // px per frame

      cancelAnimationFrame(_autoScrollRAF);

      const scrollUp = clientY < edgeSize;
      const scrollDown = clientY > window.innerHeight - edgeSize;

      if (!scrollUp && !scrollDown) return;

      const tick = () => {
        if (scrollDown) {
          const intensity = 1 - (window.innerHeight - clientY) / edgeSize;
          window.scrollBy(0, Math.ceil(maxSpeed * intensity));
        } else if (scrollUp) {
          const intensity = 1 - clientY / edgeSize;
          window.scrollBy(0, -Math.ceil(maxSpeed * intensity));
        }
        _autoScrollRAF = requestAnimationFrame(tick);
      };
      _autoScrollRAF = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("touchmove", onPointerMove, { passive: true });

    // Store cleanup so onEnd/onUnchoose can remove listeners
    window._autoScrollCleanup = () => {
      cancelAnimationFrame(_autoScrollRAF);
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("touchmove", onPointerMove);
    };
  }

  function stopAutoScroll() {
    if (window._autoScrollCleanup) window._autoScrollCleanup();
    setTimeout(() => { window._dragging = false; }, 50);
  }

  // Initialize SortableJS on each column's card list
  document.querySelectorAll(".card-list").forEach(list => {
    Sortable.create(list, {
      group: "pipeline",
      animation: 200,
      forceFallback: true,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      scroll: true,
      scrollSensitivity: 100,
      scrollSpeed: 20,
      bubbleScroll: true,
      forceAutoScrollFallback: true,
      onStart: startAutoScroll,
      onEnd: (evt) => { stopAutoScroll(); handleDrop(evt); }
    });
  });

  // Allow mouse wheel scrolling while dragging a card.
  // Use capture phase so we intercept before SortableJS can preventDefault.
  document.addEventListener("wheel", (e) => {
    if (window._dragging) {
      e.preventDefault();
      window.scrollBy(0, e.deltaY);
    }
  }, { capture: true, passive: false });

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
  const widget = widgetMap[widgetId];
  const oldStage = widget ? widget.stage : "Unknown";

  try {
    await updateWidgetStage(widgetId, newStage, newIndex);
    if (widget && oldStage !== newStage) {
      logWidgetChange(widgetId, widget.name, "stage_change", oldStage, newStage);
      notifyStageChange(widget.name, oldStage, newStage, getCurrentUser());
    }
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
function applyFilter(widgets) {
  switch (currentFilter) {
    case "Tier 1":
    case "Tier 2":
      return widgets.filter(w => w.tier === currentFilter);
    case "blocked":
      return widgets.filter(w => w.priority === "BLOCKED");
    default:
      return widgets;
  }
}

function subscribeToWidgets() {
  if (unsubscribe) unsubscribe();

  unsubscribe = onWidgetsChange(null, widgets => {
    let filtered = applyFilter(widgets);
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(w => w.name.toLowerCase().includes(q));
    }
    renderBoard(filtered);
  });
}

/**
 * Initialize the app.
 */
function initSearch() {
  const toggle = document.getElementById("search-toggle");
  const input = document.getElementById("search-input");
  let open = false;

  toggle.addEventListener("click", () => {
    open = !open;
    if (open) {
      requestAnimationFrame(() => {
        input.style.maxWidth = "200px";
        input.style.opacity = "1";
        input.style.paddingLeft = "0.75rem";
        input.style.paddingRight = "0.75rem";
        input.focus();
      });
    } else {
      input.style.maxWidth = "0";
      input.style.opacity = "0";
      input.style.paddingLeft = "0";
      input.style.paddingRight = "0";
      input.value = "";
      currentSearch = "";
      subscribeToWidgets();
    }
  });

  input.addEventListener("input", () => {
    currentSearch = input.value;
    subscribeToWidgets();
  });

  // Close on Escape
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      toggle.click();
    }
  });
}

async function init() {
  initFilters();
  initSearch();
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
    if (e.key === "Escape") {
      hideDetail();
      hideAddCard();
    }
  });

  // Add Card modal
  const addModal = document.getElementById("add-card-modal");
  document.getElementById("add-card-btn").addEventListener("click", () => {
    document.getElementById("new-card-name").value = "";
    document.getElementById("new-card-priority").value = "P2";
    document.getElementById("new-card-tier").value = "Tier 1";
    document.getElementById("new-card-channel").value = "Both";
    document.getElementById("new-card-endpoint").value = "";
    document.getElementById("new-card-filters").value = "";
    document.getElementById("new-card-fields").value = "";
    document.getElementById("new-card-source").value = "";
    document.getElementById("new-card-arch").value = "";
    document.getElementById("add-card-error").classList.add("hidden");
    addModal.classList.remove("hidden");
    setTimeout(() => document.getElementById("new-card-name").focus(), 50);
  });

  document.getElementById("add-card-close").addEventListener("click", hideAddCard);
  addModal.addEventListener("click", e => { if (e.target === addModal) hideAddCard(); });

  document.getElementById("add-card-submit").addEventListener("click", async () => {
    const name = document.getElementById("new-card-name").value.trim();
    const errorEl = document.getElementById("add-card-error");
    if (!name) {
      errorEl.textContent = "Name is required.";
      errorEl.classList.remove("hidden");
      return;
    }
    const btn = document.getElementById("add-card-submit");
    btn.textContent = "Adding...";
    btn.disabled = true;
    try {
      await addCard(
        name,
        document.getElementById("new-card-priority").value,
        document.getElementById("new-card-tier").value,
        document.getElementById("new-card-channel").value,
        document.getElementById("new-card-endpoint").value.trim(),
        document.getElementById("new-card-filters").value.trim(),
        document.getElementById("new-card-fields").value.trim(),
        document.getElementById("new-card-source").value.trim(),
        document.getElementById("new-card-arch").value.trim()
      );
      hideAddCard();
    } catch (err) {
      errorEl.textContent = "Failed to add card. Try again.";
      errorEl.classList.remove("hidden");
      btn.textContent = "Add Card";
      btn.disabled = false;
    }
  });
}

function hideAddCard() {
  document.getElementById("add-card-modal").classList.add("hidden");
}

init();
