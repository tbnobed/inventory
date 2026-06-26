import { useEffect, useState } from "react";
import type { Machine } from "@workspace/api-client-react";
import {
  VNC_URL_TEMPLATE,
  JUMP_URL_TEMPLATE,
  buildLaunchUrl,
  launchRemote,
} from "@/config";

interface Props {
  x: number;
  y: number;
  machine: Machine;
  onClose: () => void;
  onOpenDetails: () => void;
}

const MENU_WIDTH = 224;
const MENU_HEIGHT = 300;

export default function RowContextMenu({
  x,
  y,
  machine,
  onClose,
  onOpenDetails,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ip = machine.primary_ip?.trim() || "";
  const hostname = machine.hostname?.trim() || "";
  const hasIp = ip.length > 0;

  // Build the launch URLs up front; buildLaunchUrl returns null when the
  // machine's IP/hostname contains characters unsafe to put in a protocol URL
  // (the values come from ingest and are not otherwise constrained).
  const vncUrl = buildLaunchUrl(VNC_URL_TEMPLATE, ip, hostname);
  const jumpUrl = buildLaunchUrl(JUMP_URL_TEMPLATE, ip, hostname);

  // Clamp inside the viewport so the menu is never cut off near edges.
  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(onClose, 600);
    } catch {
      onClose();
    }
  }

  function launch(url: string | null) {
    if (!url) return;
    launchRemote(url);
    onClose();
  }

  function setupVncHandler() {
    window.location.href = "/api/agent/vnc-handler.bat";
    onClose();
  }

  function MenuItem({
    label,
    onClick,
    disabled,
    accent,
    muted,
    title,
  }: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    accent?: boolean;
    muted?: boolean;
    title?: string;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={onClick}
        className="w-full text-left px-3 py-1.5 text-xs transition-colors"
        style={{
          color: disabled ? "#46506640" : accent ? "#36d0c4" : muted ? "#7d8aa3" : "#d6deec",
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = "#1c2433";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {label}
      </button>
    );
  }

  const divider = (
    <div style={{ height: 1, background: "#232c3d", margin: "4px 0" }} />
  );

  return (
    // Full-screen catcher closes the menu on any outside click / right-click.
    <div
      className="fixed inset-0"
      style={{ zIndex: 50 }}
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        role="menu"
        className="absolute rounded border shadow-lg py-1"
        style={{
          left,
          top,
          width: MENU_WIDTH,
          background: "#121722",
          borderColor: "#232c3d",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div
          className="px-3 py-1.5 truncate"
          style={{ color: "#36d0c4", fontSize: 11, fontWeight: 600 }}
          title={hostname}
        >
          {hostname || "machine"}
          <span style={{ color: "#7d8aa3", fontWeight: 400 }}>
            {hasIp ? `  ${ip}` : "  no IP"}
          </span>
        </div>
        {divider}
        <MenuItem
          label="Connect via VNC"
          accent
          disabled={!vncUrl}
          title={
            vncUrl
              ? `Open ${vncUrl}`
              : hasIp
                ? "IP/hostname is not safe to launch"
                : "No IP reported"
          }
          onClick={() => launch(vncUrl)}
        />
        <MenuItem
          label="Connect via Jump Desktop"
          accent
          disabled={!jumpUrl}
          title={
            jumpUrl
              ? `Open ${jumpUrl}`
              : hasIp
                ? "IP/hostname is not safe to launch"
                : "No IP reported"
          }
          onClick={() => launch(jumpUrl)}
        />
        {divider}
        <MenuItem
          label={copied === "ip" ? "Copied IP \u2713" : "Copy IP"}
          disabled={!hasIp}
          onClick={() => copy(ip, "ip")}
        />
        <MenuItem
          label={copied === "host" ? "Copied hostname \u2713" : "Copy hostname"}
          disabled={!hostname}
          onClick={() => copy(hostname, "host")}
        />
        <MenuItem label="Open details" onClick={() => { onOpenDetails(); onClose(); }} />
        {divider}
        <MenuItem
          label="Set up vnc:// handler\u2026"
          muted
          title="Required once per PC (run as admin). Windows VNC viewers — RealVNC included — don't register vnc:// for browser links by default; this maps it to your installed viewer."
          onClick={setupVncHandler}
        />
      </div>
    </div>
  );
}
