import { Router, type IRouter, type Request, type Response } from "express";
import reportScript from "../assets/Report-FleetInventory.ps1";
import installScript from "../assets/install-fleet-reporter.bat";
import vncLaunchScript from "../assets/vnc-launch.ps1";
import vncHandlerInstall from "../assets/vnc-handler-install.bat";

const router: IRouter = Router();

function sendDownload(
  res: Response,
  filename: string,
  contentType: string,
  body: string,
) {
  // These are all Windows scripts (.bat / .ps1). The repo stores them with LF
  // line endings, but a Windows .bat with LF-only endings silently fails to run
  // (double-clicking it does nothing — cmd.exe can't parse it). Force CRLF so
  // the downloaded file runs correctly on the workstation.
  const crlfBody = body.replace(/\r?\n/g, "\r\n");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.send(crlfBody);
}

// Origin the request came in on (behind the Replit proxy, trust proxy=1 makes
// req.protocol / Host reflect the external dashboard URL the admin is using).
function requestOrigin(req: Request): string {
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : "";
}

router.get("/agent/report.ps1", (_req, res) => {
  sendDownload(
    res,
    "Report-FleetInventory.ps1",
    "text/plain; charset=utf-8",
    reportScript,
  );
});

router.get("/agent/install.bat", (req, res) => {
  let bat = installScript;

  // Values are injected into `set "VAR=..."` lines, so anything containing a
  // double-quote, percent, or control/whitespace char could break batch parsing
  // or inject commands. Only inject values that are safe for that context.
  const isBatchSafe = (v: string) => /^[^"%\s<>&|^]+$/.test(v);

  // Always pre-fill the dashboard URL from the site the file is downloaded from
  // (the URL is not sensitive). Replace only the assignment line so the "is it
  // set?" validation sentinel further down still works when something is blank.
  const origin = requestOrigin(req);
  if (origin && /^https?:\/\//.test(origin) && isBatchSafe(origin)) {
    bat = bat.replace(
      /set "DASHBOARD_URL=.*"/,
      `set "DASHBOARD_URL=${origin}"`,
    );
  }

  // The ingest token IS sensitive, so only embed it when the requester is an
  // authenticated admin (the dashboard download link sends the session cookie).
  // Anonymous/non-admin downloads keep the placeholder and must supply it.
  const token = process.env.INGEST_TOKEN;
  const isAdmin = req.session?.userId != null && req.session.role === "admin";
  if (isAdmin && token && isBatchSafe(token)) {
    bat = bat.replace(
      /set "INGEST_TOKEN=.*"/,
      `set "INGEST_TOKEN=${token}"`,
    );
  }

  sendDownload(
    res,
    "install-fleet-reporter.bat",
    "application/octet-stream",
    bat,
  );
});

// Validating launcher invoked by the vnc:// handler. Downloaded by the
// installer below; also fetched live by it. Carries no secrets.
router.get("/agent/vnc-launch.ps1", (_req, res) => {
  sendDownload(res, "vnc-launch.ps1", "text/plain; charset=utf-8", vncLaunchScript);
});

// One-time installer that registers the vnc:// scheme. Required on Windows for
// every viewer (TightVNC/UltraVNC/TigerVNC register nothing; RealVNC registers
// its own com.realvnc.vncviewer.connect:// scheme, not vnc://). The dashboard
// URL is pre-filled from the download origin; no secret is embedded, so it's
// served to anyone who can reach the dashboard.
router.get("/agent/vnc-handler.bat", (req, res) => {
  let bat = vncHandlerInstall;
  const isBatchSafe = (v: string) => /^[^"%\s<>&|^]+$/.test(v);
  const origin = requestOrigin(req);
  if (origin && /^https?:\/\//.test(origin) && isBatchSafe(origin)) {
    bat = bat.replace(/set "DASHBOARD_URL=.*"/, `set "DASHBOARD_URL=${origin}"`);
  }
  sendDownload(res, "vnc-handler-install.bat", "application/octet-stream", bat);
});

export default router;
