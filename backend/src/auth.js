import crypto from "crypto";
import { prisma } from "./db/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "crm-local-jwt-secret";
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyPassword(password, hash) {
  return safeEqual(sha256Hex(password), hash);
}

export function signToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: String(user.id),
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  const [header, payload, signature] = String(token ?? "").split(".");
  if (!header || !payload || !signature) return null;

  try {
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (!safeEqual(signature, expected)) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp >= Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

export async function login(req, res, next) {
  try {
    const password = String(req.body?.password ?? "");
    const [user] = await prisma.$queryRaw`
      SELECT id, username, password_hash
      FROM usuarios
      WHERE username = 'admin'
      LIMIT 1
    `;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Unauthorized", message: "Contrasena invalida." });
    }

    res.json({ token: signToken(user), user: { id: String(user.id), username: user.username } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
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
      return res.status(401).json({ error: "Unauthorized", message: "Contrasena actual invalida." });
    }

    await prisma.$executeRaw`
      UPDATE usuarios
      SET password_hash = ${sha256Hex(newPassword)}
      WHERE id = ${user.id}
    `;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
