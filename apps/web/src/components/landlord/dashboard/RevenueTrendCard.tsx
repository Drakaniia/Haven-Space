import { Link } from '@tanstack/react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { StatusBadge } from '../../ui/StatusBadge';
import type { RevenuePoint } from '../../../lib/fixtures/dashboard';

function peso(value: number): string {
  return `₱${value.toLocaleString()}`;
}

function compactPeso(value: number): string {
  if (value >= 1000) {
    return `₱${Math.round(value / 1000)}k`;
  }

  return `₱${value}`;
}

/** Emphasises the last point and gives every point a native SVG title on focus. */
function RevenueDot({
  cx,
  cy,
  payload,
  index,
  lastIndex,
}: {
  cx?: number;
  cy?: number;
  payload?: RevenuePoint;
  index?: number;
  lastIndex?: number;
}) {
  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  const isLast = index === lastIndex;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={isLast ? 5 : 3.5}
        fill={isLast ? 'var(--color-primary-strong)' : 'var(--color-surface)'}
        stroke="var(--color-primary-strong)"
        strokeWidth={2}
        tabIndex={0}
        role="img"
        aria-label={`${payload.label}: ${peso(payload.collected)}`}
      >
        <title>{`${payload.label}: ${peso(payload.collected)}`}</title>
      </circle>
      {isLast ? (
        <text
          x={cx}
          y={cy - 14}
          textAnchor="end"
          className="fill-ink text-[12px] font-semibold tabular"
        >
          {peso(payload.collected)}
        </text>
      ) : null}
    </g>
  );
}

/**
 * "How is rent collection trending?" — six trailing months of money collected.
 *
 * The axis labels sit at 12px in `gray-ink` so they stay legible on paper; the
 * line is moss with a faint wash beneath it. A screen-reader table carries the
 * same series.
 *
 * `sample` marks a series that is not the landlord's real history (the
 * revenue-history endpoint does not exist yet, so the dashboard still renders
 * `lib/fixtures/dashboard`). The card says so plainly instead of passing the
 * shape off as real money.
 */
export function RevenueTrendCard({
  points,
  hasProperties,
  sample = false,
}: {
  points: RevenuePoint[];
  /** False once the property list has loaded empty (D35). */
  hasProperties: boolean;
  /** True while `points` are illustrative fixtures rather than recorded payments. */
  sample?: boolean;
}) {
  const lastIndex = points.length - 1;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kicker">Rent collection</p>
          <h2 className="mt-1 font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink">
            How is rent collection trending?
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {sample && hasProperties ? <StatusBadge status="draft" label="Sample data" /> : null}
          <Link
            to="/landlord/payments"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            View payments
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      </div>

      {!hasProperties ? (
        <div className="mt-4 flex flex-1 items-center">
          <div className="w-full">
            <EmptyState
              icon="analytics"
              title="No revenue yet"
              description="Create a listing and start collecting rent."
              action={
                <Link to="/landlord/listings/create" className={buttonClasses()}>
                  Create a listing
                </Link>
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div
            className="mt-4 h-[240px] w-full"
            role="img"
            aria-label={`Rent collected per month, trailing six months${
              sample ? ' (sample data)' : ''
            }`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 28, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenue-wash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0.18 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border-strong)' }}
                  tickMargin={8}
                  tick={{ fill: 'var(--color-gray-ink)', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={compactPeso}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickMargin={4}
                  tick={{ fill: 'var(--color-gray-ink)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '3 3' }}
                  formatter={value => [peso(Number(value)), 'Collected']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-pop)',
                    fontSize: 13,
                    color: 'var(--color-ink)',
                  }}
                  labelStyle={{ color: 'var(--color-gray-ink)', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--color-primary-strong)"
                  strokeWidth={2.25}
                  fill="url(#revenue-wash)"
                  isAnimationActive={false}
                  dot={props => <RevenueDot {...props} lastIndex={lastIndex} />}
                  activeDot={{ r: 6, fill: 'var(--color-primary-strong)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {sample ? (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Illustrative trend only — monthly collection history isn&apos;t recorded yet. The
              real figure for this month is in your portfolio snapshot.
            </p>
          ) : null}

          <table className="sr-only">
            <caption>Rent collected per month, trailing six months</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Collected</th>
              </tr>
            </thead>
            <tbody>
              {points.map(point => (
                <tr key={point.month}>
                  <th scope="row">{point.label}</th>
                  <td>{peso(point.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
