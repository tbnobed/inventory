interface Flag {
  label: string;
  severity: string;
}

export default function FlagPill({ flag }: { flag: Flag }) {
  const colors =
    flag.severity === "danger"
      ? { bg: "rgba(224,85,107,0.15)", color: "#e0556b", border: "rgba(224,85,107,0.3)" }
      : flag.severity === "warn"
      ? { bg: "rgba(224,179,65,0.15)", color: "#e0b341", border: "rgba(224,179,65,0.3)" }
      : { bg: "rgba(74,208,122,0.15)", color: "#4ad07a", border: "rgba(74,208,122,0.3)" };

  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs whitespace-nowrap border"
      style={{ background: colors.bg, color: colors.color, borderColor: colors.border, fontFamily: "inherit" }}
    >
      {flag.label}
    </span>
  );
}

export function CleanPill() {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs border"
      style={{
        background: "rgba(74,208,122,0.1)",
        color: "#4ad07a",
        borderColor: "rgba(74,208,122,0.25)",
        fontFamily: "inherit",
      }}
    >
      clean
    </span>
  );
}
