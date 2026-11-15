import { FormSection } from './FormSection';
import { Field, TextArea, TextInput } from '../ui/Field';
import { isPhilippinePhone } from '../../lib/validation';

export interface BoardingHouseDetails {
  businessName: string;
  businessDescription: string;
  city: string;
  province: string;
  phoneNumber: string;
}

export const EMPTY_BOARDING_HOUSE: BoardingHouseDetails = {
  businessName: '',
  businessDescription: '',
  city: '',
  province: '',
  phoneNumber: '',
};

export const PHONE_ERROR =
  'Enter a valid Philippine mobile number (e.g. 0917 123 4567 or +63 917 123 4567)';

/** The contact number is optional, but must be a PH mobile number when given. */
export function boardingHousePhoneError(details: BoardingHouseDetails): string | null {
  const phone = details.phoneNumber.trim();

  return phone && !isPhilippinePhone(phone) ? PHONE_ERROR : null;
}

/** Trimmed payload with empty optional fields dropped. */
export function boardingHousePayload(details: BoardingHouseDetails) {
  const value = (text: string) => text.trim() || undefined;

  return {
    businessName: value(details.businessName),
    businessDescription: value(details.businessDescription),
    city: value(details.city),
    province: value(details.province),
    phoneNumber: value(details.phoneNumber),
  };
}

export const LANDLORD_SIGNUP_NOTE =
  'Your account is created right away. Verification can be completed later from your dashboard.';

/**
 * The optional "Your boarding house" section, shared by the email/password and
 * Google landlord sign-ups so both collect exactly the same information.
 */
export function BoardingHouseFields({
  value,
  onChange,
  phoneError,
  onPhoneBlur,
}: {
  value: BoardingHouseDetails;
  onChange: (next: BoardingHouseDetails) => void;
  phoneError?: string | null;
  onPhoneBlur?: () => void;
}) {
  const set = (key: keyof BoardingHouseDetails, text: string) =>
    onChange({ ...value, [key]: text });

  return (
    <FormSection
      title="Boarding house information (optional)"
      description="Boarders see this on your listings. You can add or change it later."
    >
      <Field label="Business / property name" htmlFor="businessName">
        <TextInput
          id="businessName"
          name="businessName"
          placeholder="e.g. Haven Dormitory"
          autoComplete="organization"
          value={value.businessName}
          onChange={e => set('businessName', e.target.value)}
        />
      </Field>

      <div>
        <Field label="Brief description" htmlFor="businessDescription">
          <TextArea
            id="businessDescription"
            name="businessDescription"
            placeholder="What makes your place a good home?"
            rows={3}
            maxLength={500}
            aria-describedby="businessDescription-count"
            value={value.businessDescription}
            onChange={e => set('businessDescription', e.target.value)}
          />
        </Field>
        <p id="businessDescription-count" className="tabular mt-1.5 text-right text-xs text-muted">
          {value.businessDescription.length}/500
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
        <Field label="City" htmlFor="city">
          <TextInput
            id="city"
            name="city"
            placeholder="e.g. Malaybalay"
            autoComplete="address-level2"
            value={value.city}
            onChange={e => set('city', e.target.value)}
          />
        </Field>
        <Field label="Province" htmlFor="province">
          <TextInput
            id="province"
            name="province"
            placeholder="e.g. Bukidnon"
            autoComplete="address-level1"
            value={value.province}
            onChange={e => set('province', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Contact number" htmlFor="phoneNumber" error={phoneError ?? undefined}>
        <TextInput
          id="phoneNumber"
          type="tel"
          name="phoneNumber"
          placeholder="0917 123 4567"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={phoneError ? true : undefined}
          value={value.phoneNumber}
          onChange={e => set('phoneNumber', e.target.value)}
          onBlur={onPhoneBlur}
        />
      </Field>
    </FormSection>
  );
}
