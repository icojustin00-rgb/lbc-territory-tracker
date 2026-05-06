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
let hasInitializedFromCloud = false;
let hasUnsavedLocalChanges = false;

export function isSyncKey(key) {
  return SYNC_KEYS.includes(key);
}

export function isRemoteApplying() {
  return isApplyingRemote;
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

export function markLocalDirty() {
  if (!isApplyingRemote) {
    hasUnsavedLocalChanges = true;
  }
}

export function shouldSkipCloudSave() {
  return isApplyingRemote;
}

export function applyRemoteSnapshot(data = {}) {
  if (hasUnsavedLocalChanges) return;

  isApplyingRemote = true;

  try {
    SYNC_KEYS.forEach((key) => {
      writeLocalStorageValue(key, data[key] ?? null);
    });
  } finally {
    setTimeout(() => {
      isApplyingRemote = false;
    }, 300);
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

  hasUnsavedLocalChanges = false;
}

export async function initializeCloudFromLocalIfEmpty() {
  const snapshot = await getDoc(SYNC_DOC);

  if (!snapshot.exists()) {
    await saveLocalToCloud();
  }
}

export function subscribeToCloud(onRemoteUpdate) {
  return onSnapshot(SYNC_DOC, async (snapshot) => {
    if (!snapshot.exists()) {
      hasInitializedFromCloud = true;
      await saveLocalToCloud();
      return;
    }

    const data = snapshot.data()?.localStorageData || {};

    if (!hasInitializedFromCloud) {
      hasInitializedFromCloud = true;
      applyRemoteSnapshot(data);
    } else {
      applyRemoteSnapshot(data);
    }

    if (typeof onRemoteUpdate === "function") {
      onRemoteUpdate();
    }
  });
}