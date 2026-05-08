import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const DATA_DOC = doc(db, "trackerData", "main");

const DEFAULT_DATA = {
  territoryStatusesByDate: {},
  guideAssignmentsByDate: {},
  pendingItems: [],
  territoryRemarks: {},
};

let cache = { ...DEFAULT_DATA };
let loaded = false;
let unsubscribe = null;
const listeners = new Set();

function statusKey(dateKey, territoryNo) {
  return `${dateKey}__${territoryNo}`;
}

function territoryOnlyKey(day, territoryNo) {
  return `${day}__${territoryNo}`;
}

function normalizeData(data = {}) {
  return {
    territoryStatusesByDate: data.territoryStatusesByDate || {},
    guideAssignmentsByDate: data.guideAssignmentsByDate || {},
    pendingItems: Array.isArray(data.pendingItems) ? data.pendingItems : [],
    territoryRemarks: data.territoryRemarks || {},
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/*
  Carryover rule:
  A pending item only carries over to the NEXT weekly occurrence of the same
  day/territory. It should NOT make every future week appear Pending.
*/
export function getCarryOverPendingForDate(dateKey, sourceDay, territoryNo) {
  return (
    getPendingItemsRaw().find((item) => {
      if (item.sourceDay !== sourceDay) return false;
      if (item.territoryNo !== territoryNo) return false;
      if (!item.dateKey) return false;

      const nextOccurrenceKey = addDaysToDateKey(item.dateKey, 7);
      return nextOccurrenceKey === dateKey;
    }) || null
  );
}

export function isTrackerDataLoaded() {
  return loaded;
}

export async function ensureTrackerDataLoaded() {
  if (loaded) return cache;

  const snapshot = await getDoc(DATA_DOC);

  if (!snapshot.exists()) {
    await setDoc(DATA_DOC, {
      ...DEFAULT_DATA,
      updatedAt: serverTimestamp(),
    });
    cache = { ...DEFAULT_DATA };
  } else {
    cache = normalizeData(snapshot.data());
  }

  loaded = true;
  notify();
  return cache;
}

export function subscribeTrackerData(callback) {
  listeners.add(callback);

  if (!unsubscribe) {
    unsubscribe = onSnapshot(DATA_DOC, async (snapshot) => {
      if (!snapshot.exists()) {
        cache = { ...DEFAULT_DATA };
        loaded = true;

        await setDoc(DATA_DOC, {
          ...DEFAULT_DATA,
          updatedAt: serverTimestamp(),
        });
      } else {
        cache = normalizeData(snapshot.data());
        loaded = true;
      }

      notify();
    });
  }

  ensureTrackerDataLoaded().catch((error) => {
    console.error("Failed to load tracker data:", error);
  });

  return () => {
    listeners.delete(callback);
  };
}

async function savePatch(patch) {
  cache = normalizeData({
    ...cache,
    ...patch,
  });

  loaded = true;
  notify();

  await setDoc(DATA_DOC, {
    ...cache,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   DATE / MONTH HELPERS
========================= */
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
  return cache.territoryStatusesByDate || {};
}

export async function setTerritoryStatus(dateKey, territoryNo, status) {
  const data = { ...getStatuses() };
  data[statusKey(dateKey, territoryNo)] = status;
  await savePatch({ territoryStatusesByDate: data });
}

export function getTerritoryStatus(dateKey, territoryNo) {
  const data = getStatuses();
  return data[statusKey(dateKey, territoryNo)] || "Not updated";
}

export async function resetTerritoryStatus(dateKey, territoryNo) {
  const data = { ...getStatuses() };
  delete data[statusKey(dateKey, territoryNo)];
  await savePatch({ territoryStatusesByDate: data });
}

/* =========================
   DATE-BASED GUIDE ASSIGNMENTS
========================= */
export function getGuideAssignments() {
  return cache.guideAssignmentsByDate || {};
}

export async function setAssignedGuide(dateKey, territoryNo, guideName) {
  const data = { ...getGuideAssignments() };
  const key = statusKey(dateKey, territoryNo);

  if (guideName) {
    data[key] = guideName;
  } else {
    delete data[key];
  }

  await savePatch({ guideAssignmentsByDate: data });
}

export function getAssignedGuide(dateKey, territoryNo) {
  const data = getGuideAssignments();
  return data[statusKey(dateKey, territoryNo)] || "";
}

/* =========================
   TERRITORY REMARKS
========================= */
export function getTerritoryRemarks() {
  return cache.territoryRemarks || {};
}

export function getTerritoryRemark(day, territoryNo) {
  const data = getTerritoryRemarks();
  return data[territoryOnlyKey(day, territoryNo)] || "";
}

export async function setTerritoryRemark(day, territoryNo, remark) {
  const data = { ...getTerritoryRemarks() };
  const key = territoryOnlyKey(day, territoryNo);

  if (remark && remark.trim()) {
    data[key] = remark.trim();
  } else {
    delete data[key];
  }

  await savePatch({ territoryRemarks: data });
}

export async function clearTerritoryRemark(day, territoryNo) {
  const data = { ...getTerritoryRemarks() };
  delete data[territoryOnlyKey(day, territoryNo)];
  await savePatch({ territoryRemarks: data });
}

/* =========================
   PENDING ITEMS
========================= */
export function getPendingItemsRaw() {
  return cache.pendingItems || [];
}

export function getPendingItems() {
  return getPendingItemsRaw();
}

export async function savePendingItem(item) {
  const data = getPendingItemsRaw();
  const filtered = data.filter((x) => x.id !== item.id);
  filtered.push(item);
  await savePatch({ pendingItems: filtered });
}

export async function removePendingItem(id) {
  const data = getPendingItemsRaw().filter((x) => x.id !== id);
  await savePatch({ pendingItems: data });
}

export async function removePendingItemsForTerritory(territoryNo, sourceDay = null) {
  const data = getPendingItemsRaw().filter((item) => {
    const sameTerritory = item.territoryNo === territoryNo;
    const sameDay = sourceDay ? item.sourceDay === sourceDay : true;
    return !(sameTerritory && sameDay);
  });

  await savePatch({ pendingItems: data });
}

/*
  Old broad lookup kept for compatibility.
  Avoid using this for future schedule rows because it matches all future weeks.
*/
export function getPendingItemForTerritory(sourceDay, territoryNo) {
  return (
    getPendingItemsRaw().find(
      (item) =>
        item.sourceDay === sourceDay &&
        item.territoryNo === territoryNo
    ) || null
  );
}

export async function updatePendingItemStreets(id, leftStreets) {
  const data = getPendingItemsRaw().map((item) =>
    item.id === id ? { ...item, leftStreets } : item
  );
  await savePatch({ pendingItems: data });
}

export async function addManualPending(dateKey, day, territoryNo, leftStreets, dateLabel) {
  const id = `${dateKey}__${territoryNo}`;
  const pendingItems = getPendingItemsRaw().filter((item) => {
    const sameExact = item.id === id;
    const sameCarryOver = item.territoryNo === territoryNo && item.sourceDay === day;
    return !sameExact && !sameCarryOver;
  });

  pendingItems.push({
    id,
    dateKey,
    scheduledDate: dateLabel,
    sourceDay: day,
    territoryNo,
    leftStreets,
    pendingType: "manual",
    createdAt: new Date().toISOString(),
  });

  const statuses = { ...getStatuses() };
  statuses[statusKey(dateKey, territoryNo)] = "Pending";

  await savePatch({
    pendingItems,
    territoryStatusesByDate: statuses,
  });
}

/*
  Auto-missed pending is intentionally disabled.
  The website should never mark territories pending just because someone opened it.
*/
export function autoMarkMissedTerritories() {
  return false;
}

export function cleanupFuturePendingItems() {
  return false;
}

export async function markTerritoryDone(dateKey, territoryNo, sourceDay = null) {
  const id = `${dateKey}__${territoryNo}`;

  const pendingItems = getPendingItemsRaw().filter((item) => {
    const sameExact = item.id === id;
    const sameCarryOver =
      item.territoryNo === territoryNo &&
      (sourceDay ? item.sourceDay === sourceDay : true);

    return !sameExact && !sameCarryOver;
  });

  const statuses = { ...getStatuses() };
  statuses[statusKey(dateKey, territoryNo)] = "Done";

  await savePatch({
    pendingItems,
    territoryStatusesByDate: statuses,
  });
}

export async function resetScheduledTerritory(dateKey, territoryNo, sourceDay = null) {
  const id = `${dateKey}__${territoryNo}`;

  const pendingItems = getPendingItemsRaw().filter((item) => {
    const sameExact = item.id === id;
    const sameCarryOver =
      item.territoryNo === territoryNo &&
      (sourceDay ? item.sourceDay === sourceDay : true);

    return !sameExact && !sameCarryOver;
  });

  const statuses = { ...getStatuses() };
  delete statuses[statusKey(dateKey, territoryNo)];

  await savePatch({
    pendingItems,
    territoryStatusesByDate: statuses,
  });
}

/* =========================
   COUNTS
========================= */
export function getPendingCount() {
  return getPendingItemsRaw().length;
}

export function getCompletedThisMonthCount() {
  const statuses = getStatuses();
  const monthPrefix = new Date().toISOString().slice(0, 7);

  return Object.entries(statuses).filter(
    ([key, value]) => key.startsWith(monthPrefix) && value === "Done"
  ).length;
}

export async function clearAllStatuses() {
  await savePatch({ ...DEFAULT_DATA });
}
