import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { FlowSkeleton, FlowSteps, ListingSummary } from '../../../../components/rooms/BookingFlow';
import {
  cleanRoomType,
  formatPrice,
  freeSlotsLabel,
  isRoomAvailable,
} from '../../../../components/rooms/detail-helpers';
import { Button, buttonClasses } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../../../components/ui/Field';
import { Icon } from '../../../../components/ui/Icon';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { ApiRequestError } from '../../../../lib/api/http';
import { createApplication } from '../../../../lib/api/boarder';
import { getRoomDetail } from '../../../../lib/api/public';
import { useAuth } from '../../../../lib/auth-context';
import { BOARDER_STATUS_KEY } from '../../../../lib/use-boarder-nav';

const APPLY_STEPS = [
  { label: 'Choose a place' },
  { label: 'Apply' },
  { label: 'Landlord reviews' },
  { label: 'Confirm booking' },
];

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

type ApplyErrors = { room?: string; message?: string; terms?: string };

export const Route = createFileRoute('/boarder/find-a-room/$id/apply')({
  validateSearch: (search: Record<string, unknown>) => ({
    room:
      typeof search.room === 'number'
        ? String(search.room)
        : typeof search.room === 'string'
        ? search.room
        : '',
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const { id } = Route.useParams();
  const { room: initialRoom } = Route.useSearch();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [roomId, setRoomId] = useState(initialRoom);
  const [moveInDate, setMoveInDate] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ApplyErrors>({});
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  const submit = useMutation({
    mutationFn: () => {
      const dateLine = moveInDate ? `Preferred move-in date: ${moveInDate}\n\n` : '';
      const fullMessage = `${dateLine}${message.trim()}`;
      return createApplication(token!, {
        room_id: Number(roomId),
        landlord_id: detail.data!.data.landlord.id,
        message: fullMessage,
      });
    },
    onSuccess: () => {
      // Submitting moves the boarder's status (new → applied_pending) — refresh
      // it so the sidebar/gates stay accurate (spec R13).
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      void navigate({ to: '/boarder/application-submitted' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit application.'),
  });

  const listing = detail.data?.data;
  // The same availability rule as the listing page, so a room chosen there is always offered here.
  const availableRooms = useMemo(() => (listing?.rooms ?? []).filter(isRoomAvailable), [listing]);
  const selectedRoom = availableRooms.find(room => String(room.id) === roomId);

  const monthlyRent = selectedRoom?.price ?? listing?.price ?? 0;
  const deposit = selectedRoom?.deposit ?? monthlyRent;
  const advance = monthlyRent;
  const initialPayment = monthlyRent + deposit + advance;

  function clearFieldError(key: keyof ApplyErrors) {
    setError(null);
    setFieldErrors(f => (f[key] ? { ...f, [key]: undefined } : f));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const next: ApplyErrors = {};
    if (!roomId || !selectedRoom) next.room = 'Select a room to apply for.';
    if (!message.trim()) next.message = 'Add a short message so the landlord knows who you are.';
    if (!agreed) next.terms = 'Please agree to the Terms of Service to continue.';
    setFieldErrors(next);

    const firstInvalid = next.room
      ? 'room-type-options'
      : next.message
      ? 'message'
      : next.terms
      ? 'apply-terms'
      : null;
    if (firstInvalid) {
      const target = document.getElementById(firstInvalid);
      (target?.querySelector<HTMLElement>('input') ?? target)?.focus();
      return;
    }
    submit.mutate();
  }

  if (detail.isLoading) return <FlowSkeleton />;
  if (detail.error) {
    return (
      <ErrorState
        message="We couldn't load this listing."
        hint={detail.error.message}
        action={
          <Button variant="outline" size="sm" onClick={() => void detail.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!listing) return null;

  return (
    <div>
      <Link
        to="/rooms/$id"
        params={{ id }}
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <Icon name="chevronLeft" size={14} />
        Back to {listing.title}
      </Link>

      <div className="mb-6">
        <FlowSteps steps={APPLY_STEPS} current={1} />
      </div>

      <PageHeader
        title="Apply for a room"
        subtitle="Tell the landlord a little about yourself. There's no payment at this step."
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* What they're applying for — first on phones, pinned beside the form on desktop. */}
        <aside
          className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1"
          aria-label="Your application"
        >
          <ListingSummary listing={listing} room={selectedRoom}>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <CostLine label="Monthly rent" value={formatPrice(monthlyRent)} />
              <CostLine label="Security deposit" value={formatPrice(deposit)} />
              <CostLine label="Advance payment" value={formatPrice(advance)} />
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold text-ink">Due when you move in</dt>
                <dd className="tabular text-lg font-semibold text-ink">
                  {formatPrice(initialPayment)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-gray-ink">
              An estimate from the listing. Payment details are shared after the landlord accepts.
            </p>
          </ListingSummary>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <form id="application-form" noValidate onSubmit={handleSubmit}>
            <Card padding="p-5 sm:p-6">
              <FormSection n={1} title="Choose your room">
                {availableRooms.length > 0 ? (
                  <div
                    id="room-type-options"
                    role="radiogroup"
                    aria-label="Select room"
                    aria-invalid={Boolean(fieldErrors.room)}
                    aria-describedby={fieldErrors.room ? 'room-error' : undefined}
                    className="space-y-2.5"
                  >
                    {availableRooms.map(room => {
                      const selected = String(room.id) === roomId;
                      return (
                        <label
                          key={room.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-[border-color,background-color] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                            selected
                              ? 'border-primary bg-mint/50'
                              : 'border-border-strong bg-surface hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="room-type"
                            value={room.id}
                            checked={selected}
                            onChange={() => {
                              setRoomId(String(room.id));
                              clearFieldError('room');
                            }}
                            className="sr-only"
                          />
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? 'border-primary' : 'border-border-strong'
                              }`}
                            >
                              {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {cleanRoomType(room)}
                                {room.roomNumber ? (
                                  <span className="font-normal text-gray-ink"> · {room.roomNumber}</span>
                                ) : null}
                              </span>
                              <span className="block text-xs text-gray-ink">
                                {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                                {room.size ? ` · ${room.size} sqm` : ''}
                                {room.furnishing && room.furnishing !== 'Not specified'
                                  ? ` · ${room.furnishing}`
                                  : ''}
                                {` · ${freeSlotsLabel(room)}`}
                              </span>
                            </span>
                          </span>
                          <span className="tabular shrink-0 text-sm font-semibold text-ink">
                            {formatPrice(room.price)}
                            <span className="font-normal text-gray-ink">/mo</span>
                          </span>
                        </label>
                      );
                    })}
                    {fieldErrors.room ? (
                      <p id="room-error" role="alert" className="text-sm text-error-ink">
                        {fieldErrors.room}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-strong p-6 text-center">
                    <p className="font-display text-lg font-medium text-ink">No rooms open right now</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-ink">
                      Every room here is taken or under maintenance. You can still request a tour
                      or message the landlord about upcoming openings.
                    </p>
                    <Link
                      to="/boarder/find-a-room/$id/tour"
                      params={{ id }}
                      search={{ room: '' }}
                      className={buttonClasses({ variant: 'outline', size: 'sm', className: 'mt-4' })}
                    >
                      Request a tour instead
                    </Link>
                  </div>
                )}
              </FormSection>

              <FormSection n={2} title="When would you like to move in?">
                <Field label="Preferred move-in date (optional)" htmlFor="move-in-date">
                  <TextInput
                    id="move-in-date"
                    type="date"
                    name="move-in-date"
                    min={tomorrow()}
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                    className="sm:max-w-xs"
                  />
                </Field>
              </FormSection>

              <FormSection n={3} title="Introduce yourself">
                <Field label="Message to the landlord" htmlFor="message" error={fieldErrors.message}>
                  <TextArea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Who you are, where you study or work, and when you'd like to move in…"
                    required
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby="message-hint"
                    value={message}
                    onChange={e => {
                      setMessage(e.target.value);
                      clearFieldError('message');
                    }}
                  />
                </Field>
                <p id="message-hint" className="mt-1.5 text-xs text-gray-ink">
                  Landlords read every application. A clear introduction helps them say yes.
                </p>
              </FormSection>

              <div className="border-t border-border pt-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    id="apply-terms"
                    type="checkbox"
                    checked={agreed}
                    aria-invalid={Boolean(fieldErrors.terms)}
                    aria-describedby={fieldErrors.terms ? 'terms-error' : undefined}
                    onChange={e => {
                      setAgreed(e.target.checked);
                      clearFieldError('terms');
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm leading-relaxed text-gray-ink">
                    I agree to the{' '}
                    <Link
                      to="/legal/terms-of-service"
                      className="font-semibold text-primary underline underline-offset-[3px]"
                    >
                      Terms of Service
                    </Link>{' '}
                    and confirm that the information I&apos;ve given is accurate.
                  </span>
                </label>
                {fieldErrors.terms ? (
                  <p id="terms-error" role="alert" className="ml-8 mt-1.5 text-sm text-error-ink">
                    {fieldErrors.terms}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="mt-5">
                  <ErrorState message={error} />
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/rooms/$id"
                  params={{ id }}
                  className={buttonClasses({ variant: 'ghost' })}
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submit.isPending || availableRooms.length === 0}
                >
                  {submit.isPending ? 'Submitting…' : 'Submit application'}
                </Button>
              </div>
            </Card>
          </form>

          <Card padding="p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              <NextStep n={1} title="The landlord reviews your application">
                You can follow its status in Applications.
              </NextStep>
              <NextStep n={2} title="You get notified">
                We&apos;ll let you know as soon as the landlord accepts or declines.
              </NextStep>
              <NextStep n={3} title="You confirm your booking">
                If accepted, choose how you&apos;ll pay and confirm to secure the room.
              </NextStep>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FormSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-7 last-of-type:mb-6">
      <legend className="mb-3 flex items-center gap-2.5">
        <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-mint text-xs font-semibold text-primary-dark">
          {n}
        </span>
        <span className="font-display text-lg font-medium text-ink">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function CostLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-gray-ink">{label}</dt>
      <dd className="tabular font-medium text-ink">{value}</dd>
    </div>
  );
}

function NextStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold text-primary-dark">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-ink">{children}</p>
      </div>
    </li>
  );
}
