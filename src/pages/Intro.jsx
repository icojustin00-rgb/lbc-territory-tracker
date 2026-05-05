import React from "react";
import { Link } from "react-router";

const features = [
  {
    title: "View Territories",
    text: "See territory numbers and covered areas in one place.",
  },
  {
    title: "Check Schedule",
    text: "View assignments by day from Tuesday to Friday.",
  },
  {
    title: "Use the Map",
    text: "See territory locations in a clearer and simpler way.",
  },
];

export default function Intro() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-medium text-slate-500">
              Welcome
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              LBC Territory Tracker
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              A simple way to view territory assignments, schedules, and covered
              areas.
            </p>

            <div className="mt-8">
              <Link
                to="/app/dashboard"
                className="inline-flex rounded-2xl bg-slate-900 px-6 py-3 text-base font-medium text-white transition hover:opacity-90"
              >
                Open Tracker
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
              >
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm text-slate-600">
              Designed to be simple and easy to use on both phone and desktop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}