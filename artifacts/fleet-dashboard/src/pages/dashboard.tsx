import { useState, useCallback } from "react";
import {
  useListMachines,
  useGetStats,
  useListSites,
  getListMachinesQueryKey,
  getGetStatsQueryKey,
  getListSitesQueryKey,
} from "@workspace/api-client-react";
import type { Machine } from "@workspace/api-client-react";
import TopBar from "@/components/TopBar";
import FlagPill, { CleanPill } from "@/components/FlagPill";
import DetailDrawer from "@/components/DetailDrawer";
import RowContextMenu from "@/components/RowContextMenu";
import MachineCard from "@/components/MachineCard";
import { relativeTime } from "@/lib/utils";
import { useLocation } from "wouter";

type SortKey = "hostname" | "logged_in_user" | "primary_ip" | "site" | "cpu" | "total_ram_gb" | "ram_type" | "gpu1_model" | "os" | "last_seen";

const COLUMNS: [SortKey, string][] = [
  ["hostname", "Host"],
  ["logged_in_user", "User"],
  ["primary_ip", "IP"],
  ["site", "Site"],
  ["cpu", "CPU"],
  ["total_ram_gb", "RAM"],
  ["ram_type", "Type"],
  ["gpu1_model", "GPU"],
  ["os", "OS"],
  ["last_seen", "Seen"],
];

interface Props {
  userId: number;
  username: string;
  role: string;
}

export default function DashboardPage({ userId: _userId, username, role }: Props) {
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("hostname");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; machine: Machine } | null>(null);
  const [, setLocation] = useLocation();

  const listParams = { search: search || undefined, site: siteFilter || undefined, flagged: flaggedOnly || undefined };
  const { data: machines = [], isLoading: machinesLoading } = useListMachines(
    listParams,
    { query: { refetchInterval: 30000, queryKey: getListMachinesQueryKey(listParams) } }
  );
  const { data: stats } = useGetStats({ query: { refetchInterval: 30000, queryKey: getGetStatsQueryKey() } });
  const { data: sites = [] } = useListSites({ query: { queryKey: getListSitesQueryKey() } });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...machines].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortKey];
    const bv = (b as unknown as Record<string, unknown>)[sortKey];
    const as = av == null ? "" : String(av).toLowerCase();
    const bs = bv == null ? "" : String(bv).toLowerCase();
    if (as < bs) return sortDir === "asc" ? -1 : 1;
    if (as > bs) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const closeDrawer = useCallback(() => setSelectedId(null), []);

  function exportCsv() {
    window.location.href = "/api/export.csv";
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: "#232c3d" }}> ▲</span>;
    return <span style={{ color: "#36d0c4" }}> {sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  const thStyle = "text-left px-3 py-2 cursor-pointer select-none label-upper whitespace-nowrap";

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#0b0e14" }}
    >
      <TopBar
        username={username}
        role={role}
      />

      {/* Stat strip */}
      <div
        className="grid grid-cols-3 gap-2 md:flex md:gap-3 px-4 py-2 border-b shrink-0 md:overflow-x-auto"
        style={{ borderColor: "#232c3d" }}
      >
        {[
          { label: "Total Machines", value: stats?.total_machines ?? "–", color: "#d6deec" },
          { label: "Flagged", value: stats?.flagged_machines ?? "–", color: "#e0b341" },
          { label: "Sites", value: stats?.site_count ?? "–", color: "#d6deec" },
          { label: "Danger", value: stats?.danger_count ?? "–", color: "#e0556b" },
          { label: "Warn", value: stats?.warn_count ?? "–", color: "#e0b341" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col px-3 py-1.5 rounded border shrink-0"
            style={{ background: "#121722", borderColor: "#232c3d" }}
          >
            <span className="label-upper">{s.label}</span>
            <span className="text-lg font-semibold" style={{ color: s.color }} data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-2 px-4 py-2 border-b shrink-0 items-center"
        style={{ borderColor: "#232c3d" }}
      >
        <input
          data-testid="input-search"
          type="search"
          placeholder="Search host, IP, CPU, GPU, OS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-auto md:flex-1 min-w-0 md:min-w-40 px-3 py-1.5 text-xs rounded border bg-transparent outline-none"
          style={{
            borderColor: "#232c3d",
            color: "#d6deec",
            fontFamily: "inherit",
          }}
        />

        <select
          data-testid="select-site"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="px-2 py-1.5 text-xs rounded border outline-none"
          style={{
            background: "#121722",
            borderColor: "#232c3d",
            color: siteFilter ? "#d6deec" : "#7d8aa3",
            fontFamily: "inherit",
          }}
        >
          <option value="">All Sites</option>
          {sites.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          data-testid="select-filter"
          value={flaggedOnly ? "flagged" : "all"}
          onChange={(e) => setFlaggedOnly(e.target.value === "flagged")}
          className="px-2 py-1.5 text-xs rounded border outline-none"
          style={{
            background: "#121722",
            borderColor: "#232c3d",
            color: "#d6deec",
            fontFamily: "inherit",
          }}
        >
          <option value="all">All Machines</option>
          <option value="flagged">Flagged Only</option>
        </select>

        <button
          data-testid="button-export-csv"
          onClick={exportCsv}
          className="px-3 py-1.5 rounded border label-upper transition-colors"
          style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#36d0c4";
            e.currentTarget.style.color = "#36d0c4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#232c3d";
            e.currentTarget.style.color = "#7d8aa3";
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Mobile sort bar */}
      <div
        className="flex md:hidden gap-2 px-4 py-2 border-b shrink-0 items-center"
        style={{ borderColor: "#232c3d" }}
      >
        <span className="label-upper shrink-0">Sort by</span>
        <select
          data-testid="select-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="flex-1 px-2 py-1.5 text-xs rounded border outline-none"
          style={{ background: "#121722", borderColor: "#232c3d", color: "#d6deec", fontFamily: "inherit" }}
        >
          {COLUMNS.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          data-testid="button-sort-dir"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="px-3 py-1.5 rounded border label-upper"
          style={{ borderColor: "#232c3d", color: "#36d0c4" }}
          aria-label="Toggle sort direction"
        >
          {sortDir === "asc" ? "▲" : "▼"}
        </button>
      </div>

      {/* Table (desktop) */}
      <div className="flex-1 overflow-auto hidden md:block">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
          <thead>
            <tr
              className="sticky top-0 z-10"
              style={{ background: "#161c2a", borderBottom: "1px solid #232c3d" }}
            >
              {COLUMNS.map(([key, label]) => (
                <th
                  key={key}
                  className={thStyle}
                  onClick={() => handleSort(key)}
                  data-testid={`th-${key}`}
                >
                  {label}<SortIcon col={key} />
                </th>
              ))}
              <th className="text-left px-3 py-2 label-upper">Flags</th>
            </tr>
          </thead>
          <tbody>
            {machinesLoading && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center" style={{ color: "#7d8aa3" }}>
                  Loading...
                </td>
              </tr>
            )}
            {!machinesLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center" style={{ color: "#7d8aa3" }}>
                  No machines found
                </td>
              </tr>
            )}
            {sorted.map((m: Machine) => (
              <tr
                key={m.machine_id}
                data-testid={`row-machine-${m.machine_id}`}
                onClick={() => setSelectedId(m.machine_id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, machine: m });
                }}
                className="border-b cursor-pointer transition-colors"
                style={{ borderColor: "#232c3d" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#161c2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-3 py-2 font-semibold" style={{ color: "#36d0c4" }}>
                  {m.hostname}
                </td>
                <td className="px-3 py-2 max-w-40 truncate" style={{ color: "#d6deec" }} title={m.logged_in_user ?? ""}>
                  {m.logged_in_user ?? "–"}
                </td>
                <td className="px-3 py-2" style={{ color: "#7d8aa3" }}>{m.primary_ip ?? "–"}</td>
                <td className="px-3 py-2" style={{ color: "#d6deec" }}>{m.site ?? "–"}</td>
                <td className="px-3 py-2 max-w-48 truncate" style={{ color: "#d6deec" }} title={m.cpu ?? ""}>
                  {m.cpu ?? "–"}
                </td>
                <td className="px-3 py-2" style={{ color: "#d6deec" }}>
                  {m.total_ram_gb != null ? `${m.total_ram_gb}GB` : "–"}
                </td>
                <td className="px-3 py-2" style={{ color: "#d6deec" }}>{m.ram_type ?? "–"}</td>
                <td className="px-3 py-2 max-w-40 truncate" style={{ color: "#d6deec" }} title={m.gpu1_model ?? ""}>
                  {m.gpu1_model ?? "–"}
                </td>
                <td className="px-3 py-2 max-w-40 truncate" style={{ color: "#d6deec" }} title={m.os ?? ""}>
                  {m.os ?? "–"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#7d8aa3" }}>
                  {m.last_seen ? relativeTime(m.last_seen) : "–"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {m.flags.length === 0
                      ? <CleanPill />
                      : m.flags.map((f, i) => <FlagPill key={i} flag={f} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card list (mobile) */}
      <div className="flex-1 overflow-y-auto md:hidden px-3 py-3 space-y-2">
        {machinesLoading && (
          <div className="px-3 py-8 text-center text-xs" style={{ color: "#7d8aa3" }}>
            Loading...
          </div>
        )}
        {!machinesLoading && sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-xs" style={{ color: "#7d8aa3" }}>
            No machines found
          </div>
        )}
        {sorted.map((m: Machine) => (
          <MachineCard
            key={m.machine_id}
            machine={m}
            onOpen={() => setSelectedId(m.machine_id)}
            onMenu={(x, y) => setMenu({ x, y, machine: m })}
          />
        ))}
      </div>

      {/* Row right-click menu */}
      {menu && (
        <RowContextMenu
          x={menu.x}
          y={menu.y}
          machine={menu.machine}
          onClose={() => setMenu(null)}
          onOpenDetails={() => setSelectedId(menu.machine.machine_id)}
        />
      )}

      {/* Detail drawer */}
      {selectedId && (
        <DetailDrawer
          machineId={selectedId}
          onClose={closeDrawer}
          isAdmin={role === "admin"}
        />
      )}
    </div>
  );
}
