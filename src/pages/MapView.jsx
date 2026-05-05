import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { mapData } from "../data/mapData";
import {
  getTerritoryStatus,
  getPendingItemForTerritory,
  autoMarkMissedTerritories,
} from "../utils/storage";
import { territories } from "../data/territories";
import {
  buildMonthlyScheduleInstances,
  getDateKey,
} from "../utils/schedule";

function getRouteColor(status) {
  if (status === "Done") return "#22c55e";
  if (status === "Pending") return "#ef4444";
  return "#2563eb";
}

function FitBounds({ routes }) {
  const map = useMap();

  useEffect(() => {
    if (!routes.length) return;

    const allPoints = routes.flatMap((route) => route.coordinates);
    if (!allPoints.length) return;

    map.fitBounds(L.latLngBounds(allPoints), {
      padding: [45, 45],
      animate: true,
      duration: 0.8,
      maxZoom: 18,
    });
  }, [routes, map]);

  return null;
}

function getMidpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function getAngle(a, b) {
  const dy = b[0] - a[0];
  const dx = b[1] - a[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function buildArrowMarkers(coordinates) {
  const markers = [];

  if (coordinates.length < 2) return markers;

  for (let i = 0; i < coordinates.length - 1; i += 3) {
    const from = coordinates[i];
    const to = coordinates[i + 1];

    if (!from || !to) continue;

    markers.push({
      position: getMidpoint(from, to),
      angle: getAngle(from, to),
    });
  }

  if (markers.length === 0 && coordinates.length === 2) {
    markers.push({
      position: getMidpoint(coordinates[0], coordinates[1]),
      angle: getAngle(coordinates[0], coordinates[1]),
    });
  }

  return markers;
}

function ArrowMarkers({ coordinates }) {
  const arrows = useMemo(() => buildArrowMarkers(coordinates), [coordinates]);

  return (
    <>
      {arrows.map((arrow, index) => {
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              transform: rotate(${arrow.angle}deg);
              color: white;
              font-size: 10px;
              font-weight: 900;
              line-height: 1;
              text-shadow:
                -1px -1px 0 rgba(0,0,0,0.35),
                 1px -1px 0 rgba(0,0,0,0.35),
                -1px  1px 0 rgba(0,0,0,0.35),
                 1px  1px 0 rgba(0,0,0,0.35);
            ">▶</div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        return (
          <Marker
            key={`${arrow.position[0]}-${arrow.position[1]}-${index}`}
            position={arrow.position}
            icon={icon}
            interactive={false}
          />
        );
      })}
    </>
  );
}

function Legend() {
  const items = [
    { label: "Not updated", color: "#2563eb" },
    { label: "Done", color: "#22c55e" },
    { label: "Pending", color: "#ef4444" },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
            <span
              className="inline-block h-2.5 w-6 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MapView() {
  const [version, setVersion] = useState(0);

  const today = new Date();
  const todayKey = getDateKey(today);
  const todayName = today.toLocaleDateString("en-US", { weekday: "long" });

  const scheduleInstances = useMemo(
    () => buildMonthlyScheduleInstances(territories),
    [version]
  );

  useEffect(() => {
    const changed = autoMarkMissedTerritories(scheduleInstances, new Date());
    if (changed) setVersion((v) => v + 1);
  }, [scheduleInstances]);

  function getRouteStatus(route) {
    const currentStatus = getTerritoryStatus(todayKey, route.territoryNo);
    const carryOver = getPendingItemForTerritory(route.day, route.territoryNo);

    if (currentStatus === "Done") return "Done";
    if (currentStatus === "Pending" || carryOver) return "Pending";
    return "Not updated";
  }

  const routes = mapData
    .filter((item) => item.day === todayName)
    .map((item) => {
      const status = getRouteStatus(item);

      return {
        ...item,
        status,
        color: getRouteColor(status),
      };
    });

  const fallbackCenter = [14.5954, 121.0348];
  const firstRoute = routes.find((route) => route.coordinates.length > 0);
  const center = firstRoute ? firstRoute.coordinates[0] : fallbackCenter;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Map View</h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing routes for {todayName}. Rain or canceled ministry can be tracked as Pending.
        </p>
      </div>

      {routes.length === 0 ? (
        <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          No map routes added yet for {todayName}.
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <Legend />

          <div style={{ height: "620px", width: "100%" }}>
            <MapContainer
              center={center}
              zoom={18}
              minZoom={15}
              maxZoom={22}
              zoomControl={true}
              scrollWheelZoom={true}
              doubleClickZoom={true}
              dragging={true}
              keyboard={true}
              zoomSnap={0.25}
              zoomDelta={0.5}
              wheelPxPerZoomLevel={80}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={22}
              />

              <FitBounds routes={routes} />

              {routes.map((route, index) => {
                if (route.coordinates.length < 2) return null;

                return (
                  <React.Fragment key={`${route.street}-${index}-${version}`}>
                    <Polyline
                      positions={route.coordinates}
                      pathOptions={{
                        color: route.color,
                        weight: 5,
                        opacity: 0.65,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    />

                    <Polyline
                      positions={route.coordinates}
                      pathOptions={{
                        color: route.color,
                        weight: 30,
                        opacity: 0,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p>
                            <strong>Street:</strong> {route.street}
                          </p>
                          <p>
                            <strong>Territory:</strong> {route.territoryNo}
                          </p>
                          <p>
                            <strong>Status:</strong> {route.status}
                          </p>
                        </div>
                      </Popup>
                    </Polyline>

                    <ArrowMarkers coordinates={route.coordinates} />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
