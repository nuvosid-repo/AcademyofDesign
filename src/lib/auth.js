import * as jose from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";
const secret = new TextEncoder().encode(JWT_SECRET);

// Sign a 1-day JWT carrying the user's id, role and name.
export async function signToken(user) {
  return new jose.SignJWT({
    id: (user._id && user._id.toString()) || user.id || "mock_user_id",
    role: user.role || "student",
    name: user.name || "Demo User",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
}

export async function verifyToken(token) {
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

// Extract the bearer token from a Route Handler Request.
export function getBearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

// Resolve the authenticated user for a Route Handler from either the bearer
// header (client apiFetch) or the nuvosid_token cookie (browser navigation).
// Returns the JWT payload { id, role, name } or null.
export async function getAuthUser(request) {
  let token = getBearer(request);
  if (!token) {
    token =
      request.cookies?.get?.("nuvosid_token_admin")?.value ||
      request.cookies?.get?.("nuvosid_token_student")?.value ||
      request.cookies?.get?.("nuvosid_token")?.value ||
      null;
  }
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export { bcrypt };
