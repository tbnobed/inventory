import { Router, type IRouter } from "express";
import reportScript from "../assets/Report-FleetInventory.ps1";
import installScript from "../assets/install-fleet-reporter.bat";

const router: IRouter = Router();

function sendDownload(
  res: Parameters<Parameters<IRouter["get"]>[1]>[1],
  filename: string,
  contentType: string,
  body: string,
) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.send(body);
}

router.get("/agent/report.ps1", (_req, res) => {
  sendDownload(
    res,
    "Report-FleetInventory.ps1",
    "text/plain; charset=utf-8",
    reportScript,
  );
});

router.get("/agent/install.bat", (_req, res) => {
  sendDownload(
    res,
    "install-fleet-reporter.bat",
    "application/octet-stream",
    installScript,
  );
});

export default router;
