"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus, Trash2, MoveUp, MoveDown, Zap, ZapOff,
  Eye, EyeOff, Tag, Link as LinkIcon, Save, Navigation,
} from "lucide-react";
import { PageHeader, Button, Toggle } from "@/components/admin/ui";

export default function AdminNavbarPage() {
  const [navItems, setNavItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addType, setAddType] = useState("custom"); // 'custom' | 'category'
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("/");
  const [newCatId, setNewCatId] = useState("");
  const [newHighlight, setNewHighlight] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/navbar").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([navData, catData]) => {
        setNavItems(navData.navItems || []);
        setCategories(Array.isArray(catData) ? catData : []);
      })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/navbar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navItems }),
      });
      if (res.ok) toast.success("Navbar saved!");
      else toast.error("Failed to save");
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  };

  const update = (idx, field, value) => {
    setNavItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const move = (idx, dir) => {
    setNavItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((item, i) => ({ ...item, order: i }));
    });
  };

  const remove = (idx) => setNavItems((prev) => prev.filter((_, i) => i !== idx));

  const addItem = () => {
    if (addType === "custom") {
      if (!newLabel.trim()) { toast.error("Label is required"); return; }
      setNavItems((prev) => [
        ...prev,
        { type: "custom", label: newLabel.trim(), href: newHref || "/", highlighted: newHighlight, isActive: true, order: prev.length },
      ]);
    } else {
      if (!newCatId) { toast.error("Select a category"); return; }
      const cat = categories.find((c) => c._id === newCatId);
      setNavItems((prev) => [
        ...prev,
        { type: "category", label: newLabel.trim() || cat?.name || "", href: newHref || "/", categoryId: newCatId, highlighted: newHighlight, isActive: true, order: prev.length },
      ]);
    }
    setNewLabel(""); setNewHref("/"); setNewCatId(""); setNewHighlight(false);
  };

  const topLevelCats = categories.filter((c) => !c.parent);

  if (loading) return <div className="text-smoke py-10">Loading…</div>;

  return (
    <div>
      <PageHeader
        icon={Navigation}
        title="Navbar Configuration"
        subtitle="Configure what appears in the top navigation. Highlighted items show in terracotta with a shake effect."
        actions={
          <Button onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? "Saving…" : "Save Navbar"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Item list ── */}
        <div className="lg:col-span-2 space-y-3">
          {navItems.length === 0 && (
            <div className="bg-white border border-dashed border-smoke/30 p-10 text-center">
              <LinkIcon size={24} className="text-smoke/30 mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-smoke">No nav items yet. Add one from the panel →</p>
            </div>
          )}

          {navItems.map((item, i) => (
            <div
              key={i}
              className={`bg-white border p-4 transition-all ${item.highlighted ? "border-signal/30 bg-signal/[0.02]" : "border-smoke/20"} ${!item.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-smoke/40 hover:text-ink disabled:opacity-20 transition-colors">
                    <MoveUp size={13} strokeWidth={2} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === navItems.length - 1} className="p-0.5 text-smoke/40 hover:text-ink disabled:opacity-20 transition-colors">
                    <MoveDown size={13} strokeWidth={2} />
                  </button>
                </div>

                {/* Badge */}
                <span className={`text-[9px] uppercase tracking-[-0.005em] px-2 py-0.5 font-medium flex-shrink-0 ${item.type === "category" ? "bg-ink/10 text-ink" : "bg-smoke/15 text-smoke"}`}>
                  {item.type === "category" ? <><Tag size={9} className="inline mr-1" />Cat</> : <><LinkIcon size={9} className="inline mr-1" />Link</>}
                </span>

                {/* Label */}
                <input
                  value={item.label}
                  onChange={(e) => update(i, "label", e.target.value)}
                  className="flex-1 min-w-[100px] border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)] px-2.5 py-1.5 text-sm text-ink bg-transparent focus:outline-none focus:border-ink transition-colors"
                  placeholder="Label"
                />

                {/* Href */}
                <input
                  value={item.href || ""}
                  onChange={(e) => update(i, "href", e.target.value)}
                  className="flex-1 min-w-[120px] border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)] px-2.5 py-1.5 text-sm text-smoke font-mono bg-transparent focus:outline-none focus:border-ink transition-colors"
                  placeholder="/shop"
                />

                {/* Highlighted toggle */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.highlighted ? (
                    <Zap size={14} className="text-signal" strokeWidth={2} />
                  ) : (
                    <ZapOff size={14} className="text-smoke/40" strokeWidth={1.5} />
                  )}
                  <Toggle checked={item.highlighted} onChange={(v) => update(i, "highlighted", v)} />
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.isActive ? (
                    <Eye size={14} className="text-smoke" strokeWidth={1.5} />
                  ) : (
                    <EyeOff size={14} className="text-smoke/30" strokeWidth={1.5} />
                  )}
                  <Toggle checked={item.isActive} onChange={(v) => update(i, "isActive", v)} />
                </div>

                {/* Remove */}
                <button onClick={() => remove(i)} className="p-1.5 text-smoke/40 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>

              {/* Helper info row */}
              <div className="flex items-center gap-4 mt-2 pl-8">
                {item.type === "category" && item.categoryId && (
                  <span className="text-[10px] text-smoke">
                    Category: {categories.find((c) => c._id === item.categoryId?.toString())?.name || item.categoryId}
                  </span>
                )}
                {item.highlighted && (
                  <span className="text-[10px] text-signal flex items-center gap-1">
                    <Zap size={9} /> Highlighted — shows in terracotta with shake animation
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Add panel ── */}
        <div className="space-y-4">
          <div className="bg-white border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)] p-5">
            <p className="text-[10px] uppercase tracking-[-0.005em] text-smoke font-medium mb-4">Add Nav Item</p>

            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAddType("custom")}
                className={`flex-1 py-2 text-[11px] uppercase tracking-[-0.005em] border transition-colors ${addType === "custom" ? "bg-ink text-white border-ink" : "border-smoke/30 text-smoke hover:border-ink hover:text-ink"}`}
              >
                Custom Link
              </button>
              <button
                onClick={() => setAddType("category")}
                className={`flex-1 py-2 text-[11px] uppercase tracking-[-0.005em] border transition-colors ${addType === "category" ? "bg-ink text-white border-ink" : "border-smoke/30 text-smoke hover:border-ink hover:text-ink"}`}
              >
                Category
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[-0.005em] text-smoke mb-1">Label</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={addType === "category" ? "Leave blank to use category name" : "e.g. Sale"}
                  className="w-full rounded-2xl border border-smoke/30 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink bg-transparent transition-colors"
                />
              </div>

              {addType === "category" ? (
                <div>
                  <label className="block text-[10px] uppercase tracking-[-0.005em] text-smoke mb-1">Category</label>
                  <select
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    className="w-full rounded-2xl border border-smoke/30 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink bg-white transition-colors"
                  >
                    <option value="">Select category…</option>
                    {topLevelCats.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-smoke/60 mt-1">Subcategories auto-populate as dropdown</p>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] uppercase tracking-[-0.005em] text-smoke mb-1">Link URL</label>
                  <input
                    value={newHref}
                    onChange={(e) => setNewHref(e.target.value)}
                    placeholder="/shop?onSale=true"
                    className="w-full rounded-2xl border border-smoke/30 px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-ink bg-transparent transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-t border-smoke/10">
                <div>
                  <p className="text-[11px] font-medium text-ink">Highlighted</p>
                  <p className="text-[10px] text-smoke">Terracotta color + shake animation</p>
                </div>
                <Toggle checked={newHighlight} onChange={setNewHighlight} />
              </div>

              <Button onClick={addItem} className="w-full">
                <Plus size={14} /> Add Item
              </Button>
            </div>
          </div>

          {/* Highlight legend */}
          <div className="bg-white border border-smoke/15 rounded-2xl shadow-[0_1px_3px_rgba(16,17,20,0.04)] p-5">
            <p className="text-[10px] uppercase tracking-[-0.005em] text-smoke font-medium mb-3">Legend</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-signal" strokeWidth={2} />
                <span className="text-ink">Highlighted — terracotta + shake</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-smoke" strokeWidth={1.5} />
                <span className="text-smoke">Visible in navbar</span>
              </div>
              <div className="flex items-center gap-2">
                <EyeOff size={13} className="text-smoke/40" strokeWidth={1.5} />
                <span className="text-smoke/60">Hidden from navbar</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-ink" strokeWidth={1.5} />
                <span className="text-smoke">Category item (auto-dropdown)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating save */}
      {navItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={save} disabled={saving} className="shadow-lg">
            <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
