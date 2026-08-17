import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Protected } from '../../../../components/auth/Protected';
import { RoleShell } from '../../../../components/layout/RoleShell';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../../../components/ui/Field';
import { Icon } from '../../../../components/ui/Icon';
import { Spinner } from '../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../lib/api/http';
import { createApplication } from '../../../../lib/api/boarder';
import { getRoomDetail } from '../../../../lib/api/public';
import { useAuth } from '../../../../lib/auth-context';
import { BOARDER_NAV } from '../../../../lib/nav';
import type { RoomDetail } from '../../../../lib/types';

function cleanRoomType(room: RoomDetail): string {
  const raw = room.roomType && room.roomType !== 'N/A' ? room.roomType : room.roomNumber || 'Room';
  return (raw.charAt(0).toUpperCase() + raw.slice(1)).replace(/-\d+$/, '');
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `₱${value.toLocaleString()}`;
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

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
  const [roomId, setRoomId] = useState(initialRoom);
  const [moveInDate, setMoveInDate] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  const submit = useMutation({
    mutationFn: () => {
      const room = detail.data!.data.rooms.find(r => String(r.id) === roomId);
      const dateLine = moveInDate ? `Preferred move-in date: ${moveInDate}\n\n` : '';
      const fullMessage = `${dateLine}${message.trim()}`;
      return createApplication(token!, {
        room_id: Number(roomId),
        landlord_id: detail.data!.data.landlord.id,
        message: fullMessage,
      });
    },
    onSuccess: () => void navigate({ to: '/boarder/application-submitted' }),
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit application.'),
  });

  const listing = detail.data?.data;
  const availableRooms = useMemo(
    () => (listing?.rooms ?? []).filter(room => (room.status ?? '').toLowerCase() !== 'occupied'),
    [listing]
  );
  const selectedRoom = availableRooms.find(room => String(room.id) === roomId);

  const monthlyRent = selectedRoom?.price ?? listing?.price ?? 0;
  const deposit = selectedRoom?.deposit ?? monthlyRent;
  const advance = monthlyRent;
  const initialPayment = monthlyRent + deposit + advance;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roomId) {
      setError('Select a room to apply for.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }
    submit.mutate();
  }

  return (
    <div className="mx-auto max-w-6xl">
      {detail.isLoading ? (
        <Spinner />
      ) : detail.error ? (
        <ErrorState message={detail.error.message} />
      ) : !listing ? null : (
        <>
          {/* Progress steps */}
          <div className="mx-auto mb-10 flex max-w-xl items-center justify-center">
            <ProgressStep state="completed" label="Property Selected" />
            <ProgressLine active />
            <ProgressStep state="active" label="Review Details" />
            <ProgressLine />
            <ProgressStep state="pending" label="Submit" />
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Left: application details */}
            <div className="flex min-w-0 flex-col gap-5">
              <div className="text-center">
                <h1 className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                  Confirm Your Application
                </h1>
                <p className="mt-1.5 text-gray-ink">
                  Review your application details before submitting to the landlord
                </p>
              </div>

              {/* Property summary */}
              <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card sm:flex-row">
                <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-mint/40 sm:h-[140px] sm:w-[180px]">
                  <img
                    src={listing.coverImage || '/assets/images/placeholder-room.svg'}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                    onError={e => {
                      e.currentTarget.src = '/assets/images/placeholder-room.svg';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {listing.badges.some(badge => badge.toLowerCase() === 'verified') ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      <Icon name="shieldCheck" size={12} />
                      Verified
                    </span>
                  ) : null}
                  <h2 className="mt-1.5 truncate text-xl font-bold text-ink">{listing.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
                    <Icon name="location" size={15} className="shrink-0" />
                    <span className="truncate">
                      {[listing.address, listing.city, listing.province].filter(Boolean).join(', ')}
                    </span>
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className="text-amber-400">★</span>
                    {listing.rating > 0 ? listing.rating.toFixed(1) : 'New'}
                    {listing.reviews > 0 ? (
                      <span className="font-normal text-gray-ink">({listing.reviews})</span>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* Application details */}
              <form
                id="application-form"
                className="rounded-2xl bg-white p-6 shadow-card"
                onSubmit={handleSubmit}
              >
                <h3 className="mb-5 text-lg font-bold text-ink">Application Details</h3>

                <Field label="Select Room" htmlFor="room-type-options">
                  {availableRooms.length > 0 ? (
                    <div className="space-y-2.5" role="radiogroup" aria-label="Select room">
                      {availableRooms.map(room => {
                        const selected = String(room.id) === roomId;
                        return (
                          <label
                            key={room.id}
                            className={`block cursor-pointer rounded-xl border-2 p-4 transition ${
                              selected
                                ? 'border-primary bg-mint/40 shadow-[0_0_0_4px_rgba(74,124,35,0.1)]'
                                : 'border-gray-200 bg-cream/40 hover:border-primary/60 hover:bg-mint/20'
                            }`}
                          >
                            <input
                              type="radio"
                              name="room-type"
                              value={room.id}
                              checked={selected}
                              onChange={() => {
                                setRoomId(String(room.id));
                                setError(null);
                              }}
                              className="sr-only"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
                                  <Icon name={room.capacity > 1 ? 'users' : 'user'} size={20} />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-ink">
                                    {cleanRoomType(room)}
                                  </p>
                                  <p className="text-xs text-gray-ink">
                                    {room.capacity} {room.capacity === 1 ? 'person' : 'persons'}
                                    {room.size ? ` · ${room.size} sqm` : ''}
                                    {room.furnishing && room.furnishing !== 'Not specified'
                                      ? ` · ${room.furnishing}`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 text-base font-bold text-primary">
                                {formatPrice(room.price)}/mo
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
                      <p className="text-3xl">🚫</p>
                      <h4 className="mt-2 text-lg font-bold text-ink">No rooms available</h4>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-ink">
                        All rooms in this property are currently occupied or unavailable. Contact
                        the landlord for alternatives.
                      </p>
                    </div>
                  )}
                </Field>

                <Field label="Preferred Move-in Date" htmlFor="move-in-date">
                  <TextInput
                    id="move-in-date"
                    type="date"
                    name="move-in-date"
                    min={tomorrow()}
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                  />
                </Field>

                <Field label="Message to Landlord" htmlFor="message">
                  <TextArea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Introduce yourself and explain why you're interested in this property..."
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-gray-ink">
                    This helps landlords understand your needs better.
                  </p>
                </Field>

                {/* Terms */}
                <label className="mt-4 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => {
                      setAgreed(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                  />
                  <span className="text-sm leading-relaxed text-gray-ink">
                    I agree to the{' '}
                    <Link
                      to="/legal/terms-of-service"
                      className="font-semibold text-primary hover:underline"
                    >
                      Terms of Service
                    </Link>{' '}
                    and confirm that all information provided is accurate.
                  </span>
                </label>

                {error ? (
                  <div className="mt-4">
                    <ErrorState message={error} />
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/boarder/find-a-room/$id"
                    params={{ id }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary px-5 py-3 text-sm font-semibold text-primary transition hover:bg-mint"
                  >
                    <Icon name="chevronLeft" size={16} />
                    Back to Property
                  </Link>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submit.isPending || availableRooms.length === 0}
                  >
                    {submit.isPending ? 'Submitting…' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right: summary sidebar */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
              {/* Cost summary */}
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <h3 className="mb-4 text-lg font-bold text-ink">Cost Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-ink">Monthly Rent</span>
                    <span className="font-semibold text-ink">{formatPrice(monthlyRent)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-ink">Security Deposit</span>
                    <span className="font-semibold text-ink">{formatPrice(deposit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-ink">Advance Payment</span>
                    <span className="font-semibold text-ink">{formatPrice(advance)}</span>
                  </div>
                  <div className="my-2 h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Initial Payment</span>
                    <span className="text-2xl font-extrabold text-primary">
                      {formatPrice(initialPayment)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-mint/50 p-3 text-xs leading-relaxed text-gray-ink">
                  <Icon name="sparkles" size={14} className="mt-0.5 shrink-0 text-primary" />
                  <span>Payment details will be provided after approval.</span>
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
                  <Icon name="lightbulb" size={18} className="text-primary" />
                  What Happens Next?
                </h3>
                <ol className="space-y-4">
                  <NextStep n={1} title="Application Review">
                    The landlord will review your application within 1-3 business days.
                  </NextStep>
                  <NextStep n={2} title="Get Notified">
                    You&apos;ll receive a notification once the landlord responds.
                  </NextStep>
                  <NextStep n={3} title="Schedule Visit">
                    If approved, schedule a property visit and finalize details.
                  </NextStep>
                </ol>
              </div>

              {/* Tips */}
              <div className="rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-primary/10 to-primary-light/10 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-primary">
                  <Icon name="sparkles" size={16} />
                  Application Tips
                </h3>
                <ul className="space-y-2.5 text-sm text-ink">
                  {[
                    'Complete your profile to increase approval chances',
                    'Be honest and clear in your message',
                    'Respond promptly to landlord inquiries',
                    'Prepare required documents in advance',
                  ].map(tip => (
                    <li key={tip} className="flex items-start gap-2">
                      <span className="mt-0.5 font-bold text-primary">✓</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressStep({
  state,
  label,
}: {
  state: 'completed' | 'active' | 'pending';
  label: string;
}) {
  const circle =
    state === 'completed'
      ? 'bg-primary border-primary text-white'
      : state === 'active'
      ? 'border-primary text-primary bg-mint/40'
      : 'border-gray-300 text-gray-ink bg-white';
  const labelClass = state === 'pending' ? 'text-gray-ink' : 'text-primary';
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full border-[3px] text-lg font-bold ${circle}`}
      >
        {state === 'completed' ? <Icon name="check" size={20} /> : state === 'active' ? '2' : '3'}
      </span>
      <span className={`whitespace-nowrap text-[13px] font-semibold ${labelClass}`}>{label}</span>
    </div>
  );
}

function ProgressLine({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`mb-7 h-[3px] w-16 sm:w-24 ${active ? 'bg-primary' : 'bg-gray-200'}`}
      aria-hidden="true"
    />
  );
}

function NextStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-gray-ink">{children}</p>
      </div>
    </li>
  );
}
