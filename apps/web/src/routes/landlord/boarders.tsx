import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { MessageButton } from '../../components/messages/MessageButton';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
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
import { formatPaymentDate } from '../../lib/payments';
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

function BoardersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [propertyId, setPropertyId] = useState('');
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

  const propertyIdNumber = propertyId ? Number(propertyId) : null;

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
  const propertyName =
    properties.data?.data.properties.find(property => property.id === propertyIdNumber)?.name ?? '';
  const approveDetails: ApproveLeaveDetails | null = pendingApprove
    ? {
        applicationId: pendingApprove.application_id,
        boarderName: `${pendingApprove.first_name} ${pendingApprove.last_name}`.trim(),
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
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <PageHeader icon="users" title="Boarders" />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="w-72">
          <Field label="Property" htmlFor="propertyId">
            <SelectInput
              id="propertyId"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
            >
              <option value="">Select a property</option>
              {properties.data?.data.properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        {propertyIdNumber ? <Button onClick={openAdd}>+ Add boarder</Button> : null}
      </div>

      {!propertyIdNumber ? (
        <EmptyState
          icon="buildingOffice"
          title="Select a property"
          description="Choose a property to see its boarders."
        />
      ) : boarders.isLoading ? (
        <Spinner />
      ) : boarders.error ? (
        <ErrorState message={boarders.error.message} />
      ) : boarderList.length === 0 ? (
        <EmptyState
          icon="users"
          title="No boarders"
          description="Add your first boarder to get started."
        />
      ) : (
        <DataTable<LandlordBoarder>
          rows={boarderList}
          keyFor={row => row.id}
          columns={[
            {
              header: 'Name',
              cell: row => `${row.first_name} ${row.last_name}`,
            },
            { header: 'Email', cell: row => row.email ?? '—' },
            { header: 'Room', cell: row => row.room_title ?? '—' },
            {
              header: 'Rent',
              cell: row => `₱${row.rent.toLocaleString()}`,
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
                        <p className="mt-1 text-xs font-medium text-warning-ink">
                          ₱{row.outstanding_amount.toLocaleString()} due
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
                          Approved by {row.approved_by_name} on {formatPaymentDate(row.approved_at)}
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
                  <div className="flex flex-wrap items-center gap-2">
                    {isPendingLeave ? (
                      <Button
                        variant="outline"
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
      )}

      <Modal
        open={modalOpen}
        title={form.id === null ? 'Add boarder' : 'Edit boarder'}
        onClose={() => setModalOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="first_name">
              <TextInput
                id="first_name"
                required
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <TextInput
                id="last_name"
                required
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
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </Field>
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
                  {room.room_number} — ₱{room.price.toLocaleString()} ({room.status})
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
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : form.id === null ? 'Add boarder' : 'Save changes'}
          </Button>
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
            Remove{' '}
            <strong>
              {`${pendingRemove?.first_name ?? ''} ${pendingRemove?.last_name ?? ''}`.trim()}
            </strong>
            ? This cannot be undone.
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
