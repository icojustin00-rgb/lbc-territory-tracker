import { useEffect, useRef, useState } from "react";
import {
  initializeCloudFromLocalIfEmpty,
  isSyncKey,
  markLocalDirty,
  saveLocalToCloud,
  shouldSkipCloudSave,
  subscribeToCloud,
} from "../utils/firebaseSync";

export default function FirebaseSync() {
  const [, setSyncTick] = useState(0);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    const originalClear = localStorage.clear.bind(localStorage);

    function scheduleCloudSave(key) {
      if (key && !isSyncKey(key)) return;
      if (shouldSkipCloudSave()) return;

      markLocalDirty();

      window.clearTimeout(saveTimerRef.current);

      saveTimerRef.current = window.setTimeout(() => {
        if (shouldSkipCloudSave()) return;

        saveLocalToCloud().catch((error) => {
          console.error("Firebase save error:", error);
        });
      }, 250);
    }

    localStorage.setItem = function patchedSetItem(key, value) {
      originalSetItem(key, value);
      scheduleCloudSave(key);
    };

    localStorage.removeItem = function patchedRemoveItem(key) {
      originalRemoveItem(key);
      scheduleCloudSave(key);
    };

    localStorage.clear = function patchedClear() {
      originalClear();
      scheduleCloudSave();
    };

    initializeCloudFromLocalIfEmpty()
      .then(() => {
        if (!isMounted) return;

        unsubscribe = subscribeToCloud(() => {
          setSyncTick((value) => value + 1);
        });
      })
      .catch((error) => {
        console.error("Firebase sync init error:", error);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(saveTimerRef.current);

      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      localStorage.clear = originalClear;

      if (unsubscribe) unsubscribe();
    };
  }, []);

  return null;
}