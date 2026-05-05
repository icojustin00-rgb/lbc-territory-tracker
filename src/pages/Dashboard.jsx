import React, { useEffect, useMemo, useState } from "react";
import {
  getPendingCount,
  getCompletedThisMonthCount,
  getMonthLabel,
  getTerritoryStatus,
  getAssignedGuide,
  getTerritoryRemark,
  getPendingItemForTerritory,
  autoMarkMissedTerritories,
  cleanupFuturePendingItems,
} from "../utils/storage";
import { territories, totalStreetCount } from "../data/territories";
import { buildMonthlyScheduleInstances, getDateKey } from "../utils/schedule";

function badgeClass(status) {
  if (status === "Done") return "bg-green-100 text-green-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date();
  const todayKey = getDateKey(today);

  const formattedDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const monthlySchedule = useMemo(
    () => buildMonthlyScheduleInstances(territories),
    [refreshKey]
  );

  useEffect(() => {
    const cleaned = cleanupFuturePendingItems(new Date());
    const changed = autoMarkMissedTerritories(monthlySchedule, new Date());

    if (cleaned || changed) {
      setRefreshKey((value) => value + 1);
    }
  }, [monthlySchedule]);

  const assignments = useMemo(() => {
    return monthlySchedule
      .filter((item) => item.dateKey >= todayKey)
      .slice(0, 2)
      .map((item) => {
        const savedStatus = getTerritoryStatus(item.dateKey, item.territoryNo);
        const carryOverPending = getPendingItemForTerritory(
          item.day,
          item.territoryNo
        );

        const status =
          savedStatus === "Done"
            ? "Done"
            : savedStatus === "Pending" || carryOverPending
            ? "Pending"
            : "Not updated";

        return {
          ...item,
          guide:
            getAssignedGuide(item.dateKey, item.territoryNo) ||
            "Not yet assigned",
          status,
          remark: getTerritoryRemark(item.day, item.territoryNo) || "",
          carryOverPending,
        };
      });
  }, [monthlySchedule, todayKey, refreshKey]);

  const nextAssignment = assignments[0];
  const upcomingAssignment = assignments[1];

  const dashboardReminders = nextAssignment
    ? [nextAssignment].filter(
        (item) =>
          item.remark ||
          (item.carryOverPending && item.carryOverPending.leftStreets?.length)
      )
    : [];

  function AssignmentDetails({ assignment }) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">{assignment.dateLong}</p>
            <p className="font-semibold text-slate-800">
              Territory {assignment.territoryNo}
            </p>
            <p className="text-sm text-slate-500">Guide: {assignment.guide}</p>
          </div>

          <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${badgeClass(assignment.status)}`}>
            {assignment.status}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-slate-500">{formattedDate}</p>
        <p className="mt-1 text-sm text-slate-400">
          Current month: {getMonthLabel()}
        </p>
      </div>

      {dashboardReminders.length > 0 && (
        <div className="rounded-3xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
          <h2 className="text-xl font-semibold text-amber-900">
            Territory Reminder
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Reminder for the next scheduled territory only.
          </p>

          <div className="mt-4 space-y-3">
            {dashboardReminders.map((item) => (
              <div
                key={`${item.dateKey}-${item.territoryNo}`}
                className="rounded-2xl bg-white p-4 ring-1 ring-amber-200"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.dateLong}</p>
                    <p className="font-semibold text-slate-900">
                      Territory {item.territoryNo}
                    </p>
                    <p className="text-sm text-slate-500">Guide: {item.guide}</p>
                  </div>

                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${badgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                {item.carryOverPending?.leftStreets?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-amber-900">
                      Pending streets:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.carryOverPending.leftStreets.map((street) => (
                        <span
                          key={street}
                          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                        >
                          {street}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.remark && (
                  <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-100">
                    <p className="font-semibold">Remark</p>
                    <p className="mt-1">{item.remark}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {nextAssignment && (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Next Ministry Assignment
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {nextAssignment.dateLong}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{nextAssignment.day}</p>
            </div>

            <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${badgeClass(nextAssignment.status)}`}>
              {nextAssignment.status}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Guide
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                {nextAssignment.guide}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Territory No.
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                {nextAssignment.territoryNo}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Territories</p>
          <p className="mt-2 text-3xl font-bold">{totalStreetCount}</p>
          <p className="mt-1 text-xs text-slate-400">Counted by streets</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pending Territories</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {getPendingCount()}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Completed This Month</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {getCompletedThisMonthCount()}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-500">Upcoming Assignment</p>

        {upcomingAssignment ? (
          <div className="mt-4">
            <AssignmentDetails assignment={upcomingAssignment} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No next upcoming assignment after the current one.
          </p>
        )}
      </div>
    </div>
  );
}
// test deploy