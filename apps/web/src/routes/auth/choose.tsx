import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { RoleChoice, type RoleValue } from '../../components/auth/RoleChoice';
import { Button } from '../../components/ui/Button';
import { authErrorSearch, sanitizeRedirect } from '../../lib/oauth';

export const Route = createFileRoute('/auth/choose')({
  validateSearch: authErrorSearch,
  component: ChoosePage,
});

function ChoosePage() {
  const { redirect: rawRedirect } = useSearch({ from: '/auth/choose' });
  const redirect = sanitizeRedirect(rawRedirect) ?? undefined;
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleValue | null>(null);
  const [missing, setMissing] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) {
      setMissing(true);
      return;
    }
    if (role === 'landlord') {
      void navigate({ to: '/auth/signup/landlord', search: { redirect } });
    } else {
      void navigate({ to: '/auth/signup', search: { redirect } });
    }
  }

  return (
    <AuthSplitLayout
      title="Join Haven Space"
      subtitle="Tell us how you’ll use Haven Space and we’ll set up the right account."
      footer={
        <p>
          Already have an account?{' '}
          <Link
            to="/auth/login"
            search={{ redirect }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      }
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <RoleChoice
          value={role}
          describedBy={missing ? 'role-missing' : undefined}
          onChange={value => {
            setRole(value);
            setMissing(false);
          }}
        />
        {missing ? (
          <p id="role-missing" role="alert" className="-mt-3 text-sm text-error-ink">
            Choose Boarder or Landlord to continue.
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full">
          {role === 'landlord'
            ? 'Continue as a landlord'
            : role === 'boarder'
            ? 'Continue as a boarder'
            : 'Continue'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
