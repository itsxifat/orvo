export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import { serializeDoc, formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, Truck, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import PurchaseTracker from "@/components/tracking/PurchaseTracker";

async function getOrder(orderId) {
  await connectDB();
  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .lean();
  return order ? serializeDoc(order) : null;
}

export default async function OrderConfirmationPage({ params }) {
  const order = await getOrder(params.orderId);
  if (!order) notFound();

  return (
    <div className="bg-paper min-h-screen py-16">
      {/* Client Purchase (dedups with the server Purchase via purchase_<orderId>) */}
      <PurchaseTracker
        order={{
          id: order._id,
          orderNumber: order.orderNumber,
          value: order.totalAmount,
          currency: "BDT",
          contentIds: (order.items || []).map((i) => String(i.product || i.name)),
          numItems: (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
          userData: { email: order.shippingAddress?.email || order.guestEmail || undefined },
        }}
      />
      <div className="container-custom max-w-2xl">
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-smoke">
            Thank you for your order. We&apos;ll prepare it shortly.
          </p>
        </div>

        {/* Order info card */}
        <div className="bg-white border border-smoke/20 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-smoke uppercase tracking-[-0.005em]">
                Order Number
              </p>
              <p className="text-lg font-bold text-ink">
                {order.orderNumber}
              </p>
            </div>
            <Badge
              variant={
                order.paymentMethod === "cod" ? "pending" : order.paymentStatus
              }
            >
              {order.paymentMethod === "cod"
                ? "COD"
                : order.paymentStatus.toUpperCase()}
            </Badge>
          </div>

          {/* Status timeline */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { icon: CheckCircle, label: "Confirmed", active: true },
              { icon: Package, label: "Processing", active: order.orderStatus !== "pending" },
              { icon: Truck, label: "Shipped", active: ["shipped", "delivered"].includes(order.orderStatus) },
              { icon: Clock, label: "Delivered", active: order.orderStatus === "delivered" },
            ].map((step, i) => (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center flex-1 ${
                    step.active ? "text-signal" : "text-smoke/40"
                  }`}
                >
                  <step.icon size={20} />
                  <span className="text-[10px] mt-1 text-center">{step.label}</span>
                </div>
                {i < 3 && (
                  <div
                    className={`h-px flex-1 mx-1 ${
                      step.active ? "bg-signal" : "bg-smoke/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Shipping address */}
          <div className="border-t border-smoke/20 pt-4">
            <p className="text-xs text-smoke uppercase tracking-[-0.005em] mb-2">
              Shipping To
            </p>
            <p className="text-sm text-ink font-medium">
              {order.shippingAddress.name}
            </p>
            <p className="text-sm text-ink/70">
              {order.shippingAddress.street}, {order.shippingAddress.city}
            </p>
            <p className="text-sm text-ink/70">
              {order.shippingAddress.phone}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-smoke/20 p-6 mb-6">
          <h3 className="text-sm font-semibold text-ink uppercase tracking-[-0.005em] mb-4">
            Items Ordered
          </h3>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-ink font-medium">{item.name}</p>
                  <p className="text-smoke text-xs">
                    {item.size} · {item.color} · Qty: {item.quantity}
                  </p>
                  {item.sku && <p className="text-smoke/80 text-[11px]">SKU: {item.sku}</p>}
                </div>
                <span className="font-medium text-ink">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-smoke/20 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-smoke">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>
                  Discount
                  {order.appliedDiscounts?.[0]?.code
                    ? " · " + order.appliedDiscounts[0].code
                    : ""}
                </span>
                <span>− {formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-smoke">
              <span>Shipping</span>
              <span>
                {order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-ink pt-1">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/shop" className="btn-primary flex-1 text-center py-4">
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="btn-outline flex-1 text-center py-4"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
