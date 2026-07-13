import { useEffect, useState } from "react";
import {
  useGetMachine,
  useDeleteMachine,
  useUpdateMachine,
  useListSubnets,
  getListMachinesQueryKey,
  getListSubnetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import FlagPill, { CleanPill } from "./FlagPill";
import { splitSemicolon, relativeTime } from "@/lib/utils";

interface Props {
  machineId: string | null;
  onClose: () => void;
  isAdmin: boolean;
}

function KVRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-2 py-1.5 border-b" style={{ borderColor: "#232c3d" }}>
      <span className="label-upper shrink-0 w-36">{label}</span>
      <span className="text-xs flex-1" style={{ color: "#d6deec" }}>{String(value)}</span>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div className="label-upper mb-2">{title}</div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="text-xs px-2 py-1.5 rounded"
            style={{ background: "#161c2a", color: "#d6deec" }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DetailDrawer({ machineId, onClose, isAdmin }: Props) {
  const queryClient = useQueryClient();
  const { data: machine, isLoading } = useGetMachine(machineId ?? "", {
    query: { enabled: !!machineId, queryKey: [machineId] as unknown[] },
  });
  const deleteMachine = useDeleteMachine();
  const updateMachine = useUpdateMachine();

  const { data: subnets = [] } = useListSubnets({ query: { queryKey: getListSubnetsQueryKey() } });

  const [editingSite, setEditingSite] = useState(false);
  const [siteValue, setSiteValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  // Site Mapping is the single source of truth: the dropdown only lists sites
  // defined in subnet rules. The machine's current site is also included so a
  // legacy value still shows as selected even if no rule defines it (anymore).
  const siteOptions = Array.from(
    new Set([
      ...subnets.map((s) => s.site),
      ...(machine?.site ? [machine.site] : []),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    setEditingSite(false);
    setEditingNotes(false);
  }, [machineId]);

  function handleSaveSite() {
    if (!machineId) return;
    updateMachine.mutate(
      { machineId, data: { site: siteValue.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [machineId] });
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          setEditingSite(false);
        },
      }
    );
  }

  function handleSaveNotes() {
    if (!machineId) return;
    updateMachine.mutate(
      { machineId, data: { notes: notesValue.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [machineId] });
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          setEditingNotes(false);
        },
      }
    );
  }

  function handleDelete() {
    if (!machineId || !confirm("Delete this machine record?")) return;
    deleteMachine.mutate(
      { machineId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          onClose();
        },
      }
    );
  }

  const data = machine?.data as Record<string, string> | null | undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
        data-testid="drawer-backdrop"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col border-l drawer-enter overflow-hidden"
        style={{
          width: "min(480px, 100vw)",
          background: "#121722",
          borderColor: "#232c3d",
        }}
        role="dialog"
        aria-modal="true"
        data-testid="detail-drawer"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "#232c3d" }}
        >
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: "#36d0c4" }}
              data-testid="text-drawer-hostname"
            >
              {machine?.hostname ?? machineId}
            </div>
            {machine?.model && (
              <div className="text-xs" style={{ color: "#7d8aa3" }}>
                {machine.model}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-drawer"
            className="text-xs px-2 py-1 rounded border"
            style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
          >
            ESC
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <span className="label-upper" style={{ color: "#7d8aa3" }}>Loading...</span>
          </div>
        )}

        {machine && !isLoading && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {/* Flags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {machine.flags.length === 0
                ? <CleanPill />
                : machine.flags.map((f, i) => <FlagPill key={i} flag={f} />)}
            </div>

            {/* Key-value block */}
            <div className="label-upper mb-1">System Info</div>
            <KVRow label="Machine ID" value={machine.machine_id} />
            <KVRow label="Hostname" value={machine.hostname} />
            <KVRow label="Logged-in User" value={machine.logged_in_user} />

            {/* Site — editable for admins */}
            <div className="flex gap-2 py-1.5 border-b items-center" style={{ borderColor: "#232c3d" }}>
              <span className="label-upper shrink-0 w-36">Site</span>
              {editingSite ? (
                <div className="flex-1 flex gap-1.5 items-center">
                  <select
                    data-testid="input-edit-site"
                    autoFocus
                    value={siteValue}
                    onChange={(e) => setSiteValue(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded border outline-none"
                    style={{ background: "#121722", borderColor: "#36d0c4", color: siteValue ? "#d6deec" : "#7d8aa3", fontFamily: "inherit" }}
                  >
                    <option value="">Unassigned</option>
                    {siteOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    data-testid="button-save-site"
                    onClick={handleSaveSite}
                    disabled={updateMachine.isPending}
                    className="text-xs px-2 py-1 rounded shrink-0"
                    style={{ background: "#36d0c4", color: "#0b0e14" }}
                  >
                    {updateMachine.isPending ? "..." : "Save"}
                  </button>
                  <button
                    data-testid="button-cancel-site"
                    onClick={() => setEditingSite(false)}
                    className="text-xs px-2 py-1 rounded border shrink-0"
                    style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex gap-2 items-center">
                  <span className="text-xs" style={{ color: machine.site ? "#d6deec" : "#7d8aa3" }} data-testid="text-machine-site">
                    {machine.site || "Unassigned"}
                  </span>
                  {isAdmin && (
                    <button
                      data-testid="button-edit-site"
                      onClick={() => { setSiteValue(machine.site ?? ""); setEditingSite(true); }}
                      className="text-xs px-2 py-0.5 rounded border shrink-0 transition-colors"
                      style={{ borderColor: "#2a3754", color: "#36d0c4" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(54,208,196,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <KVRow label="Primary IP" value={machine.primary_ip} />
            <KVRow label="Last Seen" value={machine.last_seen ? relativeTime(machine.last_seen) : undefined} />
            <KVRow label="Manufacturer" value={machine.manufacturer} />
            <KVRow label="Model" value={machine.model} />
            <KVRow label="Serial" value={data?.Serial} />
            <KVRow label="Motherboard" value={data?.Motherboard} />
            <KVRow label="BIOS" value={data?.BIOS} />
            <KVRow label="OS" value={machine.os} />
            <KVRow label="CPU" value={machine.cpu} />
            <KVRow label="RAM" value={machine.total_ram_gb ? `${machine.total_ram_gb} GB ${machine.ram_type ?? ""}`.trim() : undefined} />
            <KVRow label="RAM Slots" value={data?.RAM_Slots} />
            <KVRow label="GPU1" value={machine.gpu1_model} />
            <KVRow label="GPU1 Driver" value={data?.GPU1_Driver} />
            <KVRow label="GPU2" value={data?.GPU2_Model} />
            <KVRow label="GPU2 Driver" value={data?.GPU2_Driver} />

            {/* Notes — editable for admins */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="label-upper">Notes</div>
                {isAdmin && !editingNotes && (
                  <button
                    data-testid="button-edit-notes"
                    onClick={() => { setNotesValue(machine.notes ?? ""); setEditingNotes(true); }}
                    className="text-xs px-2 py-0.5 rounded border shrink-0 transition-colors"
                    style={{ borderColor: "#2a3754", color: "#36d0c4" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(54,208,196,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {machine.notes ? "Edit" : "Add"}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-1.5">
                  <textarea
                    data-testid="input-edit-notes"
                    autoFocus
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    maxLength={10000}
                    rows={4}
                    placeholder="Deployment details, known issues, hardware quirks..."
                    className="w-full px-2 py-1.5 text-xs rounded border outline-none resize-y"
                    style={{ background: "#161c2a", borderColor: "#36d0c4", color: "#d6deec", fontFamily: "inherit" }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      data-testid="button-save-notes"
                      onClick={handleSaveNotes}
                      disabled={updateMachine.isPending}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: "#36d0c4", color: "#0b0e14" }}
                    >
                      {updateMachine.isPending ? "..." : "Save"}
                    </button>
                    <button
                      data-testid="button-cancel-notes"
                      onClick={() => setEditingNotes(false)}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : machine.notes ? (
                <div
                  data-testid="text-machine-notes"
                  className="text-xs px-2 py-1.5 rounded whitespace-pre-wrap"
                  style={{ background: "#161c2a", color: "#d6deec" }}
                >
                  {machine.notes}
                </div>
              ) : (
                <div className="text-xs" style={{ color: "#7d8aa3" }} data-testid="text-machine-notes-empty">
                  No notes
                </div>
              )}
            </div>

            {/* List sections */}
            <ListSection title="Memory Modules" items={splitSemicolon(data?.RAM_Modules)} />
            <ListSection title="Disks" items={splitSemicolon(data?.Disks)} />
            <ListSection title="Volumes" items={splitSemicolon(data?.Volumes)} />
            <ListSection title="Network Adapters" items={splitSemicolon(data?.NICs)} />

            {/* Raw data collapsible */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t" style={{ borderColor: "#232c3d" }}>
                <button
                  data-testid="button-delete-machine"
                  onClick={handleDelete}
                  disabled={deleteMachine.isPending}
                  className="text-xs px-3 py-1.5 rounded border transition-colors"
                  style={{ borderColor: "#e0556b", color: "#e0556b" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(224,85,107,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {deleteMachine.isPending ? "Deleting..." : "Delete Machine"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
