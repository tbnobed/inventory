import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListSubnets,
  useCreateSubnet,
  useDeleteSubnet,
  getListSubnetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/TopBar";

interface Props {
  username: string;
  role: string;
}

export default function SubnetsPage({ username, role }: Props) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: subnets = [], isLoading } = useListSubnets({
    query: { queryKey: getListSubnetsQueryKey() },
  });
  const createSubnet = useCreateSubnet();
  const deleteSubnet = useDeleteSubnet();

  const [showForm, setShowForm] = useState(false);
  const [cidr, setCidr] = useState("");
  const [site, setSite] = useState("");
  const [formError, setFormError] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    createSubnet.mutate(
      { data: { cidr, site } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubnetsQueryKey() });
          setShowForm(false);
          setCidr("");
          setSite("");
        },
        onError: () => setFormError("Failed to add rule — check the CIDR format (e.g. 10.1.0.0/16)"),
      }
    );
  }

  function handleDelete(id: number, label: string) {
    if (!confirm(`Delete subnet rule "${label}"?`)) return;
    deleteSubnet.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubnetsQueryKey() }) }
    );
  }

  const inputStyle = {
    background: "transparent",
    borderColor: "#232c3d",
    color: "#d6deec",
    fontFamily: "inherit",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0b0e14" }}>
      <TopBar username={username} role={role} />

      <div className="flex-1 overflow-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <button
              data-testid="link-back-dashboard"
              onClick={() => setLocation("/dashboard")}
              className="label-upper mr-4"
              style={{ color: "#7d8aa3" }}
            >
              ← Dashboard
            </button>
            <span className="label-upper" style={{ color: "#d6deec" }}>Site Mapping</span>
          </div>
          <button
            data-testid="button-add-subnet"
            onClick={() => setShowForm((v) => !v)}
            className="label-upper px-3 py-1.5 rounded border transition-colors"
            style={{ borderColor: "#36d0c4", color: "#36d0c4" }}
          >
            {showForm ? "Cancel" : "+ Add Rule"}
          </button>
        </div>

        {/* Explainer */}
        <p className="text-xs mb-4 max-w-2xl" style={{ color: "#7d8aa3" }}>
          When a workstation reports in, its site is auto-assigned from its IP address using these
          rules. Most-specific subnet wins. These only fill in a machine's site when it's blank —
          a site edited in the dashboard always takes precedence and is never overwritten by a report.
        </p>

        {/* Add rule form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-4 p-4 rounded border space-y-3"
            style={{ background: "#121722", borderColor: "#232c3d" }}
          >
            <div className="label-upper mb-2">New Subnet Rule</div>
            <div className="flex gap-3 flex-wrap">
              <input
                data-testid="input-new-cidr"
                type="text"
                placeholder="CIDR — e.g. 10.1.0.0/16"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                required
                className="flex-1 min-w-40 px-3 py-1.5 text-xs rounded border outline-none"
                style={inputStyle}
              />
              <input
                data-testid="input-new-site"
                type="text"
                placeholder="Site — e.g. Dallas"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                required
                className="flex-1 min-w-32 px-3 py-1.5 text-xs rounded border outline-none"
                style={inputStyle}
              />
              <button
                data-testid="button-submit-subnet"
                type="submit"
                disabled={createSubnet.isPending}
                className="px-3 py-1.5 rounded text-xs"
                style={{ background: "#36d0c4", color: "#0b0e14" }}
              >
                {createSubnet.isPending ? "Adding..." : "Add"}
              </button>
            </div>
            {formError && <p className="text-xs" style={{ color: "#e0556b" }}>{formError}</p>}
          </form>
        )}

        {/* Rules table */}
        <div
          className="rounded border overflow-hidden"
          style={{ background: "#121722", borderColor: "#232c3d" }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #232c3d" }}>
                <th className="text-left px-4 py-2 label-upper">Subnet (CIDR)</th>
                <th className="text-left px-4 py-2 label-upper">Site</th>
                <th className="text-left px-4 py-2 label-upper">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center" style={{ color: "#7d8aa3" }}>
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && subnets.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center" style={{ color: "#7d8aa3" }}>
                    No subnet rules yet. Add one to auto-assign sites from reported IPs.
                  </td>
                </tr>
              )}
              {subnets.map((s) => (
                <tr
                  key={s.id}
                  className="border-t"
                  style={{ borderColor: "#232c3d" }}
                  data-testid={`row-subnet-${s.id}`}
                >
                  <td className="px-4 py-2.5" style={{ color: "#d6deec" }}>
                    {s.cidr}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs border"
                      style={{ color: "#36d0c4", borderColor: "rgba(54,208,196,0.3)", background: "rgba(54,208,196,0.1)" }}
                    >
                      {s.site}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      data-testid={`button-delete-subnet-${s.id}`}
                      onClick={() => handleDelete(s.id, `${s.cidr} → ${s.site}`)}
                      className="label-upper px-2 py-1 rounded border transition-colors"
                      style={{ borderColor: "#232c3d", color: "#e0556b" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e0556b"; e.currentTarget.style.background = "rgba(224,85,107,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#232c3d"; e.currentTarget.style.background = "transparent"; }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
