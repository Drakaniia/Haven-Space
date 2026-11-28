import type { CreatePaidAmenityPayload } from '../../lib/api/payments';
import { formatPeso } from '../../lib/payments';
import type { AmenityBillingModel, PaidAmenity } from '../../lib/types';

export const AMENITY_PRESETS: CreatePaidAmenityPayload[] = [
  {
    name: 'Air conditioning',
    description: 'Monthly AC usage add-on',
    icon: 'aircon',
    billing_model: 'monthly',
    price: 1500,
    unit_label: 'unit',
  },
  {
    name: 'Aircon sub-meter',
    description: 'Billed by sub-meter kWh reading',
    icon: 'aircon',
    billing_model: 'per_use',
    price: 18,
    unit_label: 'kWh',
    is_metered: true,
  },
  {
    name: 'Mini-fridge / Appliance',
    description: 'Personal mini-fridge or small appliance fee',
    icon: 'kitchen',
    billing_model: 'monthly',
    price: 400,
    unit_label: 'unit',
  },
  {
    name: 'Rice cooker / Kettle',
    description: 'Personal cooking or heating appliance fee',
    icon: 'kitchen',
    billing_model: 'monthly',
    price: 150,
    unit_label: 'unit',
  },
  {
    name: 'Dedicated Parking Slot',
    description: 'Reserved motorcycle or car slot',
    icon: 'parking',
    billing_model: 'monthly',
    price: 600,
    unit_label: 'slot',
    max_slots: 4,
  },
  {
    name: 'Laundry Machine',
    description: 'Per-load washing machine access',
    icon: 'laundry',
    billing_model: 'per_use',
    price: 60,
    unit_label: 'load',
  },
  {
    name: 'High-Speed WiFi Upgrade',
    description: 'Dedicated high-bandwidth WiFi tier',
    icon: 'wifi',
    billing_model: 'monthly',
    price: 300,
    unit_label: 'device',
  },
  {
    name: 'Drinking Water Refill',
    description: 'Purified 5-gallon water dispenser refill',
    icon: 'sparkles',
    billing_model: 'per_use',
    price: 35,
    unit_label: 'gallon',
  },
  {
    name: 'Storage Locker',
    description: 'Dedicated hallway or common locker',
    icon: 'furnished',
    billing_model: 'monthly',
    price: 150,
    unit_label: 'locker',
    max_slots: 10,
  },
  {
    name: 'Overnight Visitor Pass',
    description: 'Registered overnight guest fee',
    icon: 'users',
    billing_model: 'per_use',
    price: 150,
    unit_label: 'night',
  },
  {
    name: 'Keycard / Gate Fob',
    description: 'One-time access card or gate fob issuance',
    icon: 'shieldCheck',
    billing_model: 'one_time',
    price: 200,
    unit_label: 'card',
  },
];

export const AMENITY_ICON_OPTIONS = [
  { value: 'sparkles', label: 'General' },
  { value: 'aircon', label: 'Aircon' },
  { value: 'parking', label: 'Parking' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'kitchen', label: 'Appliance / Kitchen' },
  { value: 'furnished', label: 'Locker / Storage' },
  { value: 'users', label: 'Visitor' },
  { value: 'shieldCheck', label: 'Access / Keycard' },
];

export function billingModelLabel(model: AmenityBillingModel): string {
  if (model === 'monthly') return 'Monthly';
  if (model === 'per_use') return 'Per use';
  return 'One-time';
}

export function amenityPriceLabel(item: Pick<PaidAmenity, 'price' | 'billing_model' | 'unit_label' | 'is_included'>): string {
  if (item.is_included || item.price === 0) {
    return 'Included (₱0)';
  }

  const price = formatPeso(item.price);

  if (item.billing_model === 'monthly') return `${price} / mo`;
  if (item.billing_model === 'per_use') return `${price} / ${item.unit_label || 'use'}`;
  return `${price} one-time`;
}

export function defaultDueDatePlus3(todayIso: string): string {
  const [y, m, d] = todayIso.split('-').map(Number);

  return new Date(Date.UTC(y, m - 1, d + 3)).toISOString().slice(0, 10);
}
