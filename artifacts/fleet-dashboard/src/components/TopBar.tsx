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
      className="flex items-center justify-between px-4 h-12 border-b shrink-0"
      style={{
        background: "#0b0e14",
        borderColor: "#232c3d",
      }}
    >
      {/* Left: wordmark */}
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-0">
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "#d6deec" }}
          >
            Fleet Inventory
          </span>
          <span style={{ color: "#36d0c4" }} className="text-sm font-bold">.</span>
        </div>
        <span className="label-upper hidden sm:block">{ORG_NAME}</span>
      </div>

      {/* Right: user info + nav */}
      <div className="flex items-center gap-3">
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
    </header>
  );
}
