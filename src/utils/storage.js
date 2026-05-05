function statusKey(dateKey, territoryNo) {
  return `${dateKey}__${territoryNo}`;
}

function territoryOnlyKey(day, territoryNo) {
  return `${day}__${territoryNo}`;
}

function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/* =========================
   DATE-BASED STATUS
========================= */
export function getStatuses() {
  return JSON.parse(localStorage.getItem("territoryStatusesByDate")) || {};
}

export function setTerritoryStatus(dateKey, territoryNo, status) {
  const data = getStatuses();
  data[statusKey(dateKey, territoryNo)] = status;
  localStorage.setItem("territoryStatusesByDate", JSON.stringify(data));
}

export function getTerritoryStatus(dateKey, territoryNo) {
  const data = getStatuses();
  return data[statusKey(dateKey, territoryNo)] || "Not updated";
}

export function resetTerritoryStatus(dateKey, territoryNo) {
  const data = getStatuses();
  delete data[statusKey(dateKey, territoryNo)];
  localStorage.setItem("territoryStatusesByDate", JSON.stringify(data));
}

/* =========================
   DATE-BASED GUIDE ASSIGNMENTS
========================= */
export function getGuideAssignments() {
  return JSON.parse(localStorage.getItem("guideAssignmentsByDate")) || {};
}

export function setAssignedGuide(dateKey, territoryNo, guideName) {
  const data = getGuideAssignments();
  data[statusKey(dateKey, territoryNo)] = guideName || "";
  localStorage.setItem("guideAssignmentsByDate", JSON.stringify(data));
}

export function getAssignedGuide(dateKey, territoryNo) {
  const data = getGuideAssignments();
  return data[statusKey(dateKey, territoryNo)] || "";
}

/* =========================
   TERRITORY REMARKS
========================= */
export function getTerritoryRemarks() {
  return JSON.parse(localStorage.getItem("territoryRemarks")) || {};
}

export function getTerritoryRemark(day, territoryNo) {
  const data = getTerritoryRemarks();
  return data[territoryOnlyKey(day, territoryNo)] || "";
}

export function setTerritoryRemark(day, territoryNo, remark) {
  const data = getTerritoryRemarks();
  const key = territoryOnlyKey(day, territoryNo);

  if (remark && remark.trim()) {
    data[key] = remark.trim();
  } else {
    delete data[key];
  }

  localStorage.setItem("territoryRemarks", JSON.stringify(data));
}

export function clearTerritoryRemark(day, territoryNo) {
  const data = getTerritoryRemarks();
  delete data[territoryOnlyKey(day, territoryNo)];
  localStorage.setItem("territoryRemarks", JSON.stringify(data));
}

/* =========================
   PENDING ITEMS
========================= */
export function getPendingItemsRaw() {
  return JSON.parse(localStorage.getItem("pendingItems")) || [];
}

export function getPendingItems() {
  return getPendingItemsRaw();
}

export function savePendingItem(item) {
  const data = getPendingItemsRaw();
  const filtered = data.filter((x) => x.id !== item.id);
  filtered.push(item);
  localStorage.setItem("pendingItems", JSON.stringify(filtered));
}

export function removePendingItem(id) {
  const data = getPendingItemsRaw().filter((x) => x.id !== id);
  localStorage.setItem("pendingItems", JSON.stringify(data));
}

export function removePendingItemsForTerritory(territoryNo, sourceDay = null) {
  const data = getPendingItemsRaw().filter((item) => {
    const sameTerritory = item.territoryNo === territoryNo;
    const sameDay = sourceDay ? item.sourceDay === sourceDay : true;
    return !(sameTerritory && sameDay);
  });

  localStorage.setItem("pendingItems", JSON.stringify(data));
}

export function getPendingItemForTerritory(sourceDay, territoryNo) {
  return (
    getPendingItemsRaw().find(
      (item) =>
        item.sourceDay === sourceDay &&
        item.territoryNo === territoryNo
    ) || null
  );
}

export function updatePendingItemStreets(id, leftStreets) {
  const data = getPendingItemsRaw().map((item) =>
    item.id === id ? { ...item, leftStreets } : item
  );
  localStorage.setItem("pendingItems", JSON.stringify(data));
}

export function addManualPending(dateKey, day, territoryNo, leftStreets, dateLabel) {
  const id = `${dateKey}__${territoryNo}`;

  savePendingItem({
    id,
    dateKey,
    scheduledDate: dateLabel,
    sourceDay: day,
    territoryNo,
    leftStreets,
    pendingType: "manual",
    createdAt: new Date().toISOString(),
  });

  setTerritoryStatus(dateKey, territoryNo, "Pending");
}

export function addAutoMissedPending(dateKey, day, territoryNo, leftStreets, dateLabel) {
  const id = `${dateKey}__${territoryNo}`;

  savePendingItem({
    id,
    dateKey,
    scheduledDate: dateLabel,
    sourceDay: day,
    territoryNo,
    leftStreets,
    pendingType: "autoMissed",
    createdAt: new Date().toISOString(),
  });

  setTerritoryStatus(dateKey, territoryNo, "Pending");
}

export function markTerritoryDone(dateKey, territoryNo, sourceDay = null) {
  const id = `${dateKey}__${territoryNo}`;

  removePendingItem(id);
  removePendingItemsForTerritory(territoryNo, sourceDay);
  setTerritoryStatus(dateKey, territoryNo, "Done");
}

export function resetScheduledTerritory(dateKey, territoryNo, sourceDay = null) {
  const id = `${dateKey}__${territoryNo}`;

  removePendingItem(id);
  removePendingItemsForTerritory(territoryNo, sourceDay);
  resetTerritoryStatus(dateKey, territoryNo);
}

/* =========================
   TEST-DATE CLEANUP
   If you temporarily changed your computer date,
   this removes pending records that accidentally landed in the future.
========================= */
export function cleanupFuturePendingItems(today = new Date()) {
  const todayKey = getTodayDateKey(today);
  const pendingItems = getPendingItemsRaw();
  const statuses = getStatuses();

  let changed = false;

  const cleanedPending = pendingItems.filter((item) => {
    const isFuture = item.dateKey && item.dateKey > todayKey;

    if (isFuture) {
      delete statuses[statusKey(item.dateKey, item.territoryNo)];
      changed = true;
      return false;
    }

    return true;
  });

  if (changed) {
    localStorage.setItem("pendingItems", JSON.stringify(cleanedPending));
    localStorage.setItem("territoryStatusesByDate", JSON.stringify(statuses));
  }

  return changed;
}

/* =========================
   AUTO-PENDING MISSED TERRITORIES
   Only marks schedules before today.
   This prevents future schedules from becoming pending.
========================= */
export function autoMarkMissedTerritories(scheduleInstances, today = new Date()) {
  cleanupFuturePendingItems(today);

  const todayKey = getTodayDateKey(today);
  let changed = false;

  scheduleInstances.forEach((item) => {
    if (!item.dateKey || !item.territoryNo || !item.streets) return;
    if (item.dateKey >= todayKey) return;

    const currentStatus = getTerritoryStatus(item.dateKey, item.territoryNo);

    if (currentStatus !== "Not updated") return;

    addAutoMissedPending(
      item.dateKey,
      item.day,
      item.territoryNo,
      item.streets,
      item.dateLong || item.scheduledDate || item.dateKey
    );

    changed = true;
  });

  return changed;
}

/* =========================
   COUNTS
========================= */
export function getPendingCount() {
  cleanupFuturePendingItems(new Date());
  return getPendingItemsRaw().length;
}

export function getCompletedThisMonthCount() {
  const statuses = getStatuses();
  const monthPrefix = new Date().toISOString().slice(0, 7);

  return Object.entries(statuses).filter(
    ([key, value]) => key.startsWith(monthPrefix) && value === "Done"
  ).length;
}

export function clearAllStatuses() {
  localStorage.removeItem("territoryStatusesByDate");
  localStorage.removeItem("guideAssignmentsByDate");
  localStorage.removeItem("pendingItems");
  localStorage.removeItem("territoryRemarks");
}
