"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { cn, shouldUnoptimizeImage } from "@/lib/utils";

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
// Two taps (or clicks) closer together than this, and this near, are one double tap.
const DOUBLE_MS = 300;
const DOUBLE_PX = 30;
// A press that moves less than this is a tap, not a drag.
const SLOP_PX = 6;
// How far a swipe must travel to change the photo.
const SWIPE_PX = 60;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const RESET = { zoom: 1, x: 0, y: 0 };

/**
 * The full-screen photo viewer. A click (or a double click: the second click of
 * a pair is ignored, so both zoom in once) or a double tap zooms to the point
 * under it and back; a trackpad pinch or ctrl+wheel, a two-finger pinch and the
 * +/− buttons zoom too. Zoomed in, a drag or the wheel moves the photo, kept
 * inside its edges; at full size a swipe changes it. Nothing in the viewer can
 * be selected, so a double click never paints the photo blue.
 */
export default function ImageViewer({ images, index, name, onIndexChange, onClose }) {
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const closeRef = useRef(null);
  const [view, setView] = useState(RESET);
  const [animate, setAnimate] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [sizes, setSizes] = useState({});

  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef({ time: 0, x: 0, y: 0 });

  const count = images.length;
  const src = images[index];

  // The photo's box on the stage at full size (object-contain), for keeping a
  // zoomed photo inside its edges.
  const fit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const img = stage.querySelector("img");
    const natural = sizes[src] || (img?.naturalWidth ? { w: img.naturalWidth, h: img.naturalHeight } : null);
    if (!natural) return { W, H, w: W, h: H };
    const scale = Math.min(W / natural.w, H / natural.h);
    return { W, H, w: natural.w * scale, h: natural.h * scale };
  }, [sizes, src]);

  const bounded = useCallback(
    (next) => {
      const zoom = clamp(next.zoom, 1, MAX_ZOOM);
      if (zoom <= 1) return RESET;
      const f = fit();
      if (!f) return { zoom, x: next.x, y: next.y };
      const maxX = Math.max(0, (f.w * zoom - f.W) / 2);
      const maxY = Math.max(0, (f.h * zoom - f.H) / 2);
      return { zoom, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    },
    [fit]
  );

  // Offset of a screen point from the stage's centre.
  const fromCentre = useCallback((clientX, clientY) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || clientX == null) return { x: 0, y: 0 };
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  }, []);

  // Zoom from `from` to `zoom`, keeping the photo's point under (clientX, clientY) still.
  const zoomAround = useCallback(
    (from, zoom, clientX, clientY) => {
      const p = fromCentre(clientX, clientY);
      const qx = (p.x - from.x) / from.zoom;
      const qy = (p.y - from.y) / from.zoom;
      const z = clamp(zoom, 1, MAX_ZOOM);
      return bounded({ zoom: z, x: p.x - z * qx, y: p.y - z * qy });
    },
    [bounded, fromCentre]
  );

  const zoomBy = useCallback(
    (factor) => {
      setAnimate(true);
      setView((v) => zoomAround(v, v.zoom * factor));
    },
    [zoomAround]
  );

  const toggleAt = useCallback(
    (clientX, clientY) => {
      setAnimate(true);
      setView((v) => (v.zoom > 1 ? RESET : zoomAround(v, TAP_ZOOM, clientX, clientY)));
    },
    [zoomAround]
  );

  const go = useCallback(
    (step) => {
      if (count < 2) return;
      onIndexChange((index + step + count) % count);
    },
    [count, index, onIndexChange]
  );

  // A new photo opens at full size.
  useEffect(() => {
    setAnimate(false);
    setView(RESET);
  }, [index]);

  // A zoom made before the photo had loaded is brought back inside its edges
  // once its size is known; so is any zoom when the window is resized.
  useEffect(() => {
    setView((v) => bounded(v));
  }, [bounded]);
  useEffect(() => {
    const onResize = () => setView((v) => bounded(v));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bounded]);

  // Lock the page behind, focus the close button, and give focus back on close.
  useEffect(() => {
    const before = document.activeElement;
    const html = document.documentElement;
    const previous = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      html.style.overflow = previous.html;
      document.body.style.overflow = previous.body;
      if (before instanceof HTMLElement) before.focus({ preventScroll: true });
    };
  }, []);

  // The keyboard: Escape closes, arrows change the photo, + − 0 zoom, and Tab
  // stays inside the viewer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "+" || e.key === "=") zoomBy(1.5);
      else if (e.key === "-") zoomBy(1 / 1.5);
      else if (e.key === "0") {
        setAnimate(true);
        setView(RESET);
      } else if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll("button:not([disabled])");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, zoomBy]);

  // The wheel needs a non-passive listener to stop the browser zooming the page:
  // a trackpad pinch (ctrl+wheel) zooms, a plain wheel moves a zoomed photo.
  const wheelRef = useRef(null);
  wheelRef.current = (e) => {
    e.preventDefault();
    setAnimate(false);
    if (e.ctrlKey) {
      setView((v) => zoomAround(v, v.zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY));
    } else {
      setView((v) => (v.zoom > 1 ? bounded({ zoom: v.zoom, x: v.x - e.deltaX, y: v.y - e.deltaY }) : v));
    }
  };
  useEffect(() => {
    const stage = stageRef.current;
    const onWheel = (e) => wheelRef.current(e);
    stage?.addEventListener("wheel", onWheel, { passive: false });
    return () => stage?.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnimate(false);
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      const [a, b] = points;
      gesture.current = {
        type: "pinch",
        from: viewRef.current,
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    } else if (points.length === 1) {
      gesture.current = { type: "drag", from: viewRef.current, startX: e.clientX, startY: e.clientY, moved: false };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const zoom = g.from.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.distance);
      // Zoom around where the pinch began, then follow the fingers' midpoint.
      const start = fromCentre(g.centre.x, g.centre.y);
      const now = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const z = clamp(zoom, 1, MAX_ZOOM);
      const qx = (start.x - g.from.x) / g.from.zoom;
      const qy = (start.y - g.from.y) / g.from.zoom;
      setView(bounded({ zoom: z, x: now.x - z * qx, y: now.y - z * qy }));
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > SLOP_PX) {
      g.moved = true;
      setDragging(true);
    }
    if (!g.moved) return;
    if (g.from.zoom > 1) setView(bounded({ zoom: g.from.zoom, x: g.from.x + dx, y: g.from.y + dy }));
    else if (count > 1) setView({ zoom: 1, x: dx, y: 0 });
  };

  const endPointer = (e, cancelled) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    setAnimate(true);
    setDragging(false);

    if (g?.type === "pinch") {
      // One finger still down carries on as a drag from here.
      const rest = [...pointers.current.values()];
      gesture.current = rest.length === 1
        ? { type: "drag", from: viewRef.current, startX: rest[0].x, startY: rest[0].y, moved: true }
        : null;
      if (viewRef.current.zoom < 1.05) setView(RESET);
      return;
    }
    gesture.current = null;
    if (!g || cancelled) {
      if (viewRef.current.zoom <= 1) setView(RESET);
      return;
    }

    if (g.moved) {
      if (g.from.zoom <= 1) {
        const dx = e.clientX - g.startX;
        setView(RESET);
        if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
      }
      return;
    }

    // A tap or a click. The mouse toggles on a click and ignores the second
    // click of a double click; touch toggles on a double tap.
    const now = Date.now();
    const last = lastTap.current;
    const paired = now - last.time < DOUBLE_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_PX;
    if (e.pointerType === "mouse") {
      lastTap.current = paired ? { time: 0, x: 0, y: 0 } : { time: now, x: e.clientX, y: e.clientY };
      if (!paired) toggleAt(e.clientX, e.clientY);
      return;
    }
    if (paired) {
      lastTap.current = { time: 0, x: 0, y: 0 };
      toggleAt(e.clientX, e.clientY);
    } else {
      lastTap.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const zoomed = view.zoom > 1;
  const iconButton =
    "flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-30 disabled:hover:bg-transparent";
  const sideButton =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-smoke/20 bg-white/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 md:flex";

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — photos`}
      className="fixed inset-0 z-[80] flex select-none flex-col bg-paper text-ink animate-fade-in motion-reduce:animate-none"
      style={{ WebkitTouchCallout: "none" }}
    >
      <div className="flex h-14 flex-shrink-0 items-center justify-between gap-3 px-3 sm:px-5">
        <span className="min-w-[3rem] text-[12px] tabular-nums text-ink/70" aria-live="polite">
          {count > 1 ? `${index + 1} / ${count}` : ""}
        </span>
        <span className="hidden text-[12px] text-ink/70 md:block">
          {zoomed ? "Drag to look around · click to zoom out" : "Click the photo to zoom"}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.5)} disabled={!zoomed} className={iconButton}>
            <Minus size={18} strokeWidth={1.6} />
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.5)} disabled={view.zoom >= MAX_ZOOM} className={iconButton}>
            <Plus size={18} strokeWidth={1.6} />
          </button>
          <button ref={closeRef} type="button" aria-label="Close photos" onClick={onClose} className={iconButton}>
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden",
          zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
            transition: animate && !reducedMotion() ? "transform 240ms cubic-bezier(0.2, 0.7, 0.2, 1)" : "none",
            willChange: "transform",
          }}
        >
          <Image
            key={src}
            src={src}
            alt={count > 1 ? `${name} — photo ${index + 1} of ${count}` : name}
            fill
            priority
            sizes="100vw"
            quality={90}
            unoptimized={shouldUnoptimizeImage(src)}
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth) setSizes((s) => ({ ...s, [src]: { w: img.naturalWidth, h: img.naturalHeight } }));
            }}
            className="pointer-events-none object-contain"
          />
        </div>

        {count > 1 && !zoomed && (
          <>
            <button type="button" aria-label="Previous photo" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} className={cn(sideButton, "left-4")}>
              <ChevronLeft size={20} strokeWidth={1.6} />
            </button>
            <button type="button" aria-label="Next photo" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} className={cn(sideButton, "right-4")}>
              <ChevronRight size={20} strokeWidth={1.6} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex flex-shrink-0 justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <div className="flex max-w-full gap-2 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "relative h-16 w-12 flex-shrink-0 overflow-hidden bg-haze transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                  i === index ? "opacity-100 ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-50 hover:opacity-100"
                )}
              >
                <Image src={img} alt="" fill sizes="48px" unoptimized={shouldUnoptimizeImage(img)} draggable={false} className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
