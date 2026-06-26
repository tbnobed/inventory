import { Router, type IRouter, type Request, type Response } from "express";
import reportScript from "../assets/Report-FleetInventory.ps1";
import installScript from "../assets/install-fleet-reporter.bat";

const router: IRouter = Router();

function sendDownload(
  res: Response,
  filename: string,
  contentType: string,
  body: string,
) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.send(body);
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

export default router;
