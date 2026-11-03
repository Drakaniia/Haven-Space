import { Link, createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/application-submitted')({
  component: ApplicationSubmittedPage,
});

function ApplicationSubmittedPage() {
  const nav = useBoarderNav();
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <Card className="mx-auto max-w-lg py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint">
            <Icon name="shieldCheck" size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink">Application submitted!</h1>
          <p className="mt-2 text-gray-ink">
            The landlord will review your application and you&apos;ll be notified of their decision.
          </p>
          <Link
            to="/boarder/applications"
            className="mt-5 inline-block rounded-full bg-primary-strong px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            View your applications
          </Link>
        </Card>
      </RoleShell>
    </Protected>
  );
}
