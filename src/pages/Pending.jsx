import React, { useState } from "react";
import { getPendingItems, removePendingItem } from "../utils/storage";

export default function Pending() {
  const [items, setItems] = useState(getPendingItems());
  const [message, setMessage] = useState("");

  function handleDone(item) {
    removePendingItem(item.id);
    setItems(getPendingItems());
    setMessage(`${item.territoryNo} removed from Pending`);

    setTimeout(() => {
      setMessage("");
    }, 1800);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Pending Territories ({items.length})</h1>
        <p className="mt-1 text-sm text-slate-500">
          These territories stay here until someone marks them as done.
        </p>

        {message && (
          <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
            {message}
          </div>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-500">No pending territories.</p>
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {item.scheduledDate || item.sourceDay}
              </p>
              <h2 className="text-lg font-semibold">{item.territoryNo}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {item.sourceDay}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.leftStreets.map((street) => (
                  <span
                    key={street}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700"
                  >
                    {street}
                  </span>
                ))}
              </div>
            </div>

            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              Pending
            </span>
          </div>

          <button
            onClick={() => handleDone(item)}
            className="mt-4 rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-green-700"
          >
            Done
          </button>
        </div>
      ))}
    </div>
  );
}