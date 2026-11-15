import type { Env } from '../env';

/**
 * Admin accounts are bootstrapped from the `BOOTSTRAP_ADMIN_EMAILS` variable
 * (comma- or whitespace-separated). Nothing else in the app can create an admin.
 *
 * Only a Google sign-in promotes, because only Google proves the person owns the
 * email: password sign-ups are never email-verified, so anyone could register
 * the admin address with a password first.
 */
export function bootstrapAdminEmails(env: Pick<Env, 'BOOTSTRAP_ADMIN_EMAILS'>): Set<string> {
  return new Set(
    (env.BOOTSTRAP_ADMIN_EMAILS ?? '')
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email.includes('@'))
  );
}

export function isBootstrapAdminEmail(
  env: Pick<Env, 'BOOTSTRAP_ADMIN_EMAILS'>,
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return bootstrapAdminEmails(env).has(email.trim().toLowerCase());
}
