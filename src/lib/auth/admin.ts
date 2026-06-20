import { getSessionUser } from "@/lib/auth/session";

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && configuredAdminEmails().has(email.toLowerCase()));
}

export async function getAdminUser() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
