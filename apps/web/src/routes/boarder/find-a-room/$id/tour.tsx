import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Protected } from '../../../../components/auth/Protected';
import { RoleShell } from '../../../../components/layout/RoleShell';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../../components/ui/Field';
import { Icon } from '../../../../components/ui/Icon';
import { Spinner } from '../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../lib/api/http';
import { createApplication } from '../../../../lib/api/boarder';
import { getRoomDetail } from '../../../../lib/api/public';
import { useAuth } from '../../../../lib/auth-context';
import { BOARDER_NAV } from '../../../../lib/nav';

const TIME_SLOTS = [
  'Morning (9:00 AM – 12:00 PM)',
  'Afternoon (1:00 PM – 4:00 PM)',
  'Late Afternoon (4:00 PM – 6:00 PM)',
  'Evening (6:00 PM – 8:00 PM)',
];

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

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
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(initialRoom);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
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
    onSuccess: () => setSent(true),
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send tour request.'),
  });

  const listing = detail.data?.data;
  const availableRooms = useMemo(
    () => (listing?.rooms ?? []).filter(room => (room.status ?? '').toLowerCase() !== 'occupied'),
    [listing]
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError('Choose a preferred date for your tour.');
      return;
    }
    if (!timeSlot) {
      setError('Choose a preferred time slot.');
      return;
    }
    submit.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {detail.isLoading ? (
        <Spinner />
      ) : detail.error ? (
        <ErrorState message={detail.error.message} />
      ) : !listing ? null : sent ? (
        <div className="mx-auto max-w-lg py-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint">
            <Icon name="calendarDays" size={32} className="text-primary" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">Tour request sent!</h1>
          <p className="mt-2 text-gray-ink">
            Your tour request for <strong className="text-ink">{listing.title}</strong> has been
            sent to {listing.landlord.name}. They&apos;ll confirm the schedule shortly, and
            you&apos;ll be notified of their response.
          </p>
          <div className="mt-6 rounded-2xl bg-white p-5 text-left shadow-card">
            <h3 className="text-sm font-semibold text-ink">Your request</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-ink">Preferred date</dt>
                <dd className="font-medium text-ink">{date}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-ink">Preferred time</dt>
                <dd className="font-medium text-ink">{timeSlot}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/boarder/applications"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              View your applications
            </Link>
            <Link
              to="/boarder/find-a-room/$id"
              params={{ id }}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary px-6 py-2.5 text-sm font-semibold text-primary hover:bg-mint"
            >
              Back to property
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <Link
            to="/boarder/find-a-room/$id"
            params={{ id }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Icon name="chevronLeft" size={14} />
            Back to {listing.title}
          </Link>

          <h1 className="text-2xl font-bold text-ink">Schedule a Tour</h1>
          <p className="mt-1 text-gray-ink">
            Pick a time that works for you and {listing.landlord.name} will confirm your visit.
          </p>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card sm:flex-row">
            <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-mint/40 sm:h-[120px] sm:w-[160px]">
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
              <h2 className="truncate text-lg font-bold text-ink">{listing.title}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
                <Icon name="location" size={15} className="shrink-0" />
                <span className="truncate">
                  {[listing.address, listing.city, listing.province].filter(Boolean).join(', ')}
                </span>
              </p>
              <p className="mt-2 text-sm font-bold text-primary">
                {`₱${listing.price.toLocaleString()}`}
                <span className="font-normal text-gray-ink">/month</span>
              </p>
            </div>
          </div>

          <form className="mt-5 rounded-2xl bg-white p-6 shadow-card" onSubmit={handleSubmit}>
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
                    {room.roomNumber || room.roomType} — ₱{room.price.toLocaleString()}/mo
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Preferred date" htmlFor="tour-date">
              <TextInput
                id="tour-date"
                type="date"
                name="tour-date"
                min={tomorrow()}
                required
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </Field>

            <Field label="Preferred time" htmlFor="tour-time">
              <SelectInput
                id="tour-time"
                name="tour-time"
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
              >
                <option value="">Select a time slot</option>
                {TIME_SLOTS.map(slot => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </SelectInput>
            </Field>

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

            {error ? (
              <div className="mb-4">
                <ErrorState message={error} />
              </div>
            ) : null}

            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Sending request…' : 'Request Tour'}
            </Button>
            <p className="mt-3 text-xs text-gray-ink">
              Your request is sent to the landlord and will appear in your applications.
              They&apos;ll confirm the schedule once they respond.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
