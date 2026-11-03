import type { ApplicationSummary } from '../../lib/types';
import type { TimelineStep } from './Timeline';

/** Statuses after which an application can no longer move forward. */
const CLOSED = new Set(['rejected', 'cancelled', 'withdrawn']);
/** Statuses for a booking that became (and may have ended as) a tenancy. */
const ENDED = new Set(['ended', 'left_early']);

export function formatApplicationDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * The application's journey as four honest steps: applied → landlord review →
 * confirm booking → move in. Only states the API actually reports are used;
 * nothing is inferred beyond the current status.
 */
export function applicationTimeline(app: ApplicationSummary): TimelineStep[] {
  const status = String(app.status);
  const applied: TimelineStep = {
    key: 'applied',
    title: 'Application sent',
    description: `Sent ${formatApplicationDate(app.created_at)}`,
    state: 'done',
  };

  if (CLOSED.has(status)) {
    return [
      applied,
      {
        key: 'review',
        title: status === 'rejected' ? 'Not accepted' : 'Application withdrawn',
        description:
          status === 'rejected'
            ? 'The landlord passed on this one. Other rooms are still open to you.'
            : 'This application is closed and no longer reserves the room.',
        state: 'stopped',
      },
    ];
  }

  const reviewDone = status !== 'pending';
  const confirmed = status === 'confirmed' || ENDED.has(status);

  return [
    applied,
    {
      key: 'review',
      title: reviewDone ? 'Accepted by the landlord' : 'Landlord is reviewing',
      description: reviewDone
        ? 'Good news: the room is offered to you.'
        : "You'll be notified as soon as the landlord responds.",
      state: reviewDone ? 'done' : 'current',
    },
    {
      key: 'confirm',
      title: confirmed ? 'Booking confirmed' : 'Confirm your booking',
      description: confirmed
        ? `Confirmed ${formatApplicationDate(app.confirmed_at)}`
        : 'Choose how you will pay to hold the room.',
      state: confirmed ? 'done' : status === 'accepted' ? 'current' : 'upcoming',
    },
    {
      key: 'move-in',
      title: ENDED.has(status) ? 'Tenancy ended' : 'Move in',
      description: ENDED.has(status)
        ? 'This stay is complete.'
        : confirmed
        ? 'Your tenancy, payments and house rules are now in your dashboard.'
        : 'Your tenancy starts once the booking is confirmed.',
      state: ENDED.has(status) ? 'done' : confirmed ? 'current' : 'upcoming',
    },
  ];
}

export interface NextStep {
  tone: 'action' | 'waiting' | 'done' | 'explore';
  title: string;
  body: string;
}

/** The one thing a boarder should do next, across all their applications. */
export function overallNextStep(apps: ApplicationSummary[]): {
  step: NextStep;
  focus: ApplicationSummary | null;
} {
  const accepted = apps.find(app => app.status === 'accepted');
  if (accepted) {
    return {
      focus: accepted,
      step: {
        tone: 'action',
        title: 'Confirm your booking',
        body: `${accepted.property_title ?? 'A landlord'} accepted your application. Confirm the booking to hold the room before someone else does.`,
      },
    };
  }

  const confirmed = apps.find(app => app.status === 'confirmed');
  if (confirmed) {
    return {
      focus: confirmed,
      step: {
        tone: 'done',
        title: 'Your booking is confirmed',
        body: `Welcome to ${confirmed.property_title ?? 'your new place'}. Your tenancy, rent and house rules live in your dashboard.`,
      },
    };
  }

  const pending = apps.filter(app => app.status === 'pending');
  if (pending.length > 0) {
    return {
      focus: pending[0],
      step: {
        tone: 'waiting',
        title: pending.length === 1 ? 'Waiting on the landlord' : 'Waiting on the landlords',
        body: `You have ${pending.length} application${
          pending.length === 1 ? '' : 's'
        } under review. You'll be notified when a landlord responds, and you can message them in the meantime.`,
      },
    };
  }

  return {
    focus: null,
    step: {
      tone: 'explore',
      title: apps.length === 0 ? 'Find your first room' : 'Keep looking',
      body:
        apps.length === 0
          ? 'Browse rooms near your school or work, then apply in a few minutes. Your applications will be tracked here.'
          : 'None of your applications are active right now. There are more rooms to explore.',
    },
  };
}
