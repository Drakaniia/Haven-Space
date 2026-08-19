import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Spinner } from '../../components/ui/Spinner';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingDispatcher,
});

function OnboardingDispatcher() {
  const { isAuthenticated, user, isHydrated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated || !user) {
      void navigate({ to: '/auth/login' });
      return;
    }
    if (user.role === 'landlord') {
      void navigate({ to: '/onboarding/landlord' });
    } else if (user.role === 'boarder') {
      void navigate({ to: '/onboarding/boarder' });
    } else {
      void navigate({ to: '/' });
    }
  }, [isHydrated, isAuthenticated, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}
