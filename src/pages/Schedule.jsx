import React, { useMemo, useState } from "react";
import { territories } from "../data/territories";
import { guides } from "../data/guides";
import {
  getTerritoryStatus,
  getAssignedGuide,
  setAssignedGuide,
  getCarryOverPendingForDate,
  addManualPending,
  markTerritoryDone,
  resetScheduledTerritory,
  getTerritoryRemark,
  setTerritoryRemark,
} from "../utils/storage";
import useTrackerDataVersion from "../hooks/useTrackerDataVersion";

function badgeClass(status) {
  if (status === "Done") return "bg-green-100 text-green-700 ring-green-200";
  if (status === "Pending") return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateLong(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateShort(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getSelectedMonthLabel(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildScheduleInstancesForMonth(sourceTerritories, monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const rows = [];

  while (date.getMonth() === month - 1) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    sourceTerritories
      .filter((item) => item.day === dayName)
      .forEach((territory) => {
        rows.push({
          ...territory,
          dateKey: getDateKey(date),
          dateShort: getDateShort(date),
          dateLong: getDateLong(date),
        });
      });

    date.setDate(date.getDate() + 1);
  }

  return rows;
}

function rowKey(row) {
  return `${row.dateKey}__${row.territoryNo}`;
}

function getRemarkKey(row) {
  return `${row.day}__${row.territoryNo}`;
}

function ScheduleCard({
  row,
  isOpen,
  onToggleOpen,
  selectedPendingStreets,
  setSelectedPendingStreets,
  remarkDrafts,
  setRemarkDrafts,
}) {
  const key = rowKey(row);
  const displayStreets = row.carryOverPending?.leftStreets?.length
    ? row.carryOverPending.leftStreets
    : row.streets;
  const pendingSelectionStreets = displayStreets;
  const selected = selectedPendingStreets[key] || [];
  const savedRemark = getTerritoryRemark(row.day, row.territoryNo);
  const remarkKey = getRemarkKey(row);
  const remarkValue = Object.prototype.hasOwnProperty.call(remarkDrafts, remarkKey)
    ? remarkDrafts[remarkKey]
    : savedRemark || "";

  function togglePendingStreet(street) {
    setSelectedPendingStreets((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(street);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== street) : [...current, street],
      };
    });
  }

  function updateRemarkDraft(value) {
    setRemarkDrafts((prev) => ({
      ...prev,
      [remarkKey]: value,
    }));
  }

  async function saveRemark() {
    await setTerritoryRemark(row.day, row.territoryNo, remarkValue);
  }

  async function clearRemark() {
    setRemarkDrafts((prev) => ({ ...prev, [remarkKey]: "" }));
    await setTerritoryRemark(row.day, row.territoryNo, "");
  }

  async function handleMarkDone() {
    await markTerritoryDone(row.dateKey, row.territoryNo, row.day);
  }

  async function handleMarkPending() {
    if (selected.length === 0) {
      alert("Please select the streets left.");
      return;
    }

    await addManualPending(row.dateKey, row.day, row.territoryNo, selected, row.dateLong);
    setSelectedPendingStreets((prev) => ({ ...prev, [key]: [] }));
  }

  async function handleReset() {
    await resetScheduledTerritory(row.dateKey, row.territoryNo, row.day);
    setSelectedPendingStreets((prev) => ({ ...prev, [key]: [] }));
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button type="button" onClick={onToggleOpen} className="w-full text-left">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">{row.day}</p>
            <h2 className="text-xl font-semibold">{row.dateLong}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Click to view streets and update status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ring-1 ${badgeClass(row.status)}`}>
              {row.status}
            </span>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {isOpen ? "Hide" : "Open"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Territory No.</p>
            <p className="mt-2 font-semibold text-slate-800">{row.territoryNo}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Guide</p>
            <p className="mt-2 font-semibold text-slate-800">{row.guide}</p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          {row.carryOverPending?.leftStreets?.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <p className="font-semibold">Pending carryover from previous week only</p>
              <p className="mt-1">This reminder appears only on the next scheduled occurrence, not all future weeks.</p>
            </div>
          )}

          {savedRemark && (
            <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-200">
              <p className="font-semibold">Saved remark</p>
              <p className="mt-1">{savedRemark}</p>
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="mb-3 text-sm font-semibold text-slate-800">Streets to work</p>
            <div className="flex flex-wrap gap-2">
              {displayStreets.map((street) => (
                <span key={street} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {street}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <label className="text-sm font-semibold text-slate-800">Remarks / Notes</label>
            <p className="mt-1 text-xs text-slate-500">Add notes for future guides, such as rain interruption or houses not visited.</p>
            <textarea
              value={remarkValue}
              onChange={(e) => updateRemarkDraft(e.target.value)}
              placeholder="Type remarks here..."
              className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveRemark} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Save Remark
              </button>
              <button type="button" onClick={clearRemark} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                Clear Remark
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-sm font-semibold text-amber-800">Select streets left if this is Pending:</p>
            <div className="grid gap-2">
              {pendingSelectionStreets.map((street) => (
                <label key={street} className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-amber-100">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-amber-500"
                    checked={selected.includes(street)}
                    onChange={() => togglePendingStreet(street)}
                  />
                  <span className="text-sm text-slate-700">{street}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleMarkDone} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white">
              Mark Done
            </button>
            <button type="button" onClick={handleMarkPending} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white">
              Save as Pending
            </button>
            <button type="button" onClick={handleReset} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Schedule() {
  const version = useTrackerDataVersion();
  const [activeTab, setActiveTab] = useState("view");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue());
  const [openRowKey, setOpenRowKey] = useState(null);
  const [selectedPendingStreets, setSelectedPendingStreets] = useState({});
  const [remarkDrafts, setRemarkDrafts] = useState({});

  const scheduleRows = useMemo(() => {
    return buildScheduleInstancesForMonth(territories, selectedMonth).map((item) => {
      const savedStatus = getTerritoryStatus(item.dateKey, item.territoryNo);
      const carryOverPending = getCarryOverPendingForDate(item.dateKey, item.day, item.territoryNo);
      const status =
        savedStatus === "Done"
          ? "Done"
          : savedStatus === "Pending" || carryOverPending
          ? "Pending"
          : "Not updated";

      return {
        ...item,
        guide: getAssignedGuide(item.dateKey, item.territoryNo) || "Not yet assigned",
        status,
        carryOverPending,
      };
    });
  }, [selectedMonth, version]);

  async function handleGuideChange(row, guideName) {
    await setAssignedGuide(row.dateKey, row.territoryNo, guideName);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Schedule</h1>
            <p className="mt-1 text-sm text-slate-500">Schedule for {getSelectedMonthLabel(selectedMonth)}.</p>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setOpenRowKey(null);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setActiveTab("view")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              activeTab === "view" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            View Schedule
          </button>

          <button
            onClick={() => setActiveTab("scheduler")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              activeTab === "scheduler" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Scheduler
          </button>
        </div>
      </div>

      {activeTab === "view" && (
        <div className="space-y-4">
          {scheduleRows.map((row) => {
            const key = rowKey(row);
            return (
              <ScheduleCard
                key={key}
                row={row}
                isOpen={openRowKey === key}
                onToggleOpen={() => setOpenRowKey(openRowKey === key ? null : key)}
                selectedPendingStreets={selectedPendingStreets}
                setSelectedPendingStreets={setSelectedPendingStreets}
                remarkDrafts={remarkDrafts}
                setRemarkDrafts={setRemarkDrafts}
              />
            );
          })}
        </div>
      )}

      {activeTab === "scheduler" && (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold">Service Overseer Scheduler</h2>
          <p className="mt-1 text-sm text-slate-500">Assign guides in advance for the selected month.</p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Day</th>
                  <th className="px-3 py-3 font-medium">Territory</th>
                  <th className="px-3 py-3 font-medium">Guide</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row) => (
                  <tr key={`${row.dateKey}-${row.territoryNo}`} className="border-b border-slate-100">
                    <td className="px-3 py-3">{row.dateLong}</td>
                    <td className="px-3 py-3">{row.day}</td>
                    <td className="px-3 py-3 font-medium">{row.territoryNo}</td>
                    <td className="px-3 py-3">
                      <select
                        value={getAssignedGuide(row.dateKey, row.territoryNo) || ""}
                        onChange={(e) => handleGuideChange(row, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Not yet assigned</option>
                        {guides.map((guide) => (
                          <option key={guide} value={guide}>
                            {guide}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${badgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
