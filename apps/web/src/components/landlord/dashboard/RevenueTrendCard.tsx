import { Link } from '@tanstack/react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
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
        r={isLast ? 5 : 4}
        fill="var(--color-primary-strong)"
        stroke="var(--color-surface)"
        strokeWidth={2}
        tabIndex={0}
        role="img"
        aria-label={`${payload.label}: ${peso(payload.collected)}`}
      >
        <title>{`${payload.label}: ${peso(payload.collected)}`}</title>
      </circle>
      {isLast ? (
        <text x={cx} y={cy - 12} textAnchor="end" className="fill-ink text-[11px] font-semibold">
          {peso(payload.collected)}
        </text>
      ) : null}
    </g>
  );
}

export function RevenueTrendCard({
  points,
  hasProperties,
}: {
  points: RevenuePoint[];
  /** False once the property list has loaded empty (D35). */
  hasProperties: boolean;
}) {
  const lastIndex = points.length - 1;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Revenue trend</h2>
        <Link
          to="/landlord/payments"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          View payments
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {!hasProperties ? (
        <div className="mt-3 flex flex-1 items-center">
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
            className="mt-3 h-[220px] w-full"
            role="img"
            aria-label="Revenue trend, trailing six months"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-gray-ink)', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={compactPeso}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fill: 'var(--color-gray-ink)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '3 3' }}
                  formatter={value => [peso(Number(value)), 'Collected']}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--color-primary-strong)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={props => <RevenueDot {...props} lastIndex={lastIndex} />}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>Monthly revenue, trailing six months</caption>
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
