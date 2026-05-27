'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  ShoppingBag,
  Check,
  Plus,
  Edit,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';

/* ─────────────────────────────────────────────
   Shared helpers
   ───────────────────────────────────────────── */

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <h3 className="mb-4 text-lg font-extrabold text-white">{title}</h3>
      {children}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3 shadow-xl">
      {label && (
        <p className="mb-1.5 text-xs font-bold text-white/60">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}:{' '}
          {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

const GRID_STROKE = 'rgba(255,255,255,0.06)';
const AXIS_TICK = { fill: 'rgba(255,255,255,0.5)', fontSize: 12 };

function currencyFmt(v: number) {
  return `${v.toLocaleString()} DA`;
}

/* ─────────────────────────────────────────────
   1. RevenueLineChart
   ───────────────────────────────────────────── */

export function RevenueLineChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  return (
    <ChartCard title="Revenue Over Time">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6a00" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ff6a00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
            }}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={
              <CustomTooltip formatter={currencyFmt} />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#ff6a00"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            name="Revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   2. MonthlyRevenueBarChart
   ───────────────────────────────────────────── */

export function MonthlyRevenueBarChart({
  data,
}: {
  data: { month: string; revenue: number }[];
}) {
  return (
    <ChartCard title="Monthly Revenue">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6a00" />
              <stop offset="100%" stopColor="#ffb000" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="month"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={
              <CustomTooltip formatter={currencyFmt} />
            }
          />
          <Bar
            dataKey="revenue"
            fill="url(#barGrad)"
            radius={[6, 6, 0, 0]}
            name="Revenue"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   3. PaymentMethodPieChart
   ───────────────────────────────────────────── */

const PAYMENT_COLORS: Record<string, string> = {
  BaridiMob: '#ff6a00',
  CCP: '#ffb000',
  RedotPay: '#ff8c38',
};

export function PaymentMethodPieChart({
  data,
}: {
  data: { method: string; revenue: number; count: number }[];
}) {
  return (
    <ChartCard title="Payment Methods">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="method"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={PAYMENT_COLORS[entry.method] ?? '#ff6a00'}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <CustomTooltip formatter={currencyFmt} />
            }
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   4. OrderStatusChart
   ───────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  pending: '#ffb000',
  paid: '#22c55e',
  delivered: '#3b82f6',
  cancelled: '#ef4444',
};

export function OrderStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  return (
    <ChartCard title="Order Status">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="status"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            width={80}
            tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Orders">
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={STATUS_COLORS[entry.status] ?? '#ff6a00'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   5. CategoryRevenueChart
   ───────────────────────────────────────────── */

export function CategoryRevenueChart({
  data,
}: {
  data: { category: string; count: number; revenue: number }[];
}) {
  return (
    <ChartCard title="Category Performance">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="category"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          <Legend
            wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill="#ff6a00"
            radius={[4, 4, 0, 0]}
            name="Sales Count"
          />
          <Bar
            yAxisId="right"
            dataKey="revenue"
            fill="#ffb000"
            radius={[4, 4, 0, 0]}
            name="Revenue"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   6. StatCard
   ───────────────────────────────────────────── */

export function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-2xl border border-white/10 bg-white/[0.045] p-5 transition-all duration-300 hover:scale-[1.02] hover:border-tiger-ember/30 hover:shadow-[0_0_30px_rgba(255,106,0,0.08)] ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tiger-ember/15 text-tiger-ember">
          {icon}
        </div>
        <span className="text-sm font-bold text-white/58">{label}</span>
      </div>

      <p className="text-3xl font-extrabold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
          <span
            className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-white/40">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   7. TopProductsTable
   ───────────────────────────────────────────── */

export function TopProductsTable({
  products,
}: {
  products: {
    id: string;
    name: string;
    image: string;
    revenue: number;
    salesCount: number;
    category: string;
  }[];
}) {
  return (
    <ChartCard title="Top Products">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/40">
              <th className="pb-3 pr-3">#</th>
              <th className="pb-3 pr-3">Product</th>
              <th className="pb-3 pr-3">Category</th>
              <th className="pb-3 pr-3 text-right">Sales</th>
              <th className="pb-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.04]"
              >
                <td className="py-3 pr-3 font-extrabold text-white/40">
                  #{i + 1}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={32}
                      height={32}
                      className="rounded-lg object-cover"
                    />
                    <span className="font-bold text-white">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span className="rounded-full bg-tiger-ember/15 px-2.5 py-1 text-xs font-bold text-tiger-ember">
                    {p.category}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right font-bold text-white/70">
                  {p.salesCount.toLocaleString()}
                </td>
                <td className="py-3 text-right font-bold text-tiger-gold">
                  {p.revenue.toLocaleString()} DA
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   8. AccountStockBars
   ───────────────────────────────────────────── */

const STOCK_COLORS = {
  available: '#22c55e',
  sold: '#3b82f6',
  expired: '#a855f7',
  problem: '#ef4444',
} as const;

export function AccountStockBars({
  data,
}: {
  data: {
    label: string;
    available: number;
    sold: number;
    expired: number;
    problem: number;
    total: number;
  }[];
}) {
  return (
    <ChartCard title="Account Stock">
      <div className="space-y-4">
        {data.map((item) => {
          const segments = [
            { key: 'available', count: item.available, color: STOCK_COLORS.available },
            { key: 'sold', count: item.sold, color: STOCK_COLORS.sold },
            { key: 'expired', count: item.expired, color: STOCK_COLORS.expired },
            { key: 'problem', count: item.problem, color: STOCK_COLORS.problem },
          ];
          const total = item.total || 1;

          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {item.label}
                  </span>
                  {item.available < 3 && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      Low stock
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/40">
                  {item.available} avail · {item.sold} sold · {item.expired} exp ·{' '}
                  {item.problem} prob
                </span>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                {segments.map(
                  (seg) =>
                    seg.count > 0 && (
                      <div
                        key={seg.key}
                        className="transition-all duration-500"
                        style={{
                          width: `${(seg.count / total) * 100}%`,
                          backgroundColor: seg.color,
                        }}
                      />
                    ),
                )}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-1 text-xs text-white/50">
          {Object.entries(STOCK_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   9. ActivityFeed
   ───────────────────────────────────────────── */

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  order: ShoppingBag,
  account_sold: Check,
  account_added: Plus,
  product_update: Edit,
};

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ActivityFeed({
  activities,
}: {
  activities: { type: string; description: string; timestamp: string }[];
}) {
  return (
    <ChartCard title="Recent Activity">
      <div className="relative space-y-0">
        {/* Vertical timeline line */}
        <div className="absolute left-[15px] top-1 bottom-1 w-px bg-white/10" />

        {activities.map((a, i) => {
          const Icon = ACTIVITY_ICONS[a.type] ?? ShoppingBag;
          return (
            <div key={i} className="relative flex gap-4 py-3">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a]">
                <Icon className="h-3.5 w-3.5 text-tiger-ember" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white/80">
                  {a.description}
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {relativeTime(a.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────
   10. ExportButton
   ───────────────────────────────────────────── */

export function ExportButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-xl border border-tiger-ember/20 bg-tiger-ember/15 px-4 py-2.5 text-sm font-bold text-tiger-ember transition-colors hover:bg-tiger-ember/25"
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}
