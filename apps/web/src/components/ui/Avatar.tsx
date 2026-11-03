import type { AuthUser } from '../../lib/types';

/**
 * Renders a user's avatar. Shows the uploaded/Google avatar image when one
 * exists; otherwise shows a person-silhouette SVG fallback (used for email
 * signups that have no profile picture yet).
 */
export function Avatar({
  user,
  size = 40,
  className = '',
}: {
  user: Pick<AuthUser, 'avatar_url' | 'first_name' | 'last_name'>;
  size?: number;
  className?: string;
}) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  // Initials read as a person; the silhouette is the fallback when there is no name yet.
  const initials = [user.first_name, user.last_name]
    .map(part => part?.trim().charAt(0) ?? '')
    .join('')
    .toUpperCase();

  if (initials) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
        className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-mint font-semibold tracking-[0.01em] text-primary-dark ${className}`}
      >
        {initials}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-mint text-primary ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: size * 0.56, height: size * 0.56 }}
      >
        <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
        <path d="M12 13.25c-4.42 0-8 3.13-8 7.01 0 .41.34.74.75.74h14.5c.41 0 .75-.33.75-.74 0-3.88-3.58-7.01-8-7.01Z" />
      </svg>
    </span>
  );
}
