const WEBHOOK_URL = "https://millie011.app.n8n.cloud/webhook/dashboard-data";

const elements = {
  refresh: document.querySelector("#refresh-button"),
  retry: document.querySelector("#retry-button"),
  error: document.querySelector("#error-state"),
  loading: document.querySelector("#loading-state"),
  empty: document.querySelector("#empty-state"),
  body: document.querySelector("#queue-body"),
  queueCount: document.querySelector("#queue-count"),
  updated: document.querySelector("#last-updated"),
  stats: {
    totalRequests: document.querySelector("#total-requests"),
    processing: document.querySelector("#processing"),
    completed: document.querySelector("#completed"),
    requiresAttention: document.querySelector("#requires-attention"),
    requestsToday: document.querySelector("#requests-today"),
  },
};

function displayValue(value) {
  return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
}

function typeLabel(type) {
  const value = displayValue(type);
  return value === "—" ? value : value.replaceAll("_", " ");
}

function statusClass(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["completed", "approved"].includes(normalized)) return "badge-positive";
  if (normalized === "processing") return "badge-progress";
  if (["requires attention", "flagged"].includes(normalized)) return "badge-warning";
  return "badge-muted";
}

function priorityClass(priority) {
  const normalized = String(priority || "").trim().toLowerCase();
  return ["high", "medium", "low"].includes(normalized) ? `priority-${normalized}` : "";
}

function cell(text, className = "") {
  const element = document.createElement("td");
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function badge(text, className) {
  const element = document.createElement("span");
  element.textContent = text;
  element.className = `badge ${className}`;
  return element;
}

function renderQueue(queue) {
  elements.body.replaceChildren();
  elements.queueCount.textContent = queue.length;
  elements.empty.hidden = queue.length > 0;
  elements.empty.querySelector("strong").textContent = "No requests in the queue";
  elements.empty.querySelector("p").textContent = "New workflow requests will appear here when they arrive.";

  queue.forEach((item) => {
    const row = document.createElement("tr");
    row.append(cell(displayValue(item?.request), displayValue(item?.request) === "—" ? "blank" : ""));
    row.append(cell(typeLabel(item?.type), typeLabel(item?.type) === "—" ? "blank" : "type-label"));
    const statusCell = document.createElement("td");
    statusCell.append(badge(displayValue(item?.status), statusClass(item?.status)));
    row.append(statusCell);
    row.append(cell(displayValue(item?.priority), `${displayValue(item?.priority) === "—" ? "blank" : "priority"} ${priorityClass(item?.priority)}`));
    elements.body.append(row);
  });
}

function renderStats(overview = {}) {
  Object.entries(elements.stats).forEach(([key, element]) => {
    element.textContent = displayValue(overview[key]);
  });
}

function setLoading(loading) {
  elements.refresh.disabled = loading;
  elements.refresh.classList.toggle("is-loading", loading);
  elements.loading.hidden = !loading;
  if (loading) {
    elements.empty.hidden = true;
    elements.body.replaceChildren();
  }
}

async function loadDashboard() {
  setLoading(true);
  elements.error.hidden = true;
  elements.updated.textContent = "Loading latest data…";
  try {
    const response = await fetch(WEBHOOK_URL, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Webhook returned invalid data");
    renderStats(data.overview);
    renderQueue(Array.isArray(data.queue) ? data.queue : []);
    elements.updated.textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}`;
  } catch (error) {
    console.error("Unable to load dashboard data:", error);
    elements.error.hidden = false;
    elements.updated.textContent = "Data unavailable";
    elements.body.replaceChildren();
    elements.empty.hidden = false;
    elements.empty.querySelector("strong").textContent = "Queue data is unavailable";
    elements.empty.querySelector("p").textContent = "Use Refresh data to try the webhook again.";
  } finally {
    setLoading(false);
  }
}

elements.refresh.addEventListener("click", loadDashboard);
elements.retry.addEventListener("click", loadDashboard);
loadDashboard();
