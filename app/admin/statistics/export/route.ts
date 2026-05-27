import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getProducts, getOrders, getAccounts } from '@/lib/admin-store';

/* ------------------------------------------------------------------ */
/*  CSV helpers                                                        */
/* ------------------------------------------------------------------ */

/** Escape a single CSV field – wrap in quotes if it contains commas, quotes, or newlines */
function csvField(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a full CSV string from a header row + data rows */
function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvField).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvField).join(','));
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  CSV generators per export type                                     */
/* ------------------------------------------------------------------ */

async function ordersCSV(): Promise<string> {
  const orders = await getOrders();
  const headers = ['id', 'customerName', 'email', 'phone', 'paymentMethod', 'total', 'status', 'createdAt', 'adminNotes'];
  const rows = orders.map((o) => [
    o.id,
    o.customerName,
    o.email,
    o.phone,
    o.paymentMethod,
    String(o.total),
    o.status,
    o.createdAt,
    o.adminNotes ?? '',
  ]);
  return buildCsv(headers, rows);
}

async function productsCSV(): Promise<string> {
  const products = await getProducts();
  const headers = ['id', 'name', 'category', 'price', 'available', 'featured'];
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.category,
    String(p.price),
    String(p.available),
    String(p.featured),
  ]);
  return buildCsv(headers, rows);
}

async function accountsCSV(): Promise<string> {
  const accounts = await getAccounts();
  const headers = ['id', 'email', 'status', 'dateCreated', 'price', 'notes'];
  const rows = accounts.map((a) => [
    a.id,
    a.email,
    a.status,
    a.dateCreated,
    String(a.price),
    a.notes ?? '',
  ]);
  return buildCsv(headers, rows);
}

async function revenueCSV(): Promise<string> {
  const orders = await getOrders();

  // Build a map of daily revenue for the last 90 days
  const today = new Date();
  const dailyMap = new Map<string, { revenue: number; orderCount: number }>();

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { revenue: 0, orderCount: 0 });
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const dateKey = order.createdAt?.slice(0, 10);
    if (dateKey && dailyMap.has(dateKey)) {
      const entry = dailyMap.get(dateKey)!;
      entry.revenue += order.total;
      entry.orderCount += 1;
    }
  }

  // Sort dates ascending
  const sortedDates = [...dailyMap.keys()].sort();

  const headers = ['date', 'revenue', 'orderCount'];
  const rows = sortedDates.map((date) => {
    const entry = dailyMap.get(date)!;
    return [date, String(entry.revenue), String(entry.orderCount)];
  });

  return buildCsv(headers, rows);
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

const GENERATORS: Record<string, () => Promise<string>> = {
  orders: ordersCSV,
  products: productsCSV,
  accounts: accountsCSV,
  revenue: revenueCSV,
};

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') ?? 'orders';

  const generator = GENERATORS[type];
  if (!generator) {
    return NextResponse.json(
      { error: `Invalid export type "${type}". Valid types: ${Object.keys(GENERATORS).join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const csvContent = await generator();

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tiger-store-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error(`CSV export error (${type}):`, err);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
