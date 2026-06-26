import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListUsers,
  useCreateUser,
  useDeleteUser,
  useUpdateUserPassword,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/TopBar";

interface Props {
  username: string;
  role: string;
}

export default function UsersPage({ username, role }: Props) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useUpdateUserPassword();

  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer">("viewer");
  const [formError, setFormError] = useState("");

  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    createUser.mutate(
      { data: { username: newUsername, password: newPassword, role: newRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setShowForm(false);
          setNewUsername("");
          setNewPassword("");
          setNewRole("viewer");
        },
        onError: () => setFormError("Failed to create user"),
      }
    );
  }

  function handleDelete(id: number, uname: string) {
    if (!confirm(`Delete user "${uname}"?`)) return;
    deleteUser.mutate(
      { userId: id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }) }
    );
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    resetPassword.mutate(
      { userId: resetUserId, data: { password: resetPw } },
      {
        onSuccess: () => {
          setResetUserId(null);
          setResetPw("");
        },
      }
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
      <TopBar
        username={username}
        role={role}
      />

      <div className="flex-1 overflow-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              data-testid="link-back-dashboard"
              onClick={() => setLocation("/dashboard")}
              className="label-upper mr-4"
              style={{ color: "#7d8aa3" }}
            >
              ← Dashboard
            </button>
            <span className="label-upper" style={{ color: "#d6deec" }}>User Management</span>
          </div>
          <button
            data-testid="button-add-user"
            onClick={() => setShowForm((v) => !v)}
            className="label-upper px-3 py-1.5 rounded border transition-colors"
            style={{ borderColor: "#36d0c4", color: "#36d0c4" }}
          >
            {showForm ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {/* Add user form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-4 p-4 rounded border space-y-3"
            style={{ background: "#121722", borderColor: "#232c3d" }}
          >
            <div className="label-upper mb-2">New User</div>
            <div className="flex gap-3 flex-wrap">
              <input
                data-testid="input-new-username"
                type="text"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="flex-1 min-w-32 px-3 py-1.5 text-xs rounded border outline-none"
                style={inputStyle}
              />
              <input
                data-testid="input-new-password"
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="flex-1 min-w-32 px-3 py-1.5 text-xs rounded border outline-none"
                style={inputStyle}
              />
              <select
                data-testid="select-new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "viewer")}
                className="px-2 py-1.5 text-xs rounded border outline-none"
                style={{ ...inputStyle, background: "#121722" }}
              >
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
              <button
                data-testid="button-submit-user"
                type="submit"
                disabled={createUser.isPending}
                className="px-3 py-1.5 rounded text-xs"
                style={{ background: "#36d0c4", color: "#0b0e14" }}
              >
                {createUser.isPending ? "Creating..." : "Create"}
              </button>
            </div>
            {formError && <p className="text-xs" style={{ color: "#e0556b" }}>{formError}</p>}
          </form>
        )}

        {/* Reset password form */}
        {resetUserId !== null && (
          <form
            onSubmit={handleReset}
            className="mb-4 p-4 rounded border space-y-3"
            style={{ background: "#121722", borderColor: "#232c3d" }}
          >
            <div className="label-upper mb-2">
              Reset Password — {users.find((u) => u.id === resetUserId)?.username}
            </div>
            <div className="flex gap-3">
              <input
                data-testid="input-reset-password"
                type="password"
                placeholder="New password"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                required
                className="flex-1 px-3 py-1.5 text-xs rounded border outline-none"
                style={inputStyle}
              />
              <button
                data-testid="button-confirm-reset"
                type="submit"
                disabled={resetPassword.isPending}
                className="px-3 py-1.5 rounded text-xs"
                style={{ background: "#36d0c4", color: "#0b0e14" }}
              >
                {resetPassword.isPending ? "Saving..." : "Save"}
              </button>
              <button
                data-testid="button-cancel-reset"
                type="button"
                onClick={() => { setResetUserId(null); setResetPw(""); }}
                className="px-3 py-1.5 rounded text-xs border"
                style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Users table */}
        <div
          className="rounded border overflow-hidden"
          style={{ background: "#121722", borderColor: "#232c3d" }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #232c3d" }}>
                <th className="text-left px-4 py-2 label-upper">Username</th>
                <th className="text-left px-4 py-2 label-upper">Role</th>
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
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t"
                  style={{ borderColor: "#232c3d" }}
                  data-testid={`row-user-${u.id}`}
                >
                  <td className="px-4 py-2.5" style={{ color: "#d6deec" }}>
                    {u.username}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs border"
                      style={
                        u.role === "admin"
                          ? { color: "#36d0c4", borderColor: "rgba(54,208,196,0.3)", background: "rgba(54,208,196,0.1)" }
                          : { color: "#7d8aa3", borderColor: "#232c3d" }
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button
                        data-testid={`button-reset-user-${u.id}`}
                        onClick={() => { setResetUserId(u.id); setResetPw(""); setShowForm(false); }}
                        className="label-upper px-2 py-1 rounded border transition-colors"
                        style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#36d0c4"; e.currentTarget.style.borderColor = "#36d0c4"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#7d8aa3"; e.currentTarget.style.borderColor = "#232c3d"; }}
                      >
                        Reset PW
                      </button>
                      <button
                        data-testid={`button-delete-user-${u.id}`}
                        onClick={() => handleDelete(u.id, u.username)}
                        className="label-upper px-2 py-1 rounded border transition-colors"
                        style={{ borderColor: "#232c3d", color: "#e0556b" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e0556b"; e.currentTarget.style.background = "rgba(224,85,107,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#232c3d"; e.currentTarget.style.background = "transparent"; }}
                      >
                        Delete
                      </button>
                    </div>
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
