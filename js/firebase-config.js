// Firebase configuration for Elevate Pipeline
// Replace these values with your Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyBXz7yZj9Avhem1magx8aCoyYIZemcuZnY",
  authDomain: "pipeline-9e6bc.firebaseapp.com",
  projectId: "pipeline-9e6bc",
  storageBucket: "pipeline-9e6bc.firebasestorage.app",
  messagingSenderId: "394382009677",
  appId: "1:394382009677:web:9ad2c1d22d1d019e61c304"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Pipeline stages in order
const STAGES = [
  "Field Mapping",
  "Create DB Tables",
  "Glue Extraction",
  "Lambda Refactor",
  "Widget Review",
  "End User QA",
  "Validated"
];

// Widget seed data — all 42 widgets with full Rootstack API details
const WIDGET_SEED_DATA = [
  // ── Tier 1 / P1 — Completed ──
  {
    name: "Pull-Through Health (TPO)", tier: "Tier 1", priority: "P1", channel: "TPO", stage: "Validated",
    notes: "Done",
    endpoint: "GET /api/v1/widgets/tpo/pull-through-health",
    filters: "ae_username (string, optional), from_date (date, optional), limit/offset (int, optional)",
    fieldsNeeded: "loan_number, account_executive, account_executive_username, funds_released, loan_officer_name, lock_expiration_month, total_loan_amount, tpo_company_legal_name, tpo_company_name, business_channel_type, loan_status",
    currentDataSource: "Warehouse API (live)",
    architectureNotes: ""
  },
  {
    name: "Pull-Through Health – Client Detail (TPO)", tier: "Tier 1", priority: "P1", channel: "TPO", stage: "Validated",
    notes: "Done",
    endpoint: "GET /api/v1/widgets/tpo/pull-through-health/clients/{client_name}",
    filters: "ae_username (string, optional), from_date (date, optional), limit/offset (int, optional)",
    fieldsNeeded: "Same as Pull-Through Health, scoped to a single client",
    currentDataSource: "Warehouse API (live)",
    architectureNotes: ""
  },
  {
    name: "Retail Pull-Through Health", tier: "Tier 1", priority: "P1", channel: "Retail", stage: "Validated",
    notes: "Done (LO filter pending)",
    endpoint: "GET /api/v1/widgets/retail/pull-through-health",
    filters: "from_date (date, optional), limit/offset (int, optional). Pending: loan_officer_name (string, optional) — Julián building 2026-03-25",
    fieldsNeeded: "Same fields as TPO Pull-Through Health",
    currentDataSource: "Warehouse API (live)",
    architectureNotes: "Retail is per-LO, not per-AE. LO filter needed."
  },

  {
    name: "Price Lock Alert", tier: "Tier 1", priority: "P1", channel: "TPO", stage: "Field Mapping",
    notes: "",
    endpoint: "",
    filters: "",
    fieldsNeeded: "",
    currentDataSource: "",
    architectureNotes: ""
  },

  // ── Tier 1 / P2 — Active widgets on stale/fake data ──
  {
    name: "Pipeline Alerts", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Endpoint created by Julián (2026-03-25), filters pending. Retail: stale Excel; TPO: fake seeded",
    endpoint: "GET /api/v1/widgets/pipeline-alerts",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "originator_loan_status (fusion_prod.origination), locked_at (fusion_prod.secondary), lock_exp_at (fusion_prod.secondary), estimated_closing_at (fusion_prod.origination)",
    currentDataSource: "Retail: active_locks (stale Excel import, Jan 2026). TPO: seeded loans table (fake)",
    architectureNotes: "Currently fabricates UW condition alerts from hardcoded pool. Rootstack must either provide real condition data or confirm first version is lock-expiration + stuck-file alerts only."
  },
  {
    name: "Pipeline Visualizer", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Retail: stale Excel import; TPO: fake seeded data",
    endpoint: "New endpoint or extend existing",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "originator_loan_status (fusion_prod.origination), approved_at (fusion_prod.underwrite — 584 populated), clear_to_close_at (fusion_prod.underwrite — 402 populated)",
    currentDataSource: "Retail: active_locks (stale Excel). TPO: seeded loans (fake)",
    architectureNotes: "Shows loans bucketed by pipeline stage: Application → Processing → UW → Approved → CTC → Funded"
  },
  {
    name: "Lock Activity", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Retail: stale Excel import; TPO: fake seeded data",
    endpoint: "New endpoint",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), from_date/to_date (date, optional — on locked_at), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "locked_at (fusion_prod.secondary — 603 populated), lock_exp_at (fusion_prod.secondary), lock_days (fusion_prod.secondary — 1925 populated)",
    currentDataSource: "Retail: active_locks (stale Excel). TPO: seeded loans (fake)",
    architectureNotes: "Shows lock volume by time period (today, this week, this month)"
  },
  {
    name: "Funded Loans", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Retail: stale Excel import; TPO: fake seeded data",
    endpoint: "New endpoint or extend existing",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), from_date/to_date (date, optional — on funded_at), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "funded_at (fusion_prod.fund — 324 populated), funds_sent_at (fusion_prod.fund)",
    currentDataSource: "Retail: active_locks (stale Excel). TPO: seeded loans (fake)",
    architectureNotes: "Shows funded loan volume by time period"
  },
  {
    name: "Locks by Officer", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "SVP-level view. Fake seeded data",
    endpoint: "New endpoint (SVP-level view)",
    filters: "business_channel_type (string, optional), from_date/to_date (date, optional — on locked_at), limit/offset (int, optional). NO ae_username/loan_officer_name — returns all officers.",
    fieldsNeeded: "originator_first_name (fusion_prod.origination — 1910 populated), originator_last_name, originator_username, locked_at (fusion_prod.secondary)",
    currentDataSource: "Seeded loans table (100% fake)",
    architectureNotes: "Team-level view — no individual LO filter. Returns all officers."
  },
  {
    name: "Locks by Type", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Fake seeded data",
    endpoint: "New endpoint or extend Lock Activity",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), from_date/to_date (date, optional), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "mortgage_type (fusion_prod.loan — Conv: 1120, FHA: 418, USDA: 162, VA: 95), locked_at (fusion_prod.secondary)",
    currentDataSource: "Seeded loans table (100% fake)",
    architectureNotes: "Lock volume broken down by loan type (Conventional, FHA, VA, USDA)"
  },
  {
    name: "Product Mix (TPO)", tier: "Tier 1", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "Fake seeded loans + market data",
    endpoint: "New endpoint or extend existing",
    filters: "ae_username (string, optional), business_channel_type (string, optional), from_date/to_date (date, optional), limit/offset (int, optional)",
    fieldsNeeded: "mortgage_type (fusion_prod.loan), business_channel_type (fusion_prod.origination — Retail: 1371, Wholesale: 553)",
    currentDataSource: "Seeded loans + seeded market_data (both 100% fake)",
    architectureNotes: "Identifies gaps in loan type mix vs market. Market data needs external source."
  },
  {
    name: "PreQual Rescues", tier: "Tier 1", priority: "P2", channel: "Retail", stage: "Field Mapping",
    notes: "One-time JSON import (stale). No separate prequals table in fusion_prod",
    endpoint: "New prequal/early-stage loan endpoint",
    filters: "loan_officer_name (string, optional), ae_username (string, optional), originator_loan_status (string, optional), business_channel_type (string, optional), status_updated_before (date, optional — for 14+ days stale logic), limit/offset (int, optional)",
    fieldsNeeded: "loan_number, originator_loan_status (fusion_prod.origination), first_name + last_name (fusion_prod.borrower), email + phone_mobile (fusion_prod.borrower), total_loan_amount, loan_purpose_type",
    currentDataSource: "One-time JSON import (scripts/import-prequals.ts) into local prequals table — static/stale",
    architectureNotes: "No separate prequals table in fusion_prod. Prequals are loans with early-stage originator_loan_status: Application, File started, Started, Loan Started. Rootstack should confirm which timestamp best represents 'last activity' for stale-prequal logic."
  },
  {
    name: "Construction Loans", tier: "Tier 1", priority: "P2", channel: "Retail", stage: "Field Mapping",
    notes: "100% synthetic. Maturity/draw/%complete fields may not exist in warehouse",
    endpoint: "New construction-specific endpoint",
    filters: "loan_officer_name (string, optional), ae_username (string, optional), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "loan_number, construction_method_type (fusion_prod.property — only 10 records), first_name + last_name (fusion_prod.borrower), total_loan_amount, originator_loan_status, originator_first_name + originator_last_name, lock_exp_at (fusion_prod.secondary), funded_at, construction maturity date, drawn amount, percent complete, requal date, reclose date",
    currentDataSource: "Seeded fake construction loan data (100% synthetic)",
    architectureNotes: "fusion_prod.property.construction_method_type only has 10 records. If warehouse does NOT contain maturity/draw/%complete/requal/reclose fields, ELEVATE will need to redesign this widget."
  },
  {
    name: "Loan Counter / All Loans Count", tier: "Tier 1", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "Fake seeded data. Two endpoints need warehouse replacement",
    endpoint: "Dedicated aggregate/count endpoint preferred",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), originator_loan_status (string, optional), mortgage_type (string, optional)",
    fieldsNeeded: "Total count, counts by originator_loan_status, counts by mortgage_type. Aggregated output preferred over paginated loan rows.",
    currentDataSource: "Seeded loans table (100% fake). Two endpoints: GET /api/widgets/loan-counter and GET /api/widgets/all-loans-count",
    architectureNotes: "Both endpoints read from seeded loans table. Both need warehouse replacement."
  },

  // ── Tier 1 / P3 — Remaining ──
  {
    name: "Live Ranking (Retail)", tier: "Tier 1", priority: "P3", channel: "Retail", stage: "Field Mapping",
    notes: "Stale Excel import. Also depends on lo_ranking_snapshots",
    endpoint: "New retail ranking endpoint",
    filters: "business_channel_type (string, required — RETAIL), from_date/to_date (date, optional), limit/offset (int, optional). Returns ALL retail LOs — no individual LO filter.",
    fieldsNeeded: "originator_first_name + originator_last_name + originator_username (fusion_prod.origination), locked_at (fusion_prod.secondary), total_loan_amount",
    currentDataSource: "active_locks table (stale Excel import from Jan 2026)",
    architectureNotes: "Two endpoints: GET /api/widgets/live-ranking and GET /api/widgets/live-ranking/leaderboard. Also depends on local lo_ranking_snapshots for week-over-week movement and sparkline history. Rootstack must either provide historical rank/volume trend data or ELEVATE must rebuild snapshot generation off warehouse data."
  },
  {
    name: "Income Projection (Retail)", tier: "Tier 1", priority: "P3", channel: "Retail", stage: "Field Mapping",
    notes: "Stale Excel + stale JSON prequals",
    endpoint: "Can reuse Funded Loans + Lock Activity endpoints, or new income endpoint",
    filters: "loan_officer_name (string, required), from_date/to_date (date, optional), business_channel_type (string, optional), originator_loan_status (string, optional)",
    fieldsNeeded: "funded_at (fusion_prod.fund), locked_at (fusion_prod.secondary), total_loan_amount, originator_loan_status (if prequals replaced by early-stage loans)",
    currentDataSource: "active_locks (stale Excel) + seeded prequals (stale JSON). Does NOT depend on seeded loans.",
    architectureNotes: "Needs warehouse replacement for pipeline + funded production and Encompass-backed replacement for stale prequal logic."
  },
  {
    name: "TPO Loan Counter", tier: "Tier 1", priority: "P3", channel: "TPO", stage: "Field Mapping",
    notes: "Hits legacy AWS Lambda endpoint — needs migration",
    endpoint: "New TPO count endpoint or reuse Pull-Through Health",
    filters: "ae_username (string, required), business_channel_type (string, optional), limit/offset (int, optional)",
    fieldsNeeded: "originator_loan_status (fusion_prod.origination)",
    currentDataSource: "Legacy AWS Lambda (HelloWorld at vgmvb9dal6.execute-api.us-east-1.amazonaws.com)",
    architectureNotes: "Legacy endpoint must be migrated to Rootstack warehouse API."
  },
  {
    name: "Dashboard Metrics / Key Metrics", tier: "Tier 1", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "Retail: stale imports; TPO: fake seeded loans + clients",
    endpoint: "Can reuse Lock Activity + Funded Loans endpoints, or new aggregate endpoint",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), from_date/to_date (date, optional), originator_loan_status (string, optional)",
    fieldsNeeded: "locked_at, lock_exp_at, funded_at, total_loan_amount, originator_loan_status, loan_purpose_type (all already requested in other widgets)",
    currentDataSource: "Retail: active_locks (stale Excel) + prequals (stale JSON). TPO: seeded loans + clients (both 100% fake). ALL sources need warehouse replacement.",
    architectureNotes: "Top-level dashboard showing locks volume, funded volume, pipeline counts."
  },
  {
    name: "AE Performance (Dashboard)", tier: "Tier 1", priority: "P3", channel: "TPO", stage: "Field Mapping",
    notes: "Loads all seeded loans + clients into memory",
    endpoint: "New AE performance endpoint or reuse existing with aggregation",
    filters: "ae_username (string, optional), business_channel_type (string, optional), from_date/to_date (date, optional), limit/offset (int, optional)",
    fieldsNeeded: "business_channel_type (fusion_prod.origination), originator_loan_status, funded_at (fusion_prod.fund), account_executive_username, total_loan_amount",
    currentDataSource: "Reads ALL loans from seeded loans table + ALL clients from seeded clients table (both 100% fake). Loads everything into memory and filters.",
    architectureNotes: "AE-level performance metrics — locks volume, funded volume, pipeline counts per AE."
  },
  {
    name: "Rankings", tier: "Tier 1", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "Retail: stale active_locks + prequals",
    endpoint: "Can reuse Locks by Officer endpoint, or new ranking endpoint",
    filters: "business_channel_type (string, optional), from_date/to_date (date, optional), limit/offset (int, optional). Team-level — returns ALL AEs/LOs.",
    fieldsNeeded: "funded_at, locked_at, total_loan_amount, originator_username, originator_first_name, originator_last_name",
    currentDataSource: "Retail: stale active_locks + stale prequals (not seeded loans)",
    architectureNotes: "Needs warehouse replacement and likely a redesigned ranking contract."
  },
  {
    name: "Client List / Client Profile", tier: "Tier 1", priority: "P3", channel: "TPO", stage: "Field Mapping",
    notes: "Seeded fake clients. Needs warehouse-derived company list",
    endpoint: "Needs from Rootstack: company-level data",
    filters: "ae_username (string, optional), tpo_company_name (string, optional — needed for drill-downs), limit/offset (int, optional)",
    fieldsNeeded: "tpo_company_name (already in prod.loans), tpo_company_legal_name (already in prod.loans), stable company identifier (if available — prevents mapping back onto fake local client IDs)",
    currentDataSource: "Seeded fake clients table (100% synthetic TPO companies)",
    architectureNotes: "Real fix: derive client list from unique warehouse company values rather than maintaining separate seeded clients table. Client drill-down/profile routes must stop depending on seeded local clients and loans."
  },
  {
    name: "First 5 Deal Tracker", tier: "Tier 1", priority: "P3", channel: "TPO", stage: "Field Mapping",
    notes: "Seeded clients + loans. Needs 'first loan date' concept",
    endpoint: "Can reuse TPO Pull-Through Health endpoint (already has tpo_company_name + loan data)",
    filters: "ae_username (string, required), from_date/to_date (date, optional), tpo_company_name (string, optional)",
    fieldsNeeded: "tpo_company_name, loan_number, total_loan_amount, originator_loan_status, funded_at, plus reliable way to determine 'new relationship / first loan date' per TPO company",
    currentDataSource: "Seeded clients + loans tables (both 100% fake)",
    architectureNotes: "If relationship-start concept does not exist in warehouse data, widget needs revised business logic."
  },
  {
    name: "Goal Tracker Summary", tier: "Tier 1", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "Goals are real CRM data; volume actuals are fake",
    endpoint: "Can reuse Funded Loans + Lock Activity endpoints for actuals",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), from_date/to_date (date, optional — goal period)",
    fieldsNeeded: "funded_at, locked_at, total_loan_amount (all already requested in other widgets)",
    currentDataSource: "Goals/activities are user-set (real CRM). Volume actuals (funded/locked amounts) come from seeded loans (100% fake).",
    architectureNotes: "Only volume actuals need warehouse. Goals, check-ins, and activity logging are user-generated and stay local."
  },
  {
    name: "Morning Briefing", tier: "Tier 1", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "TPO: fake loans+clients; Retail: stale imports + fake market_data",
    endpoint: "Can reuse Pipeline Alerts + Lock Activity endpoints for loan context",
    filters: "ae_username (string, optional), loan_officer_name (string, optional), business_channel_type (string, optional), originator_loan_status (string, optional)",
    fieldsNeeded: "originator_loan_status, locked_at, lock_exp_at, funded_at, total_loan_amount (all already requested in other widgets)",
    currentDataSource: "TPO: seeded loans + clients (fake). Retail: stale active_locks, stale prequals, fake market_data. Tasks/activities are real CRM data.",
    architectureNotes: "Reusing Pipeline Alerts + Lock Activity may not be enough — current briefing also summarizes market-share and prequal-derived retail metrics."
  },

  // ── Tier 1 / BLOCKED ──
  {
    name: "Lead Source Alert", tier: "Tier 1", priority: "BLOCKED", channel: "Retail", stage: "Field Mapping",
    notes: "application_source_type 0% populated in warehouse",
    endpoint: "None — blocked",
    filters: "N/A",
    fieldsNeeded: "application_source_type (fusion_prod.origination) — 0% populated",
    currentDataSource: "No usable warehouse data",
    architectureNotes: "Lead source data does not exist in Encompass in a usable form. This is an ELEVATE-internal data capture problem, not a Rootstack issue."
  },
  {
    name: "Referral Sources", tier: "Tier 1", priority: "BLOCKED", channel: "Retail", stage: "Field Mapping",
    notes: "Referral source not in Encompass",
    endpoint: "None — blocked",
    filters: "N/A",
    fieldsNeeded: "Referral source field — not in Encompass",
    currentDataSource: "No usable warehouse data",
    architectureNotes: "Same as Lead Source Alert — referral source is not in Encompass. Needs ELEVATE-internal capture."
  },

  // ── Tier 2 — Local database widgets ──
  {
    name: "Prospect Momentum", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "AE-entered CRM data",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "prospects table (AE-entered: primaryContactName, contactPhone, contactEmail)",
    currentDataSource: "ELEVATE local DB — prospects table (user-entered)",
    architectureNotes: "Prospects aren't in clients table yet (not onboarded), so no Contact Directory entries. AE enters contact manually."
  },
  {
    name: "Contact Directory", tier: "Tier 2", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "User-created CRM data",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "contacts table (personal + encompass sources)",
    currentDataSource: "ELEVATE local DB — contacts table with source = 'personal' (user CRUD) and source = 'encompass' (read-only sync)",
    architectureNotes: "Three contact sources: Encompass Loan Files (read-only), Encompass Contacts/Company Directory (read-only), Personal Contacts (full CRUD)."
  },
  {
    name: "Outreach Metrics", tier: "Tier 2", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "User-logged activities",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Activity logs (calls, emails, meetings)",
    currentDataSource: "ELEVATE local DB — user-logged activities",
    architectureNotes: ""
  },
  {
    name: "Neglect Radar", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "Derived from activity logs",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "clients table, contacts table (pre-selected primary contact), activity logs for last-contact date",
    currentDataSource: "ELEVATE local DB — derived from activity frequency per client",
    architectureNotes: "Uses QuickActions component with single pre-selected primary contact (not full picker). If no contacts exist for client, action buttons won't render."
  },
  {
    name: "Retail Prospects", tier: "Tier 2", priority: "P2", channel: "Retail", stage: "Field Mapping",
    notes: "LO-entered data",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Retail prospects table (LO-entered)",
    currentDataSource: "ELEVATE local DB — manually added by LOs",
    architectureNotes: ""
  },
  {
    name: "Pricing Intent Tracker", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "Generated by app usage (rate checks)",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Pricing engine data / app usage events",
    currentDataSource: "ELEVATE local DB — generated by rate check activity",
    architectureNotes: "Detects borrowers who have priced the same loan multiple times (hot leads)."
  },
  {
    name: "Compliance Countdown", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "ELEVATE document tracking",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Broker license/compliance documents",
    currentDataSource: "ELEVATE local DB — document tracking",
    architectureNotes: ""
  },
  {
    name: "Treasury Rates", tier: "Tier 2", priority: "P2", channel: "N/A", stage: "Field Mapping",
    notes: "External API",
    endpoint: "N/A — external API",
    filters: "N/A",
    fieldsNeeded: "Treasury rate data from external API",
    currentDataSource: "External API",
    architectureNotes: ""
  },
  {
    name: "AE Profile", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "ELEVATE users table",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "ELEVATE users table",
    currentDataSource: "ELEVATE local DB — users table",
    architectureNotes: ""
  },
  {
    name: "AI Features (11 endpoints)", tier: "Tier 2", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "Receives context from parent widgets",
    endpoint: "N/A — receives context from parent widgets, no direct DB queries",
    filters: "N/A",
    fieldsNeeded: "Context passed from parent widget data",
    currentDataSource: "Parent widget context",
    architectureNotes: "11 AI endpoints that receive context from their parent widgets."
  },
  {
    name: "Untapped Realtors", tier: "Tier 2", priority: "P3", channel: "Retail", stage: "Field Mapping",
    notes: "Needs RETR data (external provider)",
    endpoint: "N/A — external data provider",
    filters: "N/A",
    fieldsNeeded: "MLS data / public real estate transaction records — agentName, phone, email, totalTransactions",
    currentDataSource: "Needs RETR data (external provider), not Encompass",
    architectureNotes: "Contact info from MLS/public records may be incomplete. Widget should gracefully handle missing contact info."
  },
  {
    name: "Market Share Trend", tier: "Tier 2", priority: "P2", channel: "Both", stage: "Field Mapping",
    notes: "PARTIAL — needs warehouse for GMFS volume",
    endpoint: "N/A — partially local, partially warehouse",
    filters: "N/A",
    fieldsNeeded: "Competitor market data (external provider) + GMFS own volume (needs warehouse)",
    currentDataSource: "Competitor data: needs external provider. GMFS volume: currently from local fake/stubbed data — warehouse-backed GMFS volume still needed.",
    architectureNotes: "PARTIAL dependency on warehouse for GMFS's own volume calculation."
  },
  {
    name: "Share Erosion", tier: "Tier 2", priority: "P2", channel: "TPO", stage: "Field Mapping",
    notes: "PARTIAL — client list depends on Client List/Profile",
    endpoint: "N/A — partially local, partially depends on P3 #22",
    filters: "N/A",
    fieldsNeeded: "Market share data (external provider) + client list (currently seeded TPO clients)",
    currentDataSource: "Market share: needs external provider. Client list portion uses seeded TPO clients — once Client List (#22) is wired to warehouse, Share Erosion gets real client names for free.",
    architectureNotes: "PARTIAL dependency. Will auto-resolve when Client List / Client Profile is warehouse-backed."
  },
  {
    name: "Referral Leakage", tier: "Tier 2", priority: "P2", channel: "Retail", stage: "Field Mapping",
    notes: "User-managed partners",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "referral_partners table (name, phone, email — from Encompass referring agent fields cross-referenced with MLS)",
    currentDataSource: "ELEVATE local DB — user-managed referral partners",
    architectureNotes: "Each row IS the individual contact. No contact picker needed."
  },
  {
    name: "Lead Source Alert (Local)", tier: "Tier 2", priority: "P3", channel: "Retail", stage: "Field Mapping",
    notes: "Must be captured in ELEVATE by LOs",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Lead source data (must be captured in ELEVATE, not in Encompass)",
    currentDataSource: "Not yet implemented — needs ELEVATE-internal capture by LOs",
    architectureNotes: "application_source_type is 0% populated in Encompass. Lead source must be captured directly in ELEVATE."
  },
  {
    name: "Referral Sources (Local)", tier: "Tier 2", priority: "P3", channel: "Retail", stage: "Field Mapping",
    notes: "Must be captured in ELEVATE",
    endpoint: "N/A — local database",
    filters: "N/A",
    fieldsNeeded: "Referral source data (must be captured in ELEVATE, not in Encompass)",
    currentDataSource: "Not yet implemented — needs ELEVATE-internal capture",
    architectureNotes: "Same as Lead Source Alert — referral source not in Encompass."
  },
  {
    name: "Ad-Hoc Reports", tier: "Tier 2", priority: "P3", channel: "Both", stage: "Field Mapping",
    notes: "Queries whatever data is available",
    endpoint: "N/A — queries available data",
    filters: "N/A",
    fieldsNeeded: "Queries whatever data sources are available at runtime",
    currentDataSource: "ELEVATE local DB — ad-hoc query builder",
    architectureNotes: "No new endpoints needed."
  }
];


/**
 * Log a widget change to the widget_history audit collection.
 */
function logWidgetChange(widgetId, widgetName, action, before, after) {
  db.collection("widget_history").add({
    widgetId,
    widgetName,
    action,
    before: before || null,
    after: after || null,
    user: getCurrentUser(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => console.error("Audit log failed:", err));
}

/**
 * Fetch all widgets, optionally filtered by tier.
 * @param {string|null} tierFilter - "Tier 1", "Tier 2", or null for all
 * @returns {Promise<Array>} widgets
 */
async function getWidgets(tierFilter) {
  let query = db.collection("widgets").orderBy("stageOrder");
  const snapshot = await query.get();
  let widgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (tierFilter) {
    widgets = widgets.filter(w => w.tier === tierFilter);
  }
  return widgets;
}

/**
 * Update a widget's stage after drag-and-drop.
 * @param {string} widgetId
 * @param {string} newStage
 * @param {number} newOrder
 */
async function updateWidgetStage(widgetId, newStage, newOrder) {
  const updates = {
    stage: newStage,
    stageOrder: newOrder,
    validated: newStage === "Validated",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUpdatedBy: typeof getCurrentUser === "function" ? getCurrentUser() : "Unknown"
  };

  if (newStage === "Validated") {
    updates.validatedAt = firebase.firestore.FieldValue.serverTimestamp();
  } else {
    updates.validatedAt = firebase.firestore.FieldValue.delete();
  }

  await db.collection("widgets").doc(widgetId).update(updates);
}

/**
 * Listen to real-time widget changes.
 * @param {string|null} tierFilter
 * @param {Function} callback - called with array of widgets
 * @returns {Function} unsubscribe function
 */
function onWidgetsChange(tierFilter, callback) {
  let query = db.collection("widgets").orderBy("stageOrder");
  return query.onSnapshot(snapshot => {
    let widgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (tierFilter) {
      widgets = widgets.filter(w => w.tier === tierFilter);
    }
    callback(widgets);
  });
}
