export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Settings from "@/models/Settings";
import "@/models/User"; // register User schema for .populate("user")
import { serializeDoc, formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, ChevronRight, Plus } from "lucide-react";
import { PageHeader, Card, Pill, EmptyState, TableWrap, Button } from "@/components/admin/ui";
import OrdersFilterBar from "@/components/admin/OrdersFilterBar";
import { resolveRange } from "@/lib/order-date-range";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const SOURCE_LABELS = {
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  phone: "Phone",
  offline: "Walk-in",
  other: "Manual",
};

// Two kinds of order, two row colours: the customer checked out on the
// storefront, or a staff member keyed it in.
const isWebsiteOrder = (order) => !order.source || order.source === "website";

// Shows the sales channel + who created it. Admin-only — the customer never
// sees this.
function ChannelTag({ order }) {
  if (isWebsiteOrder(order)) return null;

  return (
    <p className="text-[10px] text-signal mt-0.5">
      via {SOURCE_LABELS[order.source] || order.source}
      {order.createdByName ? ` · ${order.createdByName}` : ""}
    </p>
  );
}

// Darken a #rrggbb (or #rgb) hex toward black by `f` — used to build the hover
// shade of each configurable row colour so hover still reads regardless of tint.
function darken(hex, f = 0.93) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return hex;
  const ch = (i) => Math.max(0, Math.round(parseInt(full.slice(i, i + 2), 16) * f));
  return `rgb(${ch(0)}, ${ch(2)}, ${ch(4)})`;
}

async function getData({ status, range, from, to }) {
  await connectDB();
  const settings = await Settings.findOne({}, "orderRowColors orderFilters").lean();
  const weekStartsOn = settings?.orderFilters?.weekStartsOn ?? 6;

  // Date filter (applies to both the list and the per-status counts).
  const { start, end } = resolveRange({ range, from, to, weekStartsOn });
  const dateFilter = {};
  if (start || end) {
    dateFilter.createdAt = {};
    if (start) dateFilter.createdAt.$gte = start;
    if (end) dateFilter.createdAt.$lt = end;
  }
  const hasDate = Object.keys(dateFilter).length > 0;

  // The list also narrows by the selected status; the counts do not, so every
  // tab shows how many orders that status holds within the current date range.
  const listFilter = { ...dateFilter };
  if (status && status !== "all") listFilter.orderStatus = status;

  const [orders, countsAgg] = await Promise.all([
    Order.find(listFilter).populate("user", "name email").sort({ createdAt: -1 }).lean(),
    Order.aggregate([
      ...(hasDate ? [{ $match: dateFilter }] : []),
      { $group: { _id: "$orderStatus", n: { $sum: 1 } } },
    ]),
  ]);

  const counts = { all: 0 };
  for (const s of STATUSES) counts[s] = 0;
  for (const row of countsAgg) {
    if (row._id in counts) counts[row._id] = row.n;
    counts.all += row.n;
  }

  return {
    orders: serializeDoc(orders),
    counts,
    weekStartsOn,
    colors: {
      website: settings?.orderRowColors?.website || "#EAF2FB",
      staff: settings?.orderRowColors?.staff || "#FEF3C7",
    },
  };
}

// Legend explaining what each row colour means, shown above the list.
function ColorLegend({ colors }) {
  const items = [
    { color: colors.website, label: "Website order", sub: "automated checkout" },
    { color: colors.staff, label: "Staff order", sub: "Facebook / walk-in / manual" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 border-b border-smoke/10 bg-white">
      <span className="text-[10px] uppercase tracking-[-0.005em] text-smoke font-semibold">Row colours</span>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded border border-smoke/25 flex-shrink-0" style={{ backgroundColor: it.color }} />
          <span className="text-[11px] text-ink font-medium">
            {it.label}
            <span className="text-smoke font-normal"> · {it.sub}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

const STATUS_TONE = { pending: "amber", processing: "blue", shipped: "blue", delivered: "green", cancelled: "red" };
const PAYMENT_TONE = { paid: "green", failed: "red", pending: "amber" };

// Compact courier-history indicator (delivered/total, flags frauds).
function FraudBadge({ fc }) {
  if (!fc) return null;
  if (fc.status === "checking" || fc.status === "pending") {
    return <span className="text-[10px] text-smoke/60">checking…</span>;
  }
  if (fc.status !== "done") return null;
  const tone = fc.frauds > 0 ? "bg-red-100 text-red-700" : fc.successRate >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${tone}`}>
      {fc.delivered}/{fc.totalParcels} ✓{fc.frauds > 0 ? ` · ${fc.frauds}⚠` : ""}
    </span>
  );
}

export default async function AdminOrdersPage({ searchParams }) {
  const status = searchParams?.status || "all";
  const range = searchParams?.range || "all";
  const from = searchParams?.from || "";
  const to = searchParams?.to || "";
  const { orders, colors, counts, weekStartsOn } = await getData({ status, range, from, to });
  const filtered = status !== "all" || range !== "all" || from || to;

  // Real CSS classes (not inline styles) so each row keeps a proper :hover
  // shade even though the two colours are admin-configurable.
  const rowStyles = `
    .ord-web{background-color:${colors.website};}
    .ord-web:hover{background-color:${darken(colors.website)};}
    .ord-staff{background-color:${colors.staff};}
    .ord-staff:hover{background-color:${darken(colors.staff)};}
  `;
  const rowClass = (order) => (isWebsiteOrder(order) ? "ord-web" : "ord-staff");

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: rowStyles }} />
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} ${filtered ? "match this filter" : "total"}`}
        icon={ShoppingCart}
        actions={
          <Button as={Link} href="/admin/orders/new">
            <Plus size={14} /> Create Order
          </Button>
        }
      />

      <OrdersFilterBar
        status={status}
        range={range}
        from={from}
        to={to}
        counts={counts}
        weekStartsOn={weekStartsOn}
      />

      <Card padded={false}>
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={filtered ? "No orders match this filter" : "No orders yet"}
            hint={filtered ? "Try a different status or date range." : "New orders will show up here."}
          />
        ) : (
          <>
            <ColorLegend colors={colors} />

            {/* Desktop table */}
            <div className="hidden md:block">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-paper/40">
                      {["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", ""].map((h, i) => (
                        <th key={i} className="text-left px-4 py-2.5 text-[10px] text-smoke uppercase tracking-[-0.005em] font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className={`${rowClass(order)} border-t border-smoke/10 transition-colors`}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/orders/${order._id}`} className="font-medium text-ink hover:text-signal transition-colors">{order.orderNumber}</Link>
                        </td>
                        <td className="px-4 py-3 text-ink/80">
                          {order.user?.name || order.shippingAddress?.name || "Guest"}
                          <div className="text-xs text-smoke">{order.shippingAddress?.phone}</div>
                          <ChannelTag order={order} />
                          <div className="mt-1"><FraudBadge fc={order.fraudCheck} /></div>
                        </td>
                        <td className="px-4 py-3 text-ink/70 whitespace-nowrap">{order.items.length} item{order.items.length > 1 ? "s" : ""}</td>
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{formatPrice(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[11px] text-smoke">{order.paymentMethod === "cod" ? "COD" : "Online"}</span>
                            <Pill tone={PAYMENT_TONE[order.paymentStatus] || "gray"}>{order.paymentStatus}</Pill>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Pill tone={STATUS_TONE[order.orderStatus] || "gray"}>{order.orderStatus}</Pill></td>
                        <td className="px-4 py-3 text-smoke text-xs whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                        <td className="px-4 py-3"><Link href={`/admin/orders/${order._id}`} className="text-xs text-signal hover:underline">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-smoke/10">
              {orders.map((order) => (
                <Link key={order._id} href={`/admin/orders/${order._id}`} className={`${rowClass(order)} flex items-center gap-3 p-4 transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink">{order.orderNumber}</p>
                      <span className="font-semibold text-ink text-sm">{formatPrice(order.totalAmount)}</span>
                    </div>
                    <p className="text-xs text-smoke mt-0.5 truncate">
                      {order.user?.name || order.shippingAddress?.name || "Guest"} · {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </p>
                    <ChannelTag order={order} />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Pill tone={PAYMENT_TONE[order.paymentStatus] || "gray"}>{order.paymentStatus}</Pill>
                      <Pill tone={STATUS_TONE[order.orderStatus] || "gray"}>{order.orderStatus}</Pill>
                      <FraudBadge fc={order.fraudCheck} />
                      <span className="text-[11px] text-smoke ml-auto">{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-smoke/50 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
