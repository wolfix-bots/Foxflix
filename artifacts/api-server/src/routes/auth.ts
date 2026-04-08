import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../lib/db.js";
import { signToken, authMiddleware } from "../lib/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  if (username.length < 3 || username.length > 32) {
    res.status(400).json({ error: "Username must be 3–32 characters" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    const result = stmt.run(username, hash);
    const userId = result.lastInsertRowid as number;
    // Create room automatically
    db.prepare("INSERT INTO rooms (host_id, name) VALUES (?, ?)").run(userId, `${username}'s Room`);
    const token = signToken({ userId, username });
    res.json({ token, username, userId });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Username already taken" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const user = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, username: user.username, userId: user.id });
});

router.get("/me", authMiddleware, (req: Request, res: Response): void => {
  const { userId, username } = (req as Request & { user: JwtPayload }).user;
  const user = db.prepare("SELECT id, username, playback_speed, created_at FROM users WHERE id = ?").get(userId) as
    | { id: number; username: string; playback_speed: number; created_at: number }
    | undefined;
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ userId, username, plabackSpeed: user.playback_speed, createdAt: user.created_at });
});

export default router;
