import crypto from "crypto";
import { prisma } from "./db/prisma.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const SCRYPT_KEY_LENGTH = 64;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_FAILURES = 8;
const AUTH_COOKIE_NAME = "crm_session";
const authFailures = new Map();

function jwtSecret() {
  return process.env.JWT_SECRET;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyPassword(password, hash) {
  const [scheme, salt, storedHash] = String(hash ?? "").split(":");
  if (scheme === "scrypt" && salt && storedHash) {
    const candidate = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
    return safeEqual(candidate, storedHash);
  }

  return safeEqual(sha256Hex(password), hash);
}

function needsPasswordRehash(hash) {
  return !String(hash ?? "").startsWith("scrypt:");
}

function rateLimitKey(req, action) {
  return `${action}:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

function isRateLimited(req, action) {
  const key = rateLimitKey(req, action);
  const entry = authFailures.get(key);
  if (!entry || entry.resetAt <= Date.now()) return false;
  return entry.count >= AUTH_RATE_LIMIT_MAX_FAILURES;
}

function recordAuthFailure(req, action) {
  const key = rateLimitKey(req, action);
  const now = Date.now();
  const entry = authFailures.get(key);
  if (!entry || entry.resetAt <= now) {
    authFailures.set(key, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearAuthFailures(req, action) {
  authFailures.delete(rateLimitKey(req, action));
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function authCookie(token) {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${TOKEN_TTL_SECONDS}${secure}`;
}

function clearAuthCookie() {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`;
}

export function signToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: String(user.id),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  const signature = crypto.createHmac("sha256", jwtSecret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  const [header, payload, signature] = String(token ?? "").split(".");
  if (!header || !payload || !signature) return null;

  try {
    const expected = crypto.createHmac("sha256", jwtSecret()).update(`${header}.${payload}`).digest("base64url");
    if (!safeEqual(signature, expected)) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp >= Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

export async function login(req, res, next) {
  try {
    if (isRateLimited(req, "login")) {
      return res.status(429).json({ error: "TooManyRequests", message: "Demasiados intentos. Proba mas tarde." });
    }

    const password = String(req.body?.password ?? "");
    const [user] = await prisma.$queryRaw`
      SELECT id, username, password_hash
      FROM usuarios
      WHERE username = 'admin'
      LIMIT 1
    `;

    if (!user || !verifyPassword(password, user.password_hash)) {
      recordAuthFailure(req, "login");
      return res.status(401).json({ error: "Unauthorized", message: "Contrasena invalida." });
    }

    clearAuthFailures(req, "login");

    if (needsPasswordRehash(user.password_hash)) {
      await prisma.$executeRaw`
        UPDATE usuarios
        SET password_hash = ${hashPassword(password)}
        WHERE id = ${user.id}
      `;
    }

    res.setHeader("Set-Cookie", authCookie(signToken(user)));
    res.json({ user: { id: String(user.id), username: user.username } });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.setHeader("Set-Cookie", clearAuthCookie());
  res.status(204).send();
}

export async function me(req, res) {
  res.json({ user: { id: req.user.sub, username: req.user.username } });
}

export async function changePassword(req, res, next) {
  try {
    if (isRateLimited(req, "change-password")) {
      return res.status(429).json({ error: "TooManyRequests", message: "Demasiados intentos. Proba mas tarde." });
    }

    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "ValidationError", message: "La nueva contrasena es muy corta." });
    }

    const [user] = await prisma.$queryRaw`
      SELECT id, password_hash
      FROM usuarios
      WHERE username = 'admin'
      LIMIT 1
    `;

    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      recordAuthFailure(req, "change-password");
      return res.status(401).json({ error: "Unauthorized", message: "Contrasena actual invalida." });
    }

    clearAuthFailures(req, "change-password");

    await prisma.$executeRaw`
      UPDATE usuarios
      SET password_hash = ${hashPassword(newPassword)}
      WHERE id = ${user.id}
    `;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
