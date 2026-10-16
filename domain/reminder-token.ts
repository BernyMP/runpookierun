import { createHmac, timingSafeEqual } from "node:crypto";
export function signUnsubscribe(
  userId: string,
  version: number,
  secret: string,
) {
  if (secret.length < 32)
    throw new Error("Weekly reminder signing key is not configured.");
  const payload = Buffer.from(JSON.stringify({ userId, version })).toString(
    "base64url",
  );
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyUnsubscribe(
  token: string,
  secret: string,
): { userId: string; version: number } | null {
  if (secret.length < 32 || token.length > 512) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      typeof data.userId !== "string" ||
      data.userId.length < 1 ||
      data.userId.length > 64 ||
      !Number.isSafeInteger(data.version) ||
      data.version < 0
    )
      return null;
    return { userId: data.userId, version: data.version };
  } catch {
    return null;
  }
}
