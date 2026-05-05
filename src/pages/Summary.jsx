import React, { useMemo, useState } from "react";
import { territories } from "../data/territories";
import {
  getTerritoryStatus,
  getAssignedGuide,
  getPendingItems,
  getTerritoryRemark,
} from "../utils/storage";

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

function getMonthLabel(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getLastSixMonthValues() {
  const months = [];
  const current = new Date();

  for (let i = 0; i < 6; i += 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
    months.push(getMonthValue(date));
  }

  return months;
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
        });
      });

    date.setDate(date.getDate() + 1);
  }

  return rows;
}

function badgeClass(status) {
  if (status === "Done") return "bg-green-100 text-green-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function Summary() {
  const monthOptions = getLastSixMonthValues();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

  const pendingItems = getPendingItems();

  const rows = useMemo(() => {
    const scheduleRows = buildScheduleInstancesForMonth(territories, selectedMonth);

    return scheduleRows.flatMap((item) => {
      const status = getTerritoryStatus(item.dateKey, item.territoryNo);
      const guide = getAssignedGuide(item.dateKey, item.territoryNo) || "Not assigned";
      const remark = getTerritoryRemark(item.day, item.territoryNo) || "";

      const pendingItem = pendingItems.find(
        (pending) =>
          pending.id === `${item.dateKey}__${item.territoryNo}` ||
          (pending.sourceDay === item.day &&
            pending.territoryNo === item.territoryNo &&
            pending.dateKey === item.dateKey)
      );

      const leftStreets =
        status === "Pending" && pendingItem?.leftStreets?.length
          ? pendingItem.leftStreets
          : [];

      return item.streets.map((street) => {
        let covered = false;
        let streetStatus = "Not updated";

        if (status === "Done") {
          covered = true;
          streetStatus = "Covered";
        }

        if (status === "Pending") {
          covered = !leftStreets.includes(street);
          streetStatus = covered ? "Covered" : "Pending";
        }

        return {
          dateKey: item.dateKey,
          dateShort: item.dateShort,
          day: item.day,
          territoryNo: item.territoryNo,
          street,
          guide,
          territoryStatus: status,
          streetStatus,
          covered,
          remark,
        };
      });
    });
  }, [selectedMonth, pendingItems]);

  const streetSummary = useMemo(() => {
    const grouped = {};

    rows.forEach((row) => {
      const key = `${row.territoryNo}__${row.street}`;

      if (!grouped[key]) {
        grouped[key] = {
          territoryNo: row.territoryNo,
          street: row.street,
          scheduledCount: 0,
          coveredCount: 0,
          pendingCount: 0,
          notUpdatedCount: 0,
        };
      }

      grouped[key].scheduledCount += 1;

      if (row.covered) grouped[key].coveredCount += 1;
      else if (row.streetStatus === "Pending") grouped[key].pendingCount += 1;
      else grouped[key].notUpdatedCount += 1;
    });

    return Object.values(grouped).map((item) => ({
      ...item,
      coveragePercent: percent(item.coveredCount, item.scheduledCount),
    }));
  }, [rows]);

  const totalScheduled = rows.length;
  const totalCovered = rows.filter((row) => row.covered).length;
  const totalPending = rows.filter((row) => row.streetStatus === "Pending").length;
  const totalNotUpdated = rows.filter((row) => row.streetStatus === "Not updated").length;
  const coverageRate = percent(totalCovered, totalScheduled);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Summary</h1>
            <p className="mt-1 text-sm text-slate-500">
              Excel-style monthly coverage report for CO submission records.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Coverage Rate</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{coverageRate}%</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Covered Streets</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{totalCovered}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pending Streets</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalPending}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Not Updated</p>
          <p className="mt-2 text-3xl font-bold text-slate-700">{totalNotUpdated}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">
          Street Coverage Summary — {getMonthLabel(selectedMonth)}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Shows how many times each street was scheduled and covered in the selected month.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-3 py-2 font-semibold">Territory</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Street</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Scheduled</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Covered</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Pending</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Not Updated</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Coverage %</th>
              </tr>
            </thead>
            <tbody>
              {streetSummary.map((row) => (
                <tr key={`${row.territoryNo}-${row.street}`} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 font-medium">
                    {row.territoryNo}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">{row.street}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.scheduledCount}</td>
                  <td className="border border-slate-200 px-3 py-2 text-green-700">
                    {row.coveredCount}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-amber-700">
                    {row.pendingCount}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600">
                    {row.notUpdatedCount}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 font-semibold">
                    {row.coveragePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">
          Detailed Monthly Records — {getMonthLabel(selectedMonth)}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This table shows each street per scheduled date, similar to an Excel record.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-3 py-2 font-semibold">Date</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Day</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Territory</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Street</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Guide</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Territory Status</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Street Status</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Remarks</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.dateKey}-${row.territoryNo}-${row.street}-${index}`}
                  className="odd:bg-white even:bg-slate-50"
                >
                  <td className="border border-slate-200 px-3 py-2">{row.dateShort}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.day}</td>
                  <td className="border border-slate-200 px-3 py-2 font-medium">
                    {row.territoryNo}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">{row.street}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.guide}</td>
                  <td className="border border-slate-200 px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                        row.territoryStatus
                      )}`}
                    >
                      {row.territoryStatus}
                    </span>
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {row.streetStatus}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {row.remark || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Note: If a territory is marked Done, all streets under that territory are counted as covered. If marked Pending, only the streets not selected as pending are counted as covered.
        </p>
      </div>
    </div>
  );
}
