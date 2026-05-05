import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const SYNC_KEYS = [
  "territoryStatusesByDate",
  "guideAssignmentsByDate",
  "pendingItems",
  "territoryRemarks",
];

const SYNC_DOC = doc(db, "trackerSync", "main");

let isApplyingRemote = false;
let hasReceivedCloudData = false;

export function isSyncKey(key) {
  return SYNC_KEYS.includes(key);
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return value;
  }
}

function hasUsefulLocalData() {
  return SYNC_KEYS.some((key) => {
    const value = localStorage.getItem(key);
    if (!value) return false;

    const parsed = safeParse(value);

    if (Array.isArray(parsed)) return parsed.length > 0;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;

    return Boolean(value);
  });
}

function getLocalSnapshot() {
  const data = {};

  SYNC_KEYS.forEach((key) => {
    data[key] = localStorage.getItem(key);
  });

  return data;
}

function writeLocalStorageValue(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

export function applyRemoteSnapshot(data = {}) {
  isApplyingRemote = true;

  try {
    SYNC_KEYS.forEach((key) => {
      writeLocalStorageValue(key, data[key] ?? null);
    });
  } finally {
    setTimeout(() => {
      isApplyingRemote = false;
    }, 500);
  }

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("firebase-data-updated"));
}

export async function saveLocalToCloud() {
  if (isApplyingRemote) return;

  await setDoc(
    SYNC_DOC,
    {
      localStorageData: getLocalSnapshot(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function initializeCloudFromLocalIfEmpty() {
  const snapshot = await getDoc(SYNC_DOC);

  if (!snapshot.exists()) {
    if (hasUsefulLocalData()) {
      await saveLocalToCloud();
    }
    return;
  }

  const cloudData = snapshot.data()?.localStorageData;

  if (!cloudData || Object.keys(cloudData).length === 0) {
    if (hasUsefulLocalData()) {
      await saveLocalToCloud();
    }
  }
}

export function shouldSkipCloudSave() {
  return isApplyingRemote || !hasReceivedCloudData;
}

export function subscribeToCloud(onRemoteUpdate) {
  return onSnapshot(SYNC_DOC, async (snapshot) => {
    if (!snapshot.exists()) {
      hasReceivedCloudData = true;
      return;
    }

    const data = snapshot.data()?.localStorageData || {};
    hasReceivedCloudData = true;

    applyRemoteSnapshot(data);

    if (typeof onRemoteUpdate === "function") {
      onRemoteUpdate();
    }
  });
}