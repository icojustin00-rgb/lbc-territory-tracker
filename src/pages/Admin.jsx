import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { territories } from "../data/territories";
import { guides } from "../data/guides";
import {
  getTerritoryStatus,
  getPendingItems,
  removePendingItem,
  markTerritoryDone,
  resetScheduledTerritory,
  addManualPending,
  setAssignedGuide,
  getAssignedGuide,
  updatePendingItemStreets,
  getTerritoryRemark,
  setTerritoryRemark,
} from "../utils/storage";

function badgeClass(status) {
  if (status === "Done") return "bg-green-100 text-green-700 ring-green-200";
  if (status === "Pending") return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function rowKey(dateKey, territoryNo) {
  return `${dateKey}__${territoryNo}`;
}

function territoryRemarkKey(day, territoryNo) {
  return `${day}__${territoryNo}`;
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateShort(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDateLong(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
  const instances = [];

  while (date.getMonth() === month - 1) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    sourceTerritories
      .filter((item) => item.day === dayName)
      .forEach((territory) => {
        instances.push({
          ...territory,
          date: new Date(date),
          dateKey: getDateKey(date),
          dateShort: getDateShort(date),
          dateLong: getDateLong(date),
        });
      });

    date.setDate(date.getDate() + 1);
  }

  return instances;
}

export default function Admin() {
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue());

  const scheduleInstances = useMemo(
    () => buildScheduleInstancesForMonth(territories, selectedMonth),
    [selectedMonth, refreshKey]
  );

  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [manualSelectedStreets, setManualSelectedStreets] = useState([]);

  const [openPendingKey, setOpenPendingKey] = useState(null);
  const [selectedPendingStreets, setSelectedPendingStreets] = useState({});

  const [editingPendingId, setEditingPendingId] = useState(null);
  const [editingPendingStreets, setEditingPendingStreets] = useState({});

  const [guideSelections, setGuideSelections] = useState({});

  const [remarkDrafts, setRemarkDrafts] = useState(() => {
    const initial = {};
    territories.forEach((item) => {
      initial[territoryRemarkKey(item.day, item.territoryNo)] =
        getTerritoryRemark(item.day, item.territoryNo) || "";
    });
    return initial;
  });

  useEffect(() => {
    const initialGuides = {};
    scheduleInstances.forEach((item) => {
      initialGuides[rowKey(item.dateKey, item.territoryNo)] =
        getAssignedGuide(item.dateKey, item.territoryNo) || "";
    });
    setGuideSelections(initialGuides);

    if (scheduleInstances[0]) {
      setSelectedInstanceId(rowKey(scheduleInstances[0].dateKey, scheduleInstances[0].territoryNo));
    } else {
      setSelectedInstanceId("");
    }

    setManualSelectedStreets([]);
    setOpenPendingKey(null);
    setSelectedPendingStreets({});
  }, [selectedMonth]);

  const allPendingItems = getPendingItems();

  const selectedManualInstance =
    scheduleInstances.find(
      (item) => rowKey(item.dateKey, item.territoryNo) === selectedInstanceId
    ) || scheduleInstances[0];

  function refresh() {
    setRefreshKey((x) => x + 1);
  }

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 1800);
  }

  function handleMonthChange(value) {
    setSelectedMonth(value);
    showMessage(`Viewing ${getSelectedMonthLabel(value)}`);
  }

  function handleAdminDone(item) {
    markTerritoryDone(item.dateKey, item.territoryNo, item.day);
    refresh();
    showMessage(`${item.territoryNo} marked as Done`);
  }

  function handleAdminReset(item) {
    resetScheduledTerritory(item.dateKey, item.territoryNo, item.day);
    setOpenPendingKey(null);
    refresh();
    showMessage(`${item.territoryNo} reset to Not updated`);
  }

  function handlePendingRemove(id, territoryNo) {
    removePendingItem(id);
    refresh();
    showMessage(`${territoryNo} removed from Pending`);
  }

  function handlePendingDone(item) {
    markTerritoryDone(item.dateKey, item.territoryNo, item.sourceDay);
    refresh();
    showMessage(`${item.territoryNo} marked as Done`);
  }

  function handleGuideChange(dateKey, territoryNo, guideName) {
    const key = rowKey(dateKey, territoryNo);

    setGuideSelections((prev) => ({
      ...prev,
      [key]: guideName,
    }));

    setAssignedGuide(dateKey, territoryNo, guideName);

    showMessage(
      guideName
        ? `${territoryNo} guide updated to ${guideName}`
        : `${territoryNo} guide cleared`
    );

    refresh();
  }

  function openAdminPendingBox(item) {
    const key = rowKey(item.dateKey, item.territoryNo);
    setOpenPendingKey(key);
    setSelectedPendingStreets((prev) => ({
      ...prev,
      [key]: [],
    }));
  }

  function togglePendingStreet(itemKey, street) {
    setSelectedPendingStreets((prev) => {
      const current = prev[itemKey] || [];
      const exists = current.includes(street);

      return {
        ...prev,
        [itemKey]: exists
          ? current.filter((x) => x !== street)
          : [...current, street],
      };
    });
  }

  function saveAdminPendingSelection(item) {
    const key = rowKey(item.dateKey, item.territoryNo);
    const selected = selectedPendingStreets[key] || [];

    if (selected.length === 0) {
      showMessage("Please choose the streets left");
      return;
    }

    addManualPending(
      item.dateKey,
      item.day,
      item.territoryNo,
      selected,
      item.dateLong
    );

    setOpenPendingKey(null);
    refresh();
    showMessage(`${item.territoryNo} marked as Pending`);
  }

  function openEditPending(item) {
    setEditingPendingId(item.id);
    setEditingPendingStreets({
      [item.id]: [...item.leftStreets],
    });
  }

  function toggleEditPendingStreet(itemId, street) {
    setEditingPendingStreets((prev) => {
      const current = prev[itemId] || [];
      const exists = current.includes(street);

      return {
        ...prev,
        [itemId]: exists
          ? current.filter((x) => x !== street)
          : [...current, street],
      };
    });
  }

  function saveEditedPending(item) {
    const selected = editingPendingStreets[item.id] || [];

    if (selected.length === 0) {
      showMessage("Please choose the streets left");
      return;
    }

    updatePendingItemStreets(item.id, selected);
    setEditingPendingId(null);
    refresh();
    showMessage(`${item.territoryNo} pending streets updated`);
  }

  function cancelEditPending() {
    setEditingPendingId(null);
  }

  function toggleManualStreet(street) {
    setManualSelectedStreets((prev) =>
      prev.includes(street)
        ? prev.filter((x) => x !== street)
        : [...prev, street]
    );
  }

  function handleAddManualPending() {
    if (!selectedManualInstance) {
      showMessage("Please choose a schedule entry");
      return;
    }

    if (manualSelectedStreets.length === 0) {
      showMessage("Please choose the streets left");
      return;
    }

    addManualPending(
      selectedManualInstance.dateKey,
      selectedManualInstance.day,
      selectedManualInstance.territoryNo,
      manualSelectedStreets,
      selectedManualInstance.dateLong
    );

    setManualSelectedStreets([]);
    refresh();
    showMessage(`${selectedManualInstance.territoryNo} added to Pending`);
  }

  function updateRemarkDraft(day, territoryNo, value) {
    const key = territoryRemarkKey(day, territoryNo);
    setRemarkDrafts((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getRemarkDraft(day, territoryNo) {
    return remarkDrafts[territoryRemarkKey(day, territoryNo)] || "";
  }

  function saveRemark(day, territoryNo) {
    setTerritoryRemark(day, territoryNo, getRemarkDraft(day, territoryNo));
    refresh();
    showMessage(`Remark saved for ${territoryNo}`);
  }

  function clearRemark(day, territoryNo) {
    updateRemarkDraft(day, territoryNo, "");
    setTerritoryRemark(day, territoryNo, "");
    refresh();
    showMessage(`Remark cleared for ${territoryNo}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <Link
              to="/app/dashboard?fromAdmin=1"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              <span className="text-lg leading-none">←</span>
              <span>Go to Tracker</span>
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Admin Panel</h1>
              <p className="mt-1 text-sm text-slate-500">
                Edit monthly territory status, guide assignments, pending entries, and remarks.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Viewing: {getSelectedMonthLabel(selectedMonth)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
              />
              <p className="mt-2 text-xs text-slate-500">
                Use this to assign guides in advance for future months.
              </p>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Monthly Status Editor</h2>
              <p className="mt-1 text-sm text-slate-500">
                Edit every scheduled Tuesday to Friday entry for {getSelectedMonthLabel(selectedMonth)}.
              </p>

              {scheduleInstances.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">
                  No scheduled territories found for this month.
                </p>
              )}

              {scheduleInstances.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Day</th>
                        <th className="px-3 py-3 font-medium">Territory No.</th>
                        <th className="px-3 py-3 font-medium">Guide</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleInstances.map((item, index) => {
                        const status = getTerritoryStatus(item.dateKey, item.territoryNo);
                        const itemKey = rowKey(item.dateKey, item.territoryNo);
                        const selected = selectedPendingStreets[itemKey] || [];
                        const assignedGuide = guideSelections[itemKey] || "";

                        return (
                          <tr
                            key={`${item.dateKey}-${item.territoryNo}-${index}-${refreshKey}`}
                            className="border-b border-slate-100 align-top"
                          >
                            <td className="px-3 py-3">{item.dateShort}</td>
                            <td className="px-3 py-3">{item.day}</td>
                            <td className="px-3 py-3 font-medium">{item.territoryNo}</td>
                            <td className="px-3 py-3">
                              <select
                                value={assignedGuide}
                                onChange={(e) =>
                                  handleGuideChange(item.dateKey, item.territoryNo, e.target.value)
                                }
                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none"
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
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${badgeClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleAdminDone(item)}
                                  className="rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white"
                                >
                                  Mark Done
                                </button>

                                <button
                                  onClick={() => openAdminPendingBox(item)}
                                  className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white"
                                >
                                  Mark Pending
                                </button>

                                <button
                                  onClick={() => handleAdminReset(item)}
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                                >
                                  Reset
                                </button>
                              </div>

                              {openPendingKey === itemKey && (
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <p className="mb-3 text-xs font-medium text-slate-700">
                                    Choose the streets left:
                                  </p>

                                  <div className="grid gap-2">
                                    {item.streets.map((street) => (
                                      <label
                                        key={street}
                                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-5 w-5 accent-amber-500"
                                          checked={selected.includes(street)}
                                          onChange={() =>
                                            togglePendingStreet(itemKey, street)
                                          }
                                        />
                                        <span className="text-sm text-slate-700">
                                          {street}
                                        </span>
                                      </label>
                                    ))}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => saveAdminPendingSelection(item)}
                                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                                    >
                                      Save Pending Streets
                                    </button>

                                    <button
                                      onClick={() => setOpenPendingKey(null)}
                                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Pending Editor</h2>
              <p className="mt-1 text-sm text-slate-500">
                Edit, remove, or mark pending territories as done.
              </p>

              {allPendingItems.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No pending territories.</p>
              )}

              <div className="mt-4 space-y-3">
                {allPendingItems.map((item) => {
                  const territoryInfo = territories.find(
                    (t) =>
                      t.day === item.sourceDay &&
                      t.territoryNo === item.territoryNo
                  );

                  const editableStreets = territoryInfo?.streets || [];
                  const currentEditSelection =
                    editingPendingStreets[item.id] || [];

                  return (
                    <div
                      key={`${item.id}-${refreshKey}`}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm text-slate-500">{item.scheduledDate}</p>
                          <h3 className="font-semibold">{item.territoryNo}</h3>

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

                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handlePendingDone(item)}
                          className="rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white"
                        >
                          Mark Done
                        </button>

                        <button
                          onClick={() => openEditPending(item)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                        >
                          Edit Streets
                        </button>

                        <button
                          onClick={() =>
                            handlePendingRemove(item.id, item.territoryNo)
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                        >
                          Remove
                        </button>
                      </div>

                      {editingPendingId === item.id && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="mb-3 text-xs font-medium text-slate-700">
                            Edit the streets left:
                          </p>

                          <div className="grid gap-2">
                            {editableStreets.map((street) => (
                              <label
                                key={street}
                                className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                              >
                                <input
                                  type="checkbox"
                                  className="h-5 w-5 accent-amber-500"
                                  checked={currentEditSelection.includes(street)}
                                  onChange={() =>
                                    toggleEditPendingStreet(item.id, street)
                                  }
                                />
                                <span className="text-sm text-slate-700">
                                  {street}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => saveEditedPending(item)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                            >
                              Save Changes
                            </button>

                            <button
                              onClick={cancelEditPending}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Territory Remarks</h2>
              <p className="mt-1 text-sm text-slate-500">
                These remarks stay with the territory and can be read by the next guide or next week.
              </p>

              <div className="mt-4 space-y-4">
                {territories.map((item) => (
                  <div
                    key={`${item.day}-${item.territoryNo}`}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <p className="text-sm text-slate-500">{item.day}</p>
                    <h3 className="font-semibold">{item.territoryNo}</h3>

                    <textarea
                      value={getRemarkDraft(item.day, item.territoryNo)}
                      onChange={(e) =>
                        updateRemarkDraft(item.day, item.territoryNo, e.target.value)
                      }
                      placeholder="Add notes for future guides."
                      className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => saveRemark(item.day, item.territoryNo)}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                      >
                        Save Note
                      </button>

                      <button
                        onClick={() => clearRemark(item.day, item.territoryNo)}
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        Clear Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Add Pending Manually</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use this if a territory was missed or not entered properly.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Schedule Entry
                  </label>
                  <select
                    value={selectedInstanceId}
                    onChange={(e) => {
                      setSelectedInstanceId(e.target.value);
                      setManualSelectedStreets([]);
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none"
                  >
                    {scheduleInstances.map((item) => (
                      <option
                        key={rowKey(item.dateKey, item.territoryNo)}
                        value={rowKey(item.dateKey, item.territoryNo)}
                      >
                        {item.dateShort} - {item.day} - {item.territoryNo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Streets Left
                  </label>

                  <div className="space-y-2">
                    {(selectedManualInstance?.streets || []).map((street) => (
                      <label
                        key={street}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-amber-500"
                          checked={manualSelectedStreets.includes(street)}
                          onChange={() => toggleManualStreet(street)}
                        />
                        <span className="text-sm text-slate-700">{street}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddManualPending}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Add to Pending
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-blue-50 p-5 text-sm text-blue-800 ring-1 ring-blue-200">
              <p className="font-semibold">Admin note</p>
              <p className="mt-1">
                Use “Go to Tracker” above to open the public tracker with a temporary Back to Admin button.
                Normal users will not see that button when they open the tracker directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
