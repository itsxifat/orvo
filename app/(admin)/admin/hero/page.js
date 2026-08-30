"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Trash2, Plus, MoveUp, MoveDown, Upload, Monitor, Smartphone, ImageOff, LayoutGrid,
} from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";
import { PageHeader, Button } from "@/components/admin/ui";

const MAX_BANNERS = 3;

// What the storefront grid expects for each banner count. The slot ratio always
// matches the artwork ratio, which is what stops banners from being cropped —
// so these numbers are the contract, not a suggestion.
const SPEC = {
  1: {
    layout: "One full-width banner",
    desktop: { w: 2400, h: 1000, label: "2400 × 1000", ratio: "12 / 5", css: "2.4 / 1" },
  },
  2: {
    layout: "Two side by side",
    desktop: { w: 1200, h: 1000, label: "1200 × 1000", ratio: "6 / 5", css: "1.2 / 1" },
  },
  3: {
    layout: "Three across",
    desktop: { w: 800, h: 1000, label: "800 × 1000", ratio: "4 / 5", css: "0.8 / 1" },
  },
};

const MOBILE_SPEC = { label: "1080 × 1350", ratio: "4 / 5", css: "0.8 / 1" };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Serialize for dirty-checking, ignoring the client-only _uid.
const serialize = (arr) => JSON.stringify(arr.map(({ _uid, ...b }) => b));

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

function deleteFromCDN(url) {
  return fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => {});
}

// The preview box is held at the exact ratio the storefront will use, so what
// staff see here is what visitors get — including any bad crop.
function ImageUploadZone({ url, preview, aspect, sizes, onSelect, onClear }) {
  const fileRef = useRef(null);
  const src = preview || url;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-smoke/25 bg-paper/40 w-full"
      style={{ aspectRatio: aspect }}
    >
      {src ? (
        <>
          {preview ? (
            // Local, not-yet-uploaded file — plain <img> (blob URL).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Image src={url} alt="" fill sizes={sizes} className="object-cover" unoptimized={shouldUnoptimizeImage(url)} />
          )}

          {preview && (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-signal text-white text-[11px] font-semibold px-2.5 py-1">
              Not saved
            </span>
          )}

          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/0 group-hover:bg-ink/55 transition-colors">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-white/95 text-ink px-4 py-2 text-[12.5px] font-semibold hover:bg-white transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="rounded-full bg-signal text-white px-4 py-2 text-[12.5px] font-semibold hover:bg-signal-dark transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 text-smoke hover:text-ink hover:bg-paper/70 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-haze flex items-center justify-center">
            <Upload size={17} strokeWidth={2} />
          </span>
          <span className="text-[12.5px] font-medium">Upload</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function AdminHeroPage() {
  const [banners, setBanners] = useState([]);
  const [pending, setPending] = useState({}); // `${_uid}_${type}` -> { file, preview }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savedSnapshot = useRef("[]");
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    fetch("/api/admin/hero")
      .then((r) => r.json())
      .then((data) => {
        const arr = (data.heroBanners || []).slice(0, MAX_BANNERS).map((b) => ({
          _uid: uid(),
          imageDesktop: b.imageDesktop || "",
          imageMobile: b.imageMobile || "",
          href: b.href || "/",
          alt: b.alt || "",
        }));
        setBanners(arr);
        savedSnapshot.current = serialize(arr);
      })
      .catch(() => toast.error("Failed to load banners"))
      .finally(() => setLoading(false));
    // Revoke any leftover preview URLs when leaving the page.
    return () => Object.values(pendingRef.current).forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  const dirty = serialize(banners) !== savedSnapshot.current || Object.keys(pending).length > 0;
  const fieldOf = (type) => (type === "desktop" ? "imageDesktop" : "imageMobile");
  const spec = SPEC[Math.min(Math.max(banners.length, 1), MAX_BANNERS)];

  const addBanner = () => {
    if (banners.length >= MAX_BANNERS) return;
    setBanners((prev) => [
      ...prev,
      { _uid: uid(), imageDesktop: "", imageMobile: "", href: "/", alt: "" },
    ]);
  };

  const removeBanner = (i) => {
    const b = banners[i];
    if (
      (b.imageDesktop || b.imageMobile) &&
      !window.confirm("Remove this banner? Its saved images are deleted from the CDN when you save.")
    ) return;
    ["desktop", "mobile"].forEach((t) => {
      const p = pending[`${b._uid}_${t}`];
      if (p) URL.revokeObjectURL(p.preview);
    });
    setPending((prev) => {
      const next = { ...prev };
      delete next[`${b._uid}_desktop`];
      delete next[`${b._uid}_mobile`];
      return next;
    });
    setBanners((prev) => prev.filter((_, idx) => idx !== i));
  };

  const moveBanner = (i, dir) => {
    setBanners((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const updateBanner = (i, field, value) => {
    setBanners((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  };

  // Stage a file locally — does NOT touch the CDN until Save.
  const selectImage = (bannerUid, type, file) => {
    const preview = URL.createObjectURL(file);
    setPending((prev) => {
      const key = `${bannerUid}_${type}`;
      if (prev[key]) URL.revokeObjectURL(prev[key].preview);
      return { ...prev, [key]: { file, preview } };
    });
  };

  const clearImage = (bannerUid, type) => {
    const key = `${bannerUid}_${type}`;
    if (pending[key]) URL.revokeObjectURL(pending[key].preview);
    setPending((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // Clear any saved URL too; the server diff deletes it from the CDN on save.
    setBanners((prev) => prev.map((b) => (b._uid === bannerUid ? { ...b, [fieldOf(type)]: "" } : b)));
  };

  const save = async () => {
    setSaving(true);
    const uploadedThisSave = []; // for rollback if the save fails
    try {
      // 1. Upload every staged file now.
      const urlByKey = {};
      for (const [key, { file }] of Object.entries(pending)) {
        const url = await uploadFile(file);
        uploadedThisSave.push(url);
        urlByKey[key] = url;
      }

      // 2. Build the final banners using freshly-uploaded URLs where present.
      const merged = banners.map((b) => ({
        _uid: b._uid,
        imageDesktop: urlByKey[`${b._uid}_desktop`] ?? b.imageDesktop,
        imageMobile: urlByKey[`${b._uid}_mobile`] ?? b.imageMobile,
        href: b.href || "/",
        alt: b.alt?.trim() || "",
      }));

      // 3. Persist (the route deletes any images this replaced/removed).
      const res = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroBanners: merged.map(({ _uid, ...b }) => b) }),
      });
      if (!res.ok) throw new Error("save failed");

      Object.values(pending).forEach((p) => URL.revokeObjectURL(p.preview));
      setPending({});
      setBanners(merged);
      savedSnapshot.current = serialize(merged);
      toast.success("Banners saved");
    } catch {
      // Roll back anything uploaded during this failed attempt — no orphans.
      await Promise.all(uploadedThisSave.map((url) => deleteFromCDN(url)));
      toast.error("Failed to save — no changes were kept");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-smoke py-10">Loading…</div>;

  return (
    <div className="max-w-5xl">
      <PageHeader
        icon={LayoutGrid}
        title="Hero Banners"
        subtitle={`Up to ${MAX_BANNERS} banners across the top of the homepage · ${banners.length} in use`}
        actions={
          <>
            {dirty && (
              <span className="text-[12.5px] font-medium text-signal flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                Unsaved changes
              </span>
            )}
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </>
        }
      />

      {/* ── The size contract ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-smoke/15 p-5 mb-6">
        <p className="text-[15px] font-semibold text-ink">
          Artwork sizes for {banners.length || 1} banner{(banners.length || 1) > 1 ? "s" : ""} — {spec.layout}
        </p>
        <p className="text-[13px] text-smoke mt-1 leading-relaxed">
          Each slot is held at exactly the ratio below, so a correctly sized file is never cropped on
          any screen. Upload a different size and the preview here shows you the crop before you save.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-paper/60 px-4 py-3">
            <p className="text-[12px] text-smoke flex items-center gap-1.5">
              <Monitor size={13} strokeWidth={2} /> Desktop &amp; wide screens
            </p>
            <p className="text-[17px] font-bold text-ink tabular-nums mt-1">{spec.desktop.label}</p>
            <p className="text-[12px] text-smoke">ratio {spec.desktop.ratio}</p>
          </div>
          <div className="rounded-xl bg-paper/60 px-4 py-3">
            <p className="text-[12px] text-smoke flex items-center gap-1.5">
              <Smartphone size={13} strokeWidth={2} /> Mobile
            </p>
            <p className="text-[17px] font-bold text-ink tabular-nums mt-1">{MOBILE_SPEC.label}</p>
            <p className="text-[12px] text-smoke">ratio {MOBILE_SPEC.ratio} · same for any count</p>
          </div>
        </div>

        <p className="text-[12.5px] text-smoke mt-4 leading-relaxed">
          Every desktop file is <b className="text-ink">1000 px tall</b> — only the width changes with
          the count, which is what keeps the hero the same height whether you run one banner or three.
          Keep logos and text inside the middle <b className="text-ink">90%</b> so nothing sits tight
          against an edge. JPEG or WebP, under 500&nbsp;KB.
        </p>
      </div>

      {/* ── Banners ───────────────────────────────────────────────────────── */}
      {banners.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-smoke/30 px-6 py-14 text-center">
          <ImageOff size={30} className="text-smoke/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-ink">No banners yet</p>
          <p className="text-[13.5px] text-smoke mt-1">
            The homepage is showing its built-in fallback. Add a banner below, then save.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {banners.map((banner, i) => (
            <div key={banner._uid} className="rounded-2xl bg-white border border-smoke/15 shadow-[0_1px_3px_rgba(16,17,20,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-smoke/15 bg-paper/40">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-ink text-white text-[12px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-medium text-smoke">
                    {i === 0 ? "Leftmost banner" : i === banners.length - 1 ? "Rightmost banner" : "Middle banner"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveBanner(i, -1)}
                    disabled={i === 0}
                    title="Move earlier"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-smoke hover:bg-haze hover:text-ink disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                  >
                    <MoveUp size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBanner(i, 1)}
                    disabled={i === banners.length - 1}
                    title="Move later"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-smoke hover:bg-haze hover:text-ink disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                  >
                    <MoveDown size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBanner(i)}
                    title="Delete banner"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-smoke hover:bg-signal-soft hover:text-signal transition-colors ml-1"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-smoke mb-2 flex items-center gap-1.5">
                      <Monitor size={13} strokeWidth={2} /> Desktop · {spec.desktop.label}
                    </p>
                    <ImageUploadZone
                      url={banner.imageDesktop}
                      preview={pending[`${banner._uid}_desktop`]?.preview}
                      aspect={spec.desktop.css}
                      sizes="(max-width: 1024px) 100vw, 640px"
                      onSelect={(file) => selectImage(banner._uid, "desktop", file)}
                      onClear={() => clearImage(banner._uid, "desktop")}
                    />
                  </div>

                  <div className="lg:w-44 shrink-0">
                    <p className="text-[12px] text-smoke mb-2 flex items-center gap-1.5">
                      <Smartphone size={13} strokeWidth={2} /> Mobile · {MOBILE_SPEC.label}
                    </p>
                    <ImageUploadZone
                      url={banner.imageMobile}
                      preview={pending[`${banner._uid}_mobile`]?.preview}
                      aspect={MOBILE_SPEC.css}
                      sizes="176px"
                      onSelect={(file) => selectImage(banner._uid, "mobile", file)}
                      onClear={() => clearImage(banner._uid, "mobile")}
                    />
                    <p className="text-[11.5px] text-smoke/70 leading-relaxed mt-2">
                      Optional — falls back to the desktop artwork, which will crop on phones.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-smoke/10">
                  <label className="block">
                    <span className="block text-[13px] font-medium text-ink mb-1.5">
                      Links to
                    </span>
                    <input
                      type="text"
                      value={banner.href || ""}
                      onChange={(e) => updateBanner(i, "href", e.target.value)}
                      placeholder="/shop?category=women"
                      className="w-full rounded-xl border border-smoke/30 bg-transparent px-4 py-2.5 text-[14px] text-ink placeholder:text-smoke/40 focus:outline-none focus:border-ink transition-colors"
                    />
                    <span className="block text-[11.5px] text-smoke/70 mt-1">
                      Leave as “/” to make the banner non-clickable
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-[13px] font-medium text-ink mb-1.5">
                      What it says
                    </span>
                    <input
                      type="text"
                      value={banner.alt || ""}
                      onChange={(e) => updateBanner(i, "alt", e.target.value)}
                      placeholder="Winter sale — up to 30% off"
                      className="w-full rounded-xl border border-smoke/30 bg-transparent px-4 py-2.5 text-[14px] text-ink placeholder:text-smoke/40 focus:outline-none focus:border-ink transition-colors"
                    />
                    <span className="block text-[11.5px] text-smoke/70 mt-1">
                      Read aloud by screen readers and used by Google
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {banners.length < MAX_BANNERS ? (
        <button
          type="button"
          onClick={addBanner}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-smoke/40 py-5 text-[14px] font-medium text-smoke hover:text-ink hover:border-ink hover:bg-paper/50 transition-colors"
        >
          <Plus size={17} strokeWidth={2.2} />
          Add banner
        </button>
      ) : (
        <p className="mt-5 text-center text-[13px] text-smoke">
          Three is the maximum — the homepage grid is built around it.
        </p>
      )}
    </div>
  );
}
