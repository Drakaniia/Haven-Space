import { accessiblePropertyClause } from './property-access';

export interface LandlordDashboardStats {
  occupancy: {
    rate: number;
    total_rooms: number;
    occupied_rooms: number;
    trend: number;
  };
  revenue: {
    monthly: number;
    currency: 'PHP';
    trend: number;
  };
  renewals: {
    upcoming_count: number;
    period: string;
  };
  payment_alerts: {
    due_soon: number;
    overdue: number;
  };
}

interface RoomStatsRow {
  total_rooms: number | null;
  occupied_rooms: number | null;
  monthly_revenue: number | null;
}

interface RenewalsRow {
  upcoming_renewals: number | null;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function occupancyRate(totalRooms: number, occupiedRooms: number): number {
  if (totalRooms <= 0) {
    return 0;
  }

  return Math.round((occupiedRooms / totalRooms) * 1000) / 10;
}

export async function getLandlordDashboardStats(
  db: D1Database,
  landlordId: number
): Promise<LandlordDashboardStats> {
  const roomStats = await db
    .prepare(
      `
        SELECT
          COUNT(r.id) as total_rooms,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) as monthly_revenue
        FROM rooms r
        INNER JOIN properties p ON r.property_id = p.id
        WHERE p.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
      `
    )
    .bind(landlordId, landlordId)
    .first<RoomStatsRow>();

  const renewals = await db
    .prepare(
      `
        SELECT COUNT(*) as upcoming_renewals
        FROM applications app
        INNER JOIN rooms r ON app.room_id = r.id
        INNER JOIN properties p ON r.property_id = p.id
        WHERE app.status IN ('accepted', 'approved', 'confirmed')
          AND app.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
      `
    )
    .bind(landlordId, landlordId)
    .first<RenewalsRow>();

  const totalRooms = numeric(roomStats?.total_rooms);
  const occupiedRooms = numeric(roomStats?.occupied_rooms);

  return {
    occupancy: {
      rate: occupancyRate(totalRooms, occupiedRooms),
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      trend: 0,
    },
    revenue: {
      monthly: numeric(roomStats?.monthly_revenue),
      currency: 'PHP',
      trend: 0,
    },
    renewals: {
      upcoming_count: numeric(renewals?.upcoming_renewals),
      period: 'This month',
    },
    payment_alerts: {
      due_soon: 0,
      overdue: 0,
    },
  };
}
