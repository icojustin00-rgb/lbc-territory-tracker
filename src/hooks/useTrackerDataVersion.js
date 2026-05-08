import { useEffect, useState } from "react";
import { subscribeTrackerData } from "../utils/storage";

export default function useTrackerDataVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return subscribeTrackerData(() => {
      setVersion((value) => value + 1);
    });
  }, []);

  return version;
}
