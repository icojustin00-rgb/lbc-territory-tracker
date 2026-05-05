const DEMO_MAP_STATUS_KEY = "lbc_demo_map_statuses";

export function getDemoMapStatuses() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_MAP_STATUS_KEY)) || {};
  } catch {
    return {};
  }
}

export function setDemoMapStatus(street, status) {
  const current = getDemoMapStatuses();

  const updated = {
    ...current,
    [street]: status,
  };

  localStorage.setItem(DEMO_MAP_STATUS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("demo-map-status-updated"));
}

export function resetDemoMapStatuses() {
  localStorage.removeItem(DEMO_MAP_STATUS_KEY);
  window.dispatchEvent(new Event("demo-map-status-updated"));
}