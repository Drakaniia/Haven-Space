import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordAnnouncement } from '../../lib/types';

export const Route = createFileRoute('/landlord/announcements')({
  component: () => (
    <Protected role="landlord">
      <AnnouncementsPage />
    </Protected>
  ),
});

interface AnnouncementForm {
  id: number | null;
  title: string;
  description: string;
  category: string;
  priority: string;
}

const EMPTY_FORM: AnnouncementForm = {
  id: null,
  title: '',
  description: '',
  category: 'general',
  priority: 'medium',
};

function AnnouncementsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LandlordAnnouncement | null>(null);

  const announcements = useQuery({
    queryKey: ['landlord-announcements'],
    queryFn: () => getAnnouncements(token!),
    enabled: Boolean(token),
  });

  const save = useMutation({
    mutationFn: () =>
      form.id === null
        ? createAnnouncement(token!, {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            priority: form.priority,
          })
        : updateAnnouncement(token!, form.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            priority: form.priority,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-announcements'] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      push({
        tone: 'success',
        message: form.id === null ? 'Announcement created.' : 'Announcement updated.',
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save announcement.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-announcements'] });
      setPendingDelete(null);
      push({ tone: 'success', message: 'Announcement deleted.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete announcement.'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(announcement: LandlordAnnouncement) {
    setForm({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      category: announcement.category,
      priority: announcement.priority,
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  const list = announcements.data?.data.announcements ?? [];

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <PageHeader
        icon="announcement"
        title="Announcements"
        actions={<Button onClick={openCreate}>+ New announcement</Button>}
      />

      {announcements.isLoading ? (
        <Spinner />
      ) : announcements.error ? (
        <ErrorState message={announcements.error.message} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="announcement"
          title="No announcements"
          description="Create an announcement to reach your boarders."
          action={<Button onClick={openCreate}>+ New announcement</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {list.map(announcement => (
            <Card key={announcement.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold tracking-tight text-ink">{announcement.title}</h2>
                    {announcement.priority === 'high' ? (
                      <StatusBadge status="high" label="High priority" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-ink">
                    {announcement.category} · {announcement.priority} priority ·{' '}
                    {announcement.target_property}
                  </p>
                  <p className="mt-2 text-sm">{announcement.description}</p>
                  <p className="mt-2 text-xs text-gray-ink">
                    {announcement.view_count} view(s) ·{' '}
                    {announcement.publish_date
                      ? new Date(announcement.publish_date).toLocaleDateString()
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(announcement)}>
                    Edit
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    onClick={() => setPendingDelete(announcement)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id === null ? 'New announcement' : 'Edit announcement'}
        onClose={() => setModalOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Title" htmlFor="title">
            <TextInput
              id="title"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Message" htmlFor="description">
            <TextArea
              id="description"
              rows={4}
              required
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="category">
              <SelectInput
                id="category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="urgent">Urgent</option>
                <option value="reminder">Reminder</option>
                <option value="event">Event</option>
              </SelectInput>
            </Field>
            <Field label="Priority" htmlFor="priority">
              <SelectInput
                id="priority"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </SelectInput>
            </Field>
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : form.id === null ? 'Create' : 'Save changes'}
          </Button>
        </form>
      </Modal>

      {/* Deleting an announcement is irreversible, so it confirms (R22). */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete announcement"
        message={
          <>
            Delete <strong>{pendingDelete?.title}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Delete announcement"
        busy={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </RoleShell>
  );
}
