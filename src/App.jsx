import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import FirebaseSync from "./components/FirebaseSync";

import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Territories from "./pages/Territories";
import Pending from "./pages/Pending";
import Summary from "./pages/Summary";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <>
      <FirebaseSync />

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
    </>
  );
}