import React, { useEffect, useMemo, useState } from "react";
import { territories } from "../data/territories";
import {
  getTerritoryStatus,
  getPendingItems,
  getPendingItemForTerritory,
  addManualPending,
  markTerritoryDone,
  resetScheduledTerritory,
  getTerritoryRemark,
  setTerritoryRemark,
  clearTerritoryRemark,
  autoMarkMissedTerritories,
} from "../utils/storage";
import { buildMonthlyScheduleInstances, getDateKey } from "../utils/schedule";

const statusStyles = {
  "Not updated": "bg-blue-100 text-blue-700 ring-blue-200",
  Done: "bg-green-100 text-green-700 ring-green-200",
  Pending: "bg-red-100 text-red-700 ring-red-200",
};

function getStatusStyle(status) {
  return statusStyles[status] || statusStyles["Not updated"];
}

export default function Territories() {
  const [version, setVersion] = useState(0);
  const [selectedStreets, setSelectedStreets] = useState({});
  const [openPendingKey, setOpenPendingKey] = useState(null);
  const [remarkDrafts, setRemarkDrafts] = useState({});

  const today = new Date();
  const todayKey = getDateKey(today);

  const scheduleInstances = useMemo(
    () => buildMonthlyScheduleInstances(territories),
    [version]
  );

  useEffect(() => {
    const changed = autoMarkMissedTerritories(scheduleInstances, new Date());
    if (changed) setVersion((v) => v + 1);
  }, [scheduleInstances]);

  const todaySchedules = scheduleInstances.filter((item) => item.dateKey === todayKey);
  const pendingItems = getPendingItems();

  function refresh() {
    setVersion((v) => v + 1);
  }

  function getCarryOverPending(item) {
    return (
      getPendingItemForTerritory(item.day, item.territoryNo) ||
      pendingItems.find(
        (pending) =>
          pending.territoryNo === item.territoryNo &&
          pending.sourceDay === item.day
      )
    );
  }

  function getDisplayStreets(item) {
    const carryOver = getCarryOverPending(item);
    return carryOver?.leftStreets?.length ? carryOver.leftStreets : item.streets;
  }

  function getEffectiveStatus(item) {
    const currentStatus = getTerritoryStatus(item.dateKey, item.territoryNo);
    const carryOver = getCarryOverPending(item);

    if (currentStatus === "Done") return "Done";
    if (currentStatus === "Pending" || carryOver) return "Pending";
    return "Not updated";
  }

  function getRemarkKey(item) {
    return `${item.day}__${item.territoryNo}`;
  }

  function getSavedRemark(item) {
    return getTerritoryRemark(item.day, item.territoryNo) || "";
  }

  function getRemarkDraft(item) {
    return remarkDrafts[getRemarkKey(item)] || "";
  }

  function updateRemarkDraft(item, value) {
    setRemarkDrafts((prev) => ({
      ...prev,
      [getRemarkKey(item)]: value,
    }));
  }

  function saveRemark(item) {
    const draft = getRemarkDraft(item).trim();

    if (!draft) {
      alert("Please type a remark first.");
      return;
    }

    setTerritoryRemark(item.day, item.territoryNo, draft);
    setRemarkDrafts((prev) => ({
      ...prev,
      [getRemarkKey(item)]: "",
    }));
    refresh();
  }

  function toggleStreet(itemKey, street) {
    setSelectedStreets((prev) => {
      const current = prev[itemKey] || [];
      const exists = current.includes(street);

      return {
        ...prev,
        [itemKey]: exists ? current.filter((x) => x !== street) : [...current, street],
      };
    });
  }

  function handleMarkDone(item) {
    markTerritoryDone(item.dateKey, item.territoryNo, item.day);

    // Clear previous-week reminder once the current guide confirms this territory is done.
    clearTerritoryRemark(item.day, item.territoryNo);

    setRemarkDrafts((prev) => ({
      ...prev,
      [getRemarkKey(item)]: "",
    }));

    setOpenPendingKey(null);
    refresh();
  }

  function handleMarkPending(item) {
    const itemKey = `${item.dateKey}__${item.territoryNo}`;
    const selected = selectedStreets[itemKey] || [];

    if (selected.length === 0) {
      alert("Please select the streets left.");
      return;
    }

    addManualPending(item.dateKey, item.day, item.territoryNo, selected, item.dateLong);

    setSelectedStreets((prev) => ({ ...prev, [itemKey]: [] }));
    setOpenPendingKey(null);
    refresh();
  }

  function handleReset(item) {
    resetScheduledTerritory(item.dateKey, item.territoryNo, item.day);
    setOpenPendingKey(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Territories</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update today’s assigned territory. Previous remarks and pending carryovers will appear as guide reminders.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Today’s Territory</h2>

        {todaySchedules.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            No territory scheduled today.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {todaySchedules.map((item) => {
              const itemKey = `${item.dateKey}__${item.territoryNo}`;
              const status = getEffectiveStatus(item);
              const displayStreets = getDisplayStreets(item);
              const selected = selectedStreets[itemKey] || [];
              const savedRemark = getSavedRemark(item);
              const remarkDraft = getRemarkDraft(item);
              const isPendingOpen = openPendingKey === itemKey;
              const carryOver = getCarryOverPending(item);
              const isCarryOver = Boolean(carryOver?.leftStreets?.length);
              const hasReminder = isCarryOver || Boolean(savedRemark);

              return (
                <div key={itemKey} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{item.dateLong}</p>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Territory {item.territoryNo}
                      </h3>
                      <p className="text-sm text-slate-500">{item.day}</p>
                    </div>

                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusStyle(status)}`}>
                      {status}
                    </span>
                  </div>

                  {hasReminder && (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                      <p className="font-semibold">Guide Reminder</p>

                      {isCarryOver && (
                        <div className="mt-2">
                          <p className="font-medium">Pending carryover:</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {carryOver.leftStreets.map((street) => (
                              <span key={street} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                                {street}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs">
                            Once marked Done, the next schedule resets to the full territory.
                          </p>
                        </div>
                      )}

                      {savedRemark && (
                        <div className="mt-3">
                          <p className="font-medium">Previous remark:</p>
                          <p className="mt-1 rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-amber-100">
                            {savedRemark}
                          </p>
                          <p className="mt-2 text-xs text-amber-800">
                            This reminder will clear when this territory is marked Done. Remarks can still be edited in the Schedule tab.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="mb-3 text-sm font-semibold text-slate-800">Streets to work</p>
                    <div className="flex flex-wrap gap-2">
                      {displayStreets.map((street) => (
                        <span key={street} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {street}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!savedRemark && (
                    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <label className="text-sm font-semibold text-slate-800">Remarks / Notes</label>
                      <p className="mt-1 text-xs text-slate-500">
                        Add reminders for the next guide. After saving, this box will hide and the note will appear above as a guide reminder.
                      </p>

                      <textarea
                        value={remarkDraft}
                        onChange={(e) => updateRemarkDraft(item, e.target.value)}
                        placeholder="Type remarks here..."
                        className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveRemark(item)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                          Save Remark
                        </button>
                        <button type="button" onClick={() => updateRemarkDraft(item, "")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                          Clear Draft
                        </button>
                      </div>
                    </div>
                  )}

                  {savedRemark && (
                    <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs text-blue-800 ring-1 ring-blue-200">
                      To edit this remark, open the Schedule tab and click this schedule card.
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleMarkDone(item)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white">
                      Mark Done
                    </button>
                    <button type="button" onClick={() => setOpenPendingKey(itemKey)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white">
                      Pending
                    </button>
                    <button type="button" onClick={() => handleReset(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                      Reset
                    </button>
                  </div>

                  {isPendingOpen && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-amber-800">
                        Select the streets that were not finished:
                      </p>

                      <div className="grid gap-2">
                        {displayStreets.map((street) => (
                          <label key={street} className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-amber-100">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-amber-500"
                              checked={selected.includes(street)}
                              onChange={() => toggleStreet(itemKey, street)}
                            />
                            <span className="text-sm text-slate-700">{street}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleMarkPending(item)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white">
                          Save Pending Streets
                        </button>
                        <button type="button" onClick={() => setOpenPendingKey(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
