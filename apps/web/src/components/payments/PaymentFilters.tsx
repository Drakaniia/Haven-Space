import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { TRACKER_STATUS_LEGEND } from '../../lib/payments';

export interface TrackerFilterState {
  propertyId: string;
  month: string;
  roomId: string;
  status: string;
  dueFrom: string;
  dueTo: string;
  overdue: boolean;
  needsReview: boolean;
  search: string;
}

export function emptyFilters(month: string): TrackerFilterState {
  return {
    propertyId: '',
    month,
    roomId: '',
    status: '',
    dueFrom: '',
    dueTo: '',
    overdue: false,
    needsReview: false,
    search: '',
  };
}

/**
 * Search and filters (spec `payments-tracker-redesign` D19): property, room/bed,
 * status, due date, overdue, needs-review and free search — all of it shareable
 * through the URL because the page keeps this state in the query string.
 */
export function PaymentFilters({
  properties,
  value,
  onChange,
  onClear,
}: {
  properties: Array<{ id: number; name: string }>;
  value: TrackerFilterState;
  onChange: (next: TrackerFilterState) => void;
  onClear: () => void;
}) {
  const patch = (changes: Partial<TrackerFilterState>) => onChange({ ...value, ...changes });

  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Property" htmlFor="tracker-property">
          <SelectInput
            id="tracker-property"
            value={value.propertyId}
            onChange={event => patch({ propertyId: event.target.value })}
          >
            {properties.length === 0 ? <option value="">No properties yet</option> : null}
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Month" htmlFor="tracker-month">
          <TextInput
            id="tracker-month"
            type="month"
            value={value.month}
            onChange={event => patch({ month: event.target.value })}
          />
        </Field>

        <Field label="Room or bed" htmlFor="tracker-room">
          <TextInput
            id="tracker-room"
            inputMode="numeric"
            placeholder="Room id"
            value={value.roomId}
            onChange={event => patch({ roomId: event.target.value })}
          />
        </Field>

        <Field label="Payment status" htmlFor="tracker-status">
          <SelectInput
            id="tracker-status"
            value={value.status}
            onChange={event => patch({ status: event.target.value })}
          >
            <option value="">Any status</option>
            {TRACKER_STATUS_LEGEND.map(entry => (
              <option key={entry.status} value={entry.status}>
                {entry.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Due from" htmlFor="tracker-due-from">
          <TextInput
            id="tracker-due-from"
            type="date"
            value={value.dueFrom}
            onChange={event => patch({ dueFrom: event.target.value })}
          />
        </Field>

        <Field label="Due to" htmlFor="tracker-due-to">
          <TextInput
            id="tracker-due-to"
            type="date"
            value={value.dueTo}
            onChange={event => patch({ dueTo: event.target.value })}
          />
        </Field>

        <Field label="Search" htmlFor="tracker-search">
          <TextInput
            id="tracker-search"
            placeholder="Boarder, room or reference"
            value={value.search}
            onChange={event => patch({ search: event.target.value })}
          />
        </Field>

        <div className="flex flex-col justify-end gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={value.overdue}
              onChange={event => patch({ overdue: event.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Overdue only
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={value.needsReview}
              onChange={event => patch({ needsReview: event.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Needs review
          </label>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      </div>
    </Card>
  );
}
