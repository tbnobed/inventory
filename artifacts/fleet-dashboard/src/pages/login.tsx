import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { ORG_NAME } from "../config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const login = useLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          setError("Invalid username or password");
        },
      }
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0b0e14" }}
    >
      <div
        className="w-full max-w-sm border p-8 rounded"
        style={{
          background: "#121722",
          borderColor: "#232c3d",
        }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Fleet Inventory"
            className="mx-auto mb-3"
          >
            <title>Fleet Inventory</title>
            <rect x="0" y="0" width="256" height="256" rx="44" fill="#0b0e14" stroke="#232c3d" strokeWidth="2" />
            <rect x="60" y="62" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="73" r="7" fill="#36d0c4" />
            <rect x="60" y="96" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="107" r="7" fill="#36d0c4" />
            <rect x="60" y="130" width="116" height="22" rx="6" fill="#36d0c4" />
            <circle cx="160" cy="141" r="7" fill="#0b0e14" />
            <rect x="60" y="164" width="116" height="22" rx="6" fill="#1c6f69" />
            <circle cx="160" cy="175" r="7" fill="#36d0c4" />
          </svg>
          <div
            className="text-xl font-semibold tracking-tight"
            style={{ color: "#d6deec" }}
          >
            Fleet Inventory
            <span style={{ color: "#36d0c4" }}>.</span>
          </div>
          <div
            className="label-upper mt-1"
            style={{ color: "#7d8aa3" }}
          >
            {ORG_NAME}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="label-upper block mb-1"
            >
              Username
            </label>
            <input
              id="username"
              data-testid="input-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded border bg-transparent outline-none transition-colors"
              style={{
                borderColor: "#232c3d",
                color: "#d6deec",
                fontFamily: "inherit",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#36d0c4")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#232c3d")
              }
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="label-upper block mb-1"
            >
              Password
            </label>
            <input
              id="password"
              data-testid="input-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded border bg-transparent outline-none transition-colors"
              style={{
                borderColor: "#232c3d",
                color: "#d6deec",
                fontFamily: "inherit",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#36d0c4")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#232c3d")
              }
            />
          </div>

          {error && (
            <p
              className="text-xs"
              data-testid="text-login-error"
              style={{ color: "#e0556b" }}
            >
              {error}
            </p>
          )}

          <button
            data-testid="button-login"
            type="submit"
            disabled={login.isPending}
            className="w-full py-2 rounded text-sm font-medium transition-opacity"
            style={{
              background: "#36d0c4",
              color: "#0b0e14",
              opacity: login.isPending ? 0.7 : 1,
              cursor: login.isPending ? "not-allowed" : "pointer",
            }}
          >
            {login.isPending ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
