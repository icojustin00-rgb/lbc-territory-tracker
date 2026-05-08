import { useEffect, useState } from "react";
import {
  isTrackerDataLoaded,
  subscribeTrackerData,
} from "../utils/storage";

export default function useTrackerDataReady() {
  const [ready, setReady] = useState(() => isTrackerDataLoaded());

  useEffect(() => {
    return subscribeTrackerData(() => {
      setReady(isTrackerDataLoaded());
    });
  }, []);

  return ready;
}
