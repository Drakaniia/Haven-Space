import { Link } from '@tanstack/react-router';

import { buttonClasses } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Verification gate for landlord write surfaces (BUG-09 / W4-U27).
 *
 * The API rejects every landlord write with `403 Email verification required`
 * until the account is verified, so the form must say so up front instead of
 * letting the landlord fill in a listing that can never be saved. Mirrors the
 * pending-verification banner on the landlord dashboard.
 */
export function VerificationNotice() {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-tint px-5 py-4">
      <p className="flex items-start gap-2 text-sm text-warning-ink">
        <Icon name="shieldCheck" size={16} className="mt-0.5 shrink-0" />
        <span>
          Your account is still pending verification, so listing changes can&apos;t be saved yet.
          Complete verification and this form unlocks.
        </span>
      </p>
      <Link
        to="/landlord/verification"
        className={buttonClasses({ size: 'sm', variant: 'warning' })}
      >
        Complete verification
      </Link>
    </div>
  );
}
