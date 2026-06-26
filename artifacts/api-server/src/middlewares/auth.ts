import type { Request, Response, NextFunction } from "express";

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  next();
}

export function requireIngestToken(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.INGEST_TOKEN;
  const authHeader = req.headers.authorization;
  if (!token || authHeader !== `Bearer ${token}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
