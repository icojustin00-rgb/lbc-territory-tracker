import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import useTrackerDataReady from "./hooks/useTrackerDataReady";

import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Territories from "./pages/Territories";
import Pending from "./pages/Pending";
import Summary from "./pages/Summary";
import Admin from "./pages/Admin";

function LoadingTrackerData() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <h1 className="text-lg font-semibold text-slate-900">
          Loading territory data...
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Please wait while the latest data is loaded from Firebase.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const isTrackerDataReady = useTrackerDataReady();

  if (!isTrackerDataReady) {
    return <LoadingTrackerData />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="territories" element={<Territories />} />
        <Route path="pending" element={<Pending />} />
        <Route path="summary" element={<Summary />} />
      </Route>

      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}
