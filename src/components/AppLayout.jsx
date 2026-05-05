import React from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Schedule", to: "/app/schedule" },
  { label: "Territories", to: "/app/territories" },
  { label: "Pending", to: "/app/pending" },
  { label: "Summary", to: "/app/summary" },
];

export default function AppLayout() {
  const location = useLocation();

  // 🔥 Detect if coming from admin
  const showBackToAdmin =
    new URLSearchParams(location.search).get("fromAdmin") === "1";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="border-b border-slate-200 bg-white p-4 md:w-64 md:border-b-0 md:border-r">
          <div className="mb-5">
            <h1 className="text-lg font-bold text-slate-900">
              LBC Territory Tracker
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Congregation territory support tool
            </p>
          </div>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6">
          {/* 🔥 BACK TO ADMIN BUTTON */}
          {showBackToAdmin && (
            <Link
              to="/admin"
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              ← Back to Admin
            </Link>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}