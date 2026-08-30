"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Truck, MapPin, CheckCircle2, Package, BadgePercent, Building2, Globe } from "lucide-react";
import { PageHeader, Button, Toggle } from "@/components/admin/ui";

function ZoneCard({ icon: Icon, zone, label, description, examples, fee, onChange, disabled, accentClass }) {
  return (
    <div
      className={`relative flex flex-col border transition-all duration-200 overflow-hidden ${
        disabled ? "opacity-50" : "hover:shadow-md"
      } ${accentClass}`}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-paper flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-smoke" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-ink uppercase tracking-[-0.005em]">{label}</h3>
              <p className="text-[10px] text-smoke mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Fee Input */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-[-0.005em] text-smoke mb-2">
            Delivery Fee
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-smoke text-sm font-medium">Tk </span>
            <input
              type="number"
              min="0"
              value={fee}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-smoke/30 bg-transparent text-ink text-lg font-bold focus:outline-none focus:border-ink transition-colors disabled:cursor-not-allowed"
            />
          </div>
          {fee === 0 && (
            <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={10} /> Free delivery for this zone
            </p>
          )}
        </div>

        {/* Example areas */}
        <div className="mt-auto">
          <p className="text-[10px] uppercase tracking-[-0.005em] text-smoke/60 mb-2">Example Areas</p>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((area) => (
              <span
                key={area}
                className="text-[10px] px-2 py-0.5 bg-paper text-smoke border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)]"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(1500);
  const [insideDhaka, setInsideDhaka] = useState(60);
  const [suburbs, setSuburbs] = useState(100);
  const [outsideDhaka, setOutsideDhaka] = useState(130);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.shipping || {};
        setFreeShippingEnabled(s.freeShippingEnabled ?? false);
        setFreeShippingThreshold(s.freeShippingThreshold ?? 1500);
        setInsideDhaka(s.insideDhaka ?? 60);
        setSuburbs(s.suburbs ?? 100);
        setOutsideDhaka(s.outsideDhaka ?? 130);
      })
      .catch(() => toast.error("Failed to load shipping settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping: {
            freeShippingEnabled,
            freeShippingThreshold: Number(freeShippingThreshold),
            insideDhaka: Number(insideDhaka),
            suburbs: Number(suburbs),
            outsideDhaka: Number(outsideDhaka),
          },
        }),
      });
      if (res.ok) toast.success("Shipping settings saved!");
      else toast.error("Failed to save");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-smoke text-sm animate-pulse">Loading shipping settings…</div>
      </div>
    );
  }

  const zones = [
    {
      zone: "inside_dhaka",
      icon: Building2,
      label: "Inside Dhaka",
      description: "City corporation area",
      examples: ["Gulshan", "Dhanmondi", "Mirpur", "Uttara", "Motijheel", "Banani"],
      fee: insideDhaka,
      onChange: setInsideDhaka,
      accentClass: "border-smoke/20 border-t-signal border-t-2",
    },
    {
      zone: "suburbs",
      icon: MapPin,
      label: "Suburbs",
      description: "Near-Dhaka districts",
      examples: ["Savar", "Gazipur", "Narayanganj", "Narsingdi", "Manikganj"],
      fee: suburbs,
      onChange: setSuburbs,
      accentClass: "border-smoke/20 border-t-amber-500 border-t-2",
    },
    {
      zone: "outside_dhaka",
      icon: Globe,
      label: "Outside Dhaka",
      description: "All other divisions",
      examples: ["Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Mymensingh"],
      fee: outsideDhaka,
      onChange: setOutsideDhaka,
      accentClass: "border-smoke/20 border-t-blue-400 border-t-2",
    },
  ];

  return (
    <div>
      <PageHeader
        icon={Truck}
        title="Shipping & Delivery"
        subtitle="Set delivery fees by zone — customers select their zone at checkout"
        actions={
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">

        {/* Free Shipping Panel */}
        <div className="bg-white border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-smoke/10">
            <div className="w-9 h-9 bg-paper flex items-center justify-center flex-shrink-0 mt-0.5">
              <BadgePercent size={16} className="text-smoke" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold text-ink uppercase tracking-[-0.005em]">
                Free Shipping
              </h2>
              <p className="text-[11px] text-smoke mt-0.5">
                Override all zone fees and offer free delivery sitewide
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Global free shipping toggle */}
            <div className="flex items-center justify-between p-4 bg-paper/50 border border-smoke/15">
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  Enable Free Shipping for All Orders
                </p>
                <p className="text-[11px] text-smoke mt-0.5">
                  All zones will be free — ignores per-zone fees and threshold below
                </p>
              </div>
              <Toggle checked={freeShippingEnabled} onChange={setFreeShippingEnabled} />
            </div>

            {/* Threshold */}
            <div className={freeShippingEnabled ? "opacity-40 pointer-events-none" : ""}>
              <label className="block text-[10px] uppercase tracking-[-0.005em] text-smoke mb-2">
                Auto-Free Threshold — orders above this amount get free shipping
              </label>
              <div className="relative flex items-center max-w-xs">
                <span className="absolute left-3 text-smoke text-sm font-medium">Tk </span>
                <input
                  type="number"
                  min="0"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-smoke/30 bg-transparent text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                />
              </div>
              <p className="text-[10px] text-smoke/60 mt-1.5">
                Set to 0 to disable the threshold (only global toggle above will apply free shipping)
              </p>
            </div>
          </div>
        </div>

        {/* Zone Cards */}
        <div className="bg-white border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-smoke/10">
            <div className="w-9 h-9 bg-paper flex items-center justify-center flex-shrink-0 mt-0.5">
              <Truck size={16} className="text-smoke" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold text-ink uppercase tracking-[-0.005em]">
                Delivery Zones
              </h2>
              <p className="text-[11px] text-smoke mt-0.5">
                Set a fee per zone — customers choose their zone at checkout
              </p>
            </div>
          </div>

          <div className="p-6">
            {freeShippingEnabled && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" strokeWidth={2} />
                <p className="text-[12px] text-emerald-700 font-medium">
                  Global free shipping is active — zone fees are currently ignored
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {zones.map((z) => (
                <ZoneCard key={z.zone} {...z} disabled={freeShippingEnabled} />
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-smoke/10">
            <div className="w-9 h-9 bg-paper flex items-center justify-center flex-shrink-0 mt-0.5">
              <Package size={16} className="text-smoke" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold text-ink uppercase tracking-[-0.005em]">
                Customer View Preview
              </h2>
              <p className="text-[11px] text-smoke mt-0.5">
                This is how delivery options appear at checkout
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-2">
            {freeShippingEnabled ? (
              <div className="flex items-center justify-between p-4 border-2 border-signal bg-paper">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-signal flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-signal" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">All Zones — Free Delivery</p>
                    <p className="text-xs text-smoke mt-0.5">Delivery to anywhere in Bangladesh</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600">Free</span>
              </div>
            ) : (
              [
                { label: "Inside Dhaka", desc: "Gulshan, Dhanmondi, Mirpur, Uttara…", fee: insideDhaka },
                { label: "Suburbs", desc: "Savar, Gazipur, Narayanganj…", fee: suburbs },
                { label: "Outside Dhaka", desc: "Chittagong, Sylhet, Rajshahi…", fee: outsideDhaka },
              ].map((opt, i) => (
                <div
                  key={opt.label}
                  className={`flex items-center justify-between p-4 border ${
                    i === 0
                      ? "border-2 border-signal bg-paper"
                      : "border-smoke/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${i === 0 ? "border-signal" : "border-smoke/50"}`}>
                      {i === 0 && <div className="w-2 h-2 rounded-full bg-signal" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{opt.label}</p>
                      <p className="text-xs text-smoke mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${opt.fee === 0 ? "text-emerald-600" : "text-ink"}`}>
                    {opt.fee === 0 ? "Free" : `Tk ${opt.fee}`}
                  </span>
                </div>
              ))
            )}
            {!freeShippingEnabled && freeShippingThreshold > 0 && (
              <p className="text-[11px] text-smoke/70 pt-2">
                Orders above Tk {freeShippingThreshold.toLocaleString()} automatically qualify for free shipping
              </p>
            )}
          </div>
        </div>

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Shipping Settings"}
        </Button>
      </div>
    </div>
  );
}
