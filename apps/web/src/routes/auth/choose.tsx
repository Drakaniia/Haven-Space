import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Icon } from '../../components/ui/Icon';
import { authErrorSearch, sanitizeRedirect } from '../../lib/oauth';

export const Route = createFileRoute('/auth/choose')({
  validateSearch: authErrorSearch,
  component: ChoosePage,
});

function ChoosePage() {
  const { redirect: rawRedirect } = useSearch({ from: '/auth/choose' });
  const redirect = sanitizeRedirect(rawRedirect) ?? undefined;

  return (
    <AuthSplitLayout
      title="Join Haven Space"
      subtitle="Choose how you want to get started"
      footer={
        <p className="text-center">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-3">
        <Link
          to="/auth/signup"
          search={{ redirect }}
          className="flex items-center gap-4 rounded-xl border-2 border-primary bg-surface px-4 py-4 text-left hover:bg-mint"
        >
          <Icon name="search" size={28} className="shrink-0" />
          <span>
            <span className="block font-semibold text-ink">Boarder</span>
            <span className="block text-sm text-gray-ink">I&apos;m looking for a room</span>
          </span>
        </Link>
        <Link
          to="/auth/signup/landlord"
          search={{ redirect }}
          className="flex items-center gap-4 rounded-xl border-2 border-border bg-surface px-4 py-4 text-left hover:border-primary hover:bg-mint"
        >
          <Icon name="buildingOffice" size={28} className="shrink-0" />
          <span>
            <span className="block font-semibold text-ink">Landlord</span>
            <span className="block text-sm text-gray-ink">I rent out rooms</span>
          </span>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
