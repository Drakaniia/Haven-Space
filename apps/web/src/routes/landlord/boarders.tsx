import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { MessageButton } from '../../components/messages/MessageButton';
import { Button, buttonClasses } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import {
  ApproveLeaveDialog,
  type ApproveLeaveDetails,
} from '../../components/tenancy/ApproveLeaveDialog';
import { ApiRequestError } from '../../lib/api/http';
import {
  addBoarder,
  approveLeaveRequest,
  getBoarders,
  getProperties,
  getRooms,
  removeBoarder,
  updateBoarder,
} from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import { formatPaymentDate, formatPeso } from '../../lib/payments';
import type { LandlordBoarder } from '../../lib/types';

export const Route = createFileRoute('/landlord/boarders')({
  component: () => (
    <Protected role="landlord">
      <BoardersPage />
    </Protected>
  ),
});

interface BoarderForm {
  id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  room_id: string;
  move_in_date: string;
}

const EMPTY_FORM: BoarderForm = {
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  room_id: '',
  move_in_date: '',
};

type StatusFilter = 'all' | 'staying' | 'leaving';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'staying', label: 'Staying' },
  { value: 'leaving', label: 'Leaving' },
];

function fullName(row: Pick<LandlordBoarder, 'first_name' | 'last_name'>): string {
  return `${row.first_name} ${row.last_name}`.trim();
}

function initials(row: Pick<LandlordBoarder, 'first_name' | 'last_name'>): string {
  return `${row.first_name[0] ?? ''}${row.last_name[0] ?? ''}`.toUpperCase();
}

function isLeaving(row: LandlordBoarder): boolean {
  return row.leave_request_status === 'pending' || row.leave_request_status === 'approved';
}

function BoardersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [propertyId, setPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BoarderForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<LandlordBoarder | null>(null);
  const [pendingApprove, setPendingApprove] = useState<LandlordBoarder | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const propertyList = properties.data?.data.properties ?? [];
  // Open on the first property instead of an empty "pick one" screen: most
  // landlords run a single house, and the selector stays one click away.
  const effectivePropertyId = propertyId || (propertyList[0] ? String(propertyList[0].id) : '');
  const propertyIdNumber = effectivePropertyId ? Number(effectivePropertyId) : null;

  const boarders = useQuery({
    queryKey: ['boarders', propertyIdNumber],
    queryFn: () => getBoarders(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyIdNumber],
    queryFn: () => getRooms(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const availableRooms = (rooms.data?.data.rooms ?? []).filter(
    room => room.status !== 'occupied' || form.id
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        property_id: propertyIdNumber,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        room_id: Number(form.room_id),
        ...(form.move_in_date ? { move_in_date: form.move_in_date } : {}),
      };
      return form.id === null
        ? addBoarder(token!, payload)
        : updateBoarder(token!, { ...payload, id: form.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      push({
        tone: 'success',
        message: form.id === null ? 'Boarder added.' : 'Boarder updated.',
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save boarder.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => removeBoarder(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
      setPendingRemove(null);
      push({ tone: 'success', message: 'Boarder removed.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to remove boarder.'),
  });

  const approve = useMutation({
    mutationFn: (applicationId: number) => approveLeaveRequest(token!, applicationId),
    onSuccess: () => {
      // Approval frees the room and changes occupancy, so refresh rooms too.
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-calendar'] });
      setPendingApprove(null);
      setApproveError(null);
      push({ tone: 'success', message: 'Leave request approved.' });
    },
    onError: err =>
      setApproveError(
        err instanceof ApiRequestError ? err.message : 'Failed to approve leave request.'
      ),
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(boarder: LandlordBoarder) {
    setForm({
      id: boarder.id,
      first_name: boarder.first_name,
      last_name: boarder.last_name,
      email: boarder.email ?? '',
      room_id: boarder.room_id ? String(boarder.room_id) : '',
      move_in_date: boarder.move_in_date ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  const boarderList = boarders.data?.data.boarders ?? [];
  const pendingLeaveCount = boarderList.filter(
    row => row.leave_request_status === 'pending'
  ).length;
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return boarderList
      .filter(row => {
        if (statusFilter === 'staying' && isLeaving(row)) return false;
        if (statusFilter === 'leaving' && !isLeaving(row)) return false;
        if (!term) return true;
        return [fullName(row), row.email ?? '', row.room_title ?? '']
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort(
        (a, b) =>
          Number(b.leave_request_status === 'pending') -
          Number(a.leave_request_status === 'pending')
      );
  }, [boarderList, search, statusFilter]);

  const propertyName = propertyList.find(property => property.id === propertyIdNumber)?.name ?? '';
  const noProperties = properties.isSuccess && propertyList.length === 0;
  const approveDetails: ApproveLeaveDetails | null = pendingApprove
    ? {
        applicationId: pendingApprove.application_id,
        boarderName: fullName(pendingApprove),
        propertyName,
        roomName: pendingApprove.room_title ?? '',
        leaveDate: pendingApprove.intended_leave_date ?? '',
        requestedOn: pendingApprove.leave_request_date,
        reason: pendingApprove.leave_request_reason,
        outstandingAmount: pendingApprove.outstanding_amount,
      }
    : null;

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PageHeader
        title="Boarders"
        subtitle="Everyone living in your property right now, their room and rent, and anyone on their way out."
        actions={
          propertyIdNumber ? (
            <Button onClick={openAdd}>
              <Icon name="plus" size={16} />
              Add boarder
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      {noProperties ? (
        <EmptyState
          icon="buildingOffice"
          title="No properties yet"
          description="Boarders live in a property's rooms. Add a property and its rooms first, then add or invite boarders here."
          action={
            <Link to="/landlord/properties" className={buttonClasses({ variant: 'outline' })}>
              Go to properties
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,18rem)_auto]">
            <Field label="Property" htmlFor="propertyId">
              <SelectInput
                id="propertyId"
                value={effectivePropertyId}
                onChange={e => setPropertyId(e.target.value)}
              >
                {propertyList.length === 0 ? <option value="">Loading properties…</option> : null}
                {propertyList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Search" htmlFor="boarder-search">
              <TextInput
                id="boarder-search"
                type="search"
                placeholder="Name, email or room"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </Field>
            <div
              role="group"
              aria-label="Filter boarders by status"
              className="flex h-11 items-center gap-0.5 self-end rounded-xl bg-subtle p-1 sm:col-span-2 sm:w-fit lg:col-span-1"
            >
              {STATUS_FILTERS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={statusFilter === option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`inline-flex h-full flex-1 items-center justify-center rounded-lg px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
                    statusFilter === option.value
                      ? 'bg-surface text-ink shadow-card'
                      : 'text-gray-ink hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {pendingLeaveCount > 0 ? (
            <p className="mb-4 flex items-center gap-2.5 rounded-2xl border border-warning-border bg-warning-tint px-4 py-3 text-sm font-medium text-warning-ink">
              <Icon name="clock" size={16} className="shrink-0" />
              {pendingLeaveCount === 1
                ? '1 leave request is waiting for your approval. It is listed first.'
                : `${pendingLeaveCount} leave requests are waiting for your approval. They are listed first.`}
            </p>
          ) : null}

          {!propertyIdNumber || boarders.isLoading ? (
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
              {[0, 1, 2, 3].map(index => (
                <div key={index} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-4 w-24" />
                </div>
              ))}
            </div>
          ) : boarders.error ? (
            <ErrorState
              message={boarders.error.message}
              action={
                <Button variant="outline" size="sm" onClick={() => void boarders.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : boarderList.length === 0 ? (
            <EmptyState
              icon="users"
              title={`No boarders in ${propertyName || 'this property'} yet`}
              description="Add someone who already lives here, or accept an application and they will appear once the tenancy is confirmed."
              action={
                <Button onClick={openAdd}>
                  <Icon name="plus" size={16} />
                  Add boarder
                </Button>
              }
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon="search"
              title="No boarders match"
              description="Nobody here fits that search or status. Clear the search or switch back to All."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Show everyone
                </Button>
              }
            />
          ) : (
            <>
              <DataTable<LandlordBoarder>
                rows={visibleRows}
                keyFor={row => row.id}
                columns={[
                  {
                    header: 'Boarder',
                    cell: row => (
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-[11px] font-semibold text-gray-ink"
                        >
                          {initials(row)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{fullName(row)}</p>
                          <p className="truncate text-xs text-gray-ink">{row.email ?? 'No email'}</p>
                        </div>
                      </div>
                    ),
                  },
                  { header: 'Room', cell: row => row.room_title ?? '—' },
                  {
                    header: 'Rent',
                    cell: row => (
                      <span className="whitespace-nowrap font-semibold text-ink">
                        {formatPeso(row.rent)}
                      </span>
                    ),
                  },
                  {
                    header: 'Moved in',
                    cell: row => (
                      <span className="whitespace-nowrap text-gray-ink">
                        {row.move_in_date ? formatPaymentDate(row.move_in_date) : '—'}
                      </span>
                    ),
                  },
                  {
                    header: 'Status',
                    cell: row => {
                      if (row.leave_request_status === 'pending') {
                        return (
                          <div>
                            <StatusBadge status="pending" label="Leave requested" />
                            {row.intended_leave_date ? (
                              <p className="mt-1 text-xs text-gray-ink">
                                Leaves {formatPaymentDate(row.intended_leave_date)}
                              </p>
                            ) : null}
                            {/* Approval is blocked on an unsettled balance, so the
                                amount is visible before the landlord clicks Approve
                                (spec `approve-leave-request` §5.1). */}
                            {row.outstanding_amount > 0 ? (
                              <p className="mt-1 text-xs font-semibold text-warning-ink">
                                {formatPeso(row.outstanding_amount)} due
                              </p>
                            ) : null}
                          </div>
                        );
                      }
                      if (row.leave_request_status === 'approved') {
                        return (
                          <div>
                            <StatusBadge status="approved" label="Leaving approved" />
                            {row.intended_leave_date ? (
                              <p className="mt-1 text-xs text-gray-ink">
                                Leaves {formatPaymentDate(row.intended_leave_date)}
                              </p>
                            ) : null}
                            {row.approved_by_name ? (
                              <p className="mt-1 text-xs text-gray-ink">
                                Approved by {row.approved_by_name} on{' '}
                                {formatPaymentDate(row.approved_at)}
                              </p>
                            ) : null}
                          </div>
                        );
                      }
                      return <StatusBadge status="active" />;
                    },
                  },
                  {
                    header: 'Actions',
                    cell: row => {
                      const isPendingLeave = row.leave_request_status === 'pending';
                      const isApprovedLeave = row.leave_request_status === 'approved';
                      return (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isPendingLeave ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setApproveError(null);
                                setPendingApprove(row);
                              }}
                            >
                              Approve
                            </Button>
                          ) : null}
                          {/* `row.id` is the boarder's user id (the application's own id
                              is `application_id`), which is exactly what a thread needs
                              (F7 correction, R17). */}
                          <MessageButton role="landlord" counterpartId={row.id} />
                          {isApprovedLeave ? null : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                                Edit
                              </Button>
                              <Button
                                variant="dangerGhost"
                                size="sm"
                                onClick={() => setPendingRemove(row)}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
              />
              <p className="mt-3 text-sm text-gray-ink">
                Showing {visibleRows.length} of {boarderList.length}{' '}
                {boarderList.length === 1 ? 'boarder' : 'boarders'}
              </p>
            </>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        title={form.id === null ? 'Add boarder' : 'Edit boarder'}
        onClose={() => setModalOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name">
              <TextInput
                id="first_name"
                required
                autoComplete="off"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <TextInput
                id="last_name"
                required
                autoComplete="off"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Room" htmlFor="room_id">
              <SelectInput
                id="room_id"
                required
                value={form.room_id}
                onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
              >
                <option value="">Select a room</option>
                {availableRooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.room_number} — {formatPeso(room.price)} ({room.status})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Move-in date" htmlFor="move_in_date">
              <TextInput
                id="move_in_date"
                type="date"
                value={form.move_in_date}
                onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))}
              />
            </Field>
          </div>
          {form.id === null && availableRooms.length === 0 && !rooms.isLoading ? (
            <p className="text-sm text-warning-ink">
              Every room in this property is occupied. Free up or add a room before adding a
              boarder.
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : form.id === null ? 'Add boarder' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ApproveLeaveDialog
        details={approveDetails}
        busy={approve.isPending}
        error={approveError}
        onConfirm={() => {
          if (pendingApprove) approve.mutate(pendingApprove.application_id);
        }}
        onCancel={() => {
          setPendingApprove(null);
          setApproveError(null);
        }}
      />

      {/* Removing a boarder destroys tenure data, so it confirms — the pattern
          `LandlordRoomList` already uses for room deletes (R22). */}
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove boarder"
        message={
          <>
            Remove <strong>{pendingRemove ? fullName(pendingRemove) : ''}</strong> from{' '}
            {propertyName || 'this property'}? This cannot be undone.
          </>
        }
        confirmLabel="Remove boarder"
        busy={remove.isPending}
        onConfirm={() => {
          if (pendingRemove) remove.mutate(pendingRemove.id);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </RoleShell>
  );
}
