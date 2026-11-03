import { Link, createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { FlowSteps } from '../../components/rooms/BookingFlow';
import { buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { useBoarderNav } from '../../lib/use-boarder-nav';

const APPLY_STEPS = [
  { label: 'Choose a place' },
  { label: 'Apply' },
  { label: 'Landlord reviews' },
  { label: 'Confirm booking' },
];

export const Route = createFileRoute('/boarder/application-submitted')({
  component: ApplicationSubmittedPage,
});

function ApplicationSubmittedPage() {
  const nav = useBoarderNav();
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <div className="mx-auto max-w-xl py-4 sm:py-8">
          <div className="mb-6 flex justify-center">
            <FlowSteps steps={APPLY_STEPS} current={2} />
          </div>
          <Card padding="p-6 sm:p-8">
            <div className="rise-in text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-tint text-success-ink">
                <Icon name="check" size={28} />
              </span>
              <h1 className="mt-5 font-display text-[1.875rem] font-medium leading-tight tracking-[-0.02em] text-ink">
                Application sent
              </h1>
              <p className="mx-auto mt-2 max-w-md text-gray-ink">
                The landlord will review your application, and you&apos;ll be notified of their
                decision.
              </p>
            </div>

            <ol className="mt-7 space-y-4 border-t border-border pt-6">
              <Next icon="clock" title="Waiting for the landlord">
                Your application shows as pending in Applications until they respond.
              </Next>
              <Next icon="notification" title="We'll let you know">
                You get a notification as soon as it&apos;s accepted or declined.
              </Next>
              <Next icon="shieldCheck" title="Confirm your booking">
                Once accepted, choose a payment method and confirm to secure the room.
              </Next>
            </ol>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link to="/boarder/applications" className={buttonClasses()}>
                View your applications
              </Link>
              <Link to="/find-a-room" className={buttonClasses({ variant: 'outline' })}>
                Keep browsing
              </Link>
            </div>
          </Card>
        </div>
      </RoleShell>
    </Protected>
  );
}

function Next({ icon, title, children }: { icon: string; title: string; children: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-ink">{children}</p>
      </div>
    </li>
  );
}
