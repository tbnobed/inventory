import { useState, useEffect } from "react";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ORG_NAME } from "../config";

interface TopBarProps {
  username: string;
  role: string;
}

export default function TopBar({ username, role }: TopBarProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.clear();
      },
    });
  }

  return (
    <header
      className="relative flex items-center justify-between px-4 h-12 border-b shrink-0"
      style={{
        background: "#0b0e14",
        borderColor: "#232c3d",
      }}
    >
      {/* Left: logo mark + wordmark */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg
            width="22"
            height="22"
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Fleet Inventory"
            className="shrink-0"
          >
            <title>Fleet Inventory</title>
            <rect x="0" y="0" width="256" height="256" rx="44" fill="#121722" stroke="#232c3d" strokeWidth="2" />
            <rect x="60" y="62" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="73" r="7" fill="#36d0c4" />
            <rect x="60" y="96" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="107" r="7" fill="#36d0c4" />
            <rect x="60" y="130" width="116" height="22" rx="6" fill="#36d0c4" />
            <circle cx="160" cy="141" r="7" fill="#0b0e14" />
            <rect x="60" y="164" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="175" r="7" fill="#36d0c4" />
          </svg>
          <div className="flex items-baseline gap-0">
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: "#d6deec" }}
            >
              Fleet Inventory
            </span>
            <span style={{ color: "#36d0c4" }} className="text-sm font-bold">.</span>
          </div>
        </div>
        <span className="label-upper hidden sm:block">{ORG_NAME}</span>
      </div>

      {/* Right: desktop user info + nav */}
      <div className="hidden md:flex items-center gap-3">
        {role === "admin" && (
          <>
            <a
              data-testid="link-agent"
              href={`${import.meta.env.BASE_URL}api/agent/install.bat`}
              download="install-fleet-reporter.bat"
              className="label-upper transition-colors"
              style={{ color: "#7d8aa3" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#36d0c4")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8aa3")}
            >
              Agent Installer
            </a>
            <button
              data-testid="link-subnets"
              onClick={() => setLocation("/subnets")}
              className="label-upper transition-colors"
              style={{ color: "#7d8aa3" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#36d0c4")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8aa3")}
            >
              Site Mapping
            </button>
            <button
              data-testid="link-users"
              onClick={() => setLocation("/users")}
              className="label-upper transition-colors"
              style={{ color: "#7d8aa3" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#36d0c4")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8aa3")}
            >
              Users
            </button>
          </>
        )}
        <span
          className="text-xs"
          style={{ color: "#7d8aa3" }}
          data-testid="text-username"
        >
          {username}
        </span>
        <button
          data-testid="button-logout"
          onClick={handleLogout}
          className="label-upper px-2 py-1 rounded border transition-colors"
          style={{
            borderColor: "#232c3d",
            color: "#7d8aa3",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#36d0c4";
            e.currentTarget.style.color = "#36d0c4";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#232c3d";
            e.currentTarget.style.color = "#7d8aa3";
          }}
        >
          Logout
        </button>
      </div>

      {/* Mobile: hamburger toggle */}
      <button
        data-testid="button-mobile-menu"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={menuOpen}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded border"
        style={{ borderColor: "#232c3d", color: "#7d8aa3" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {menuOpen ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile: dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            data-testid="mobile-menu-backdrop"
          />
          <div
            className="md:hidden absolute right-2 top-12 z-50 w-56 rounded-lg border p-2 flex flex-col gap-0.5"
            style={{
              background: "#121722",
              borderColor: "#232c3d",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
            data-testid="mobile-menu"
          >
            <div
              className="px-2 py-2 text-xs border-b mb-1"
              style={{ color: "#7d8aa3", borderColor: "#232c3d" }}
            >
              Signed in as{" "}
              <span style={{ color: "#d6deec" }}>{username}</span>
            </div>

            {role === "admin" && (
              <>
                <a
                  data-testid="link-agent-mobile"
                  href={`${import.meta.env.BASE_URL}api/agent/install.bat`}
                  download="install-fleet-reporter.bat"
                  onClick={() => setMenuOpen(false)}
                  className="label-upper px-2 py-2.5 rounded"
                  style={{ color: "#7d8aa3" }}
                >
                  Agent Installer
                </a>
                <button
                  data-testid="link-subnets-mobile"
                  onClick={() => {
                    setLocation("/subnets");
                    setMenuOpen(false);
                  }}
                  className="label-upper text-left px-2 py-2.5 rounded"
                  style={{ color: "#7d8aa3" }}
                >
                  Site Mapping
                </button>
                <button
                  data-testid="link-users-mobile"
                  onClick={() => {
                    setLocation("/users");
                    setMenuOpen(false);
                  }}
                  className="label-upper text-left px-2 py-2.5 rounded"
                  style={{ color: "#7d8aa3" }}
                >
                  Users
                </button>
              </>
            )}

            <button
              data-testid="button-logout-mobile"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="label-upper text-left px-2 py-2.5 rounded border mt-1"
              style={{ color: "#36d0c4", borderColor: "#232c3d" }}
            >
              Logout
            </button>
          </div>
        </>
      )}
    </header>
  );
}
