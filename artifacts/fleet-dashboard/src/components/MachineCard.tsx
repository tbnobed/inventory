import type { Machine } from "@workspace/api-client-react";
import FlagPill, { CleanPill } from "./FlagPill";
import { relativeTime, displayGpu, gpu2FromData } from "@/lib/utils";

interface Props {
  machine: Machine;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
}

function Spec({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const empty = value == null || value === "";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="label-upper">{label}</span>
      <span
        className="text-xs truncate"
        style={{ color: empty ? "#7d8aa3" : "#d6deec" }}
        title={empty ? "" : String(value)}
      >
        {empty ? "–" : String(value)}
      </span>
    </div>
  );
}

export default function MachineCard({ machine: m, onOpen, onMenu }: Props) {
  const ram =
    m.total_ram_gb != null
      ? `${m.total_ram_gb}GB ${m.ram_type ?? ""}`.trim()
      : null;

  return (
    <button
      type="button"
      data-testid={`card-machine-${m.machine_id}`}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      className="w-full text-left rounded-lg border p-3 transition-transform active:scale-[0.99]"
      style={{ background: "#121722", borderColor: "#232c3d" }}
    >
      {/* Header: hostname + IP, last seen */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: "#36d0c4" }}
          >
            {m.hostname}
          </div>
          <div className="text-xs truncate" style={{ color: "#7d8aa3" }}>
            {m.primary_ip ?? "no ip"}
          </div>
        </div>
        <span
          className="text-xs whitespace-nowrap shrink-0 pt-0.5"
          style={{ color: "#7d8aa3" }}
        >
          {m.last_seen ? relativeTime(m.last_seen) : "–"}
        </span>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {m.flags.length === 0 ? (
          <CleanPill />
        ) : (
          m.flags.map((f, i) => <FlagPill key={i} flag={f} />)
        )}
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Spec label="User" value={m.logged_in_user} />
        <Spec label="Site" value={m.site} />
        <Spec label="CPU" value={m.cpu} />
        <Spec label="RAM" value={ram} />
        <Spec label="GPU" value={displayGpu(m.gpu1_model, gpu2FromData(m.data))} />
        <Spec label="OS" value={m.os} />
      </div>
    </button>
  );
}
