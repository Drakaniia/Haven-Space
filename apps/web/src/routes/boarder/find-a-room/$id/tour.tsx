import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { FlowSkeleton, FlowSteps, ListingSummary } from '../../../../components/rooms/BookingFlow';
import { cleanRoomType, formatPrice, isRoomAvailable } from '../../../../components/rooms/detail-helpers';
import { Button, buttonClasses } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../../components/ui/Field';
import { Icon } from '../../../../components/ui/Icon';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { ApiRequestError } from '../../../../lib/api/http';
import { createApplication } from '../../../../lib/api/boarder';
import { getRoomDetail } from '../../../../lib/api/public';
import { useAuth } from '../../../../lib/auth-context';
import { BOARDER_STATUS_KEY } from '../../../../lib/use-boarder-nav';

const TIME_SLOTS = [
  'Morning (9:00 AM – 12:00 PM)',
  'Afternoon (1:00 PM – 4:00 PM)',
  'Late Afternoon (4:00 PM – 6:00 PM)',
  'Evening (6:00 PM – 8:00 PM)',
];

const TOUR_STEPS = [{ label: 'Choose a place' }, { label: 'Pick a time' }, { label: 'Landlord confirms' }];

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** `2026-11-12` → `Thursday, 12 November 2026`, falling back to the raw value. */
function readableDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type TourErrors = { date?: string; time?: string };

export const Route = createFileRoute('/boarder/find-a-room/$id/tour')({
  validateSearch: (search: Record<string, unknown>) => ({
    room:
      typeof search.room === 'number'
        ? String(search.room)
        : typeof search.room === 'string'
        ? search.room
        : '',
  }),
  component: TourPage,
});

function TourPage() {
  const { id } = Route.useParams();
  const { room: initialRoom } = Route.useSearch();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [roomId, setRoomId] = useState(initialRoom);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TourErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  const submit = useMutation({
    mutationFn: () => {
      const listing = detail.data!.data;
      const room = listing.rooms.find(r => String(r.id) === roomId);
      const roomLine = room
        ? `Room: ${room.roomNumber || room.roomType} (${room.roomType})`
        : 'Whole property';
      const message = [
        `Tour request for ${listing.title}`,
        roomLine,
        `Preferred date: ${date}`,
        `Preferred time: ${timeSlot}`,
        notes.trim() ? `\n${notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      return createApplication(token!, {
        room_id: Number(roomId),
        landlord_id: listing.landlord.id,
        message,
      });
    },
    onSuccess: () => {
      // A tour request creates an application — refresh the live status too (R13).
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setSent(true);
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send tour request.'),
  });

  const listing = detail.data?.data;
  // The same availability rule as the listing page, so a room chosen there is always offered here.
  const availableRooms = useMemo(() => (listing?.rooms ?? []).filter(isRoomAvailable), [listing]);
  const selectedRoom = availableRooms.find(room => String(room.id) === roomId) ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const next: TourErrors = {};
    if (!date) next.date = 'Choose a preferred date for your tour.';
    if (!timeSlot) next.time = 'Choose a preferred time slot.';
    setFieldErrors(next);
    if (next.date || next.time) {
      document.getElementById(next.date ? 'tour-date' : 'tour-time')?.focus();
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

  if (sent) {
    return (
      <div className="mx-auto max-w-xl py-4">
        <Card padding="p-6 sm:p-8">
          <div className="rise-in text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-primary">
              <Icon name="calendarDays" size={28} />
            </span>
            <h1 className="mt-5 font-display text-[1.875rem] font-medium leading-tight tracking-[-0.02em] text-ink">
              Tour request sent
            </h1>
            <p className="mx-auto mt-2 max-w-md text-gray-ink">
              {listing.landlord.name || 'The landlord'} will confirm a time for your visit to{' '}
              <strong className="font-semibold text-ink">{listing.title}</strong>. You&apos;ll get a
              notification when they reply.
            </p>
          </div>
          <dl className="mt-6 divide-y divide-border rounded-xl border border-border text-sm">
            <SummaryLine label="Room" value={selectedRoom ? cleanRoomType(selectedRoom) + (selectedRoom.roomNumber ? ` · ${selectedRoom.roomNumber}` : '') : 'Whole property'} />
            <SummaryLine label="Preferred date" value={readableDate(date)} />
            <SummaryLine label="Preferred time" value={timeSlot} />
          </dl>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link to="/boarder/applications" className={buttonClasses()}>
              Track it in Applications
            </Link>
            <Link to="/rooms/$id" params={{ id }} className={buttonClasses({ variant: 'outline' })}>
              Back to the listing
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
        <FlowSteps steps={TOUR_STEPS} current={1} />
      </div>

      <PageHeader
        title="Request a tour"
        subtitle="Pick a day and time that suits you. The landlord confirms the visit before it's booked."
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" aria-label="You're visiting">
          <ListingSummary listing={listing} room={selectedRoom} />
        </aside>

        <form
          noValidate
          className="lg:col-start-1 lg:row-start-1"
          onSubmit={handleSubmit}
          aria-describedby="tour-note"
        >
          <Card padding="p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <Field label="Room to visit" htmlFor="tour-room">
                <SelectInput
                  id="tour-room"
                  name="tour-room"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                >
                  <option value="">Whole property (no specific room)</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {cleanRoomType(room)}
                      {room.roomNumber ? ` · ${room.roomNumber}` : ''} — {formatPrice(room.price)}/mo
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Preferred date" htmlFor="tour-date" error={fieldErrors.date}>
                  <TextInput
                    id="tour-date"
                    type="date"
                    name="tour-date"
                    min={tomorrow()}
                    required
                    aria-invalid={Boolean(fieldErrors.date)}
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      if (fieldErrors.date) setFieldErrors(f => ({ ...f, date: undefined }));
                    }}
                  />
                </Field>

                <Field label="Preferred time" htmlFor="tour-time" error={fieldErrors.time}>
                  <SelectInput
                    id="tour-time"
                    name="tour-time"
                    aria-invalid={Boolean(fieldErrors.time)}
                    value={timeSlot}
                    onChange={e => {
                      setTimeSlot(e.target.value);
                      if (fieldErrors.time) setFieldErrors(f => ({ ...f, time: undefined }));
                    }}
                  >
                    <option value="">Select a time slot</option>
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              <Field label="Notes for the landlord (optional)" htmlFor="tour-notes">
                <TextArea
                  id="tour-notes"
                  name="tour-notes"
                  rows={3}
                  placeholder="Anything the landlord should know before your visit…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Field>

              {error ? <ErrorState message={error} /> : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p id="tour-note" className="text-sm text-gray-ink">
                  Your request appears in Applications while you wait.
                </p>
                <Button type="submit" size="lg" disabled={submit.isPending}>
                  {submit.isPending ? 'Sending request…' : 'Send tour request'}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-gray-ink">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
