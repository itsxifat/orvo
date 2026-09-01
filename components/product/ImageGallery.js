"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Minus, Plus, X } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const DOUBLE_TAP_MS = 300;
const HOVER_ZOOM = 2.1;

/* The frame never grows past what a single screen can show: it is the viewport
   height minus the header and the breathing room around it, capped at 640px and
   floored so short laptops still get a usable image. Width follows from the 4:5
   ratio, so the whole photo is visible without scrolling. */
const FRAME_HEIGHT = "clamp(360px, calc(100svh - var(--header-h) - 140px), 640px)";

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function touchDistance(touches) {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/* Double click and double tap are gestures, not text selection — without this
   the browser paints a blue highlight across whatever sits under the cursor. */
function swallowSelectionDrag(e) {
  if (e.detail > 1) e.preventDefault();
}

export default function ImageGallery({ images = [], name }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const [magnified, setMagnified] = useState(false);

  const stageRef = useRef(null);
  const zoomLayerRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const lensFrameRef = useRef(0);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);
  const swipeRef = useRef(null);

  const displayImages = images.length > 0 ? images : [];
  const src = displayImages[activeIndex];

  /* Panning is bounded by how much of the image actually hangs off the stage,
     so a hard drag can never fling the photo out of view. */
  const clampPan = useCallback((next, scale) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || scale <= MIN_ZOOM) return { x: 0, y: 0 };
    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setInteracting(false);
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

  const openViewer = useCallback((index, nextZoom = MIN_ZOOM) => {
    setActiveIndex(index);
    setViewerOpen(true);
    setZoom(clampZoom(nextZoom));
    setPan({ x: 0, y: 0 });
    setInteracting(false);
    setMagnified(false);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    resetZoom();
  }, [resetZoom]);

  const switchImage = useCallback((i) => {
    setActiveIndex(i);
    resetZoom();
  }, [resetZoom]);

  const moveImage = useCallback((direction) => {
    if (displayImages.length <= 1) return;
    setActiveIndex((current) => (current + direction + displayImages.length) % displayImages.length);
    resetZoom();
  }, [displayImages.length, resetZoom]);

  const zoomBy = useCallback((amount) => {
    setZoom((current) => {
      const next = clampZoom(current + amount);
      setPan((p) => clampPan(p, next));
      return next;
    });
  }, [clampPan]);

  const toggleZoom = useCallback(() => {
    if (zoom > MIN_ZOOM) {
      resetZoom();
      return;
    }
    setZoom(2.5);
  }, [resetZoom, zoom]);

  useEffect(() => {
    if (activeIndex >= displayImages.length) {
      setActiveIndex(0);
      resetZoom();
    }
  }, [activeIndex, displayImages.length, resetZoom]);

  useEffect(() => {
    if (!viewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") moveImage(-1);
      if (e.key === "ArrowRight") moveImage(1);
      if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
      if (e.key === "-") zoomBy(-ZOOM_STEP);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeViewer, moveImage, viewerOpen, zoomBy]);

  /* ── Frame: hover magnifier on pointer devices, swipe on touch ───────────

     The magnifier translates the photo rather than moving its transform-origin.
     Origin is not an animatable property, so shifting it mid-hover teleported
     the image by however far the cursor had travelled between two frames —
     which is what made the old zoom feel like it was twitching under the
     pointer. A translate can be interpolated, so the photo now trails the
     cursor smoothly and settles.

     The mapping is deliberately geared down: the image travels (scale − 1) of
     the cursor's distance, which is exactly enough to reach every edge and
     never enough to expose the frame's empty ground.

     Writes go straight to the node inside a rAF. Routing 60 pointer events a
     second through React state re-rendered the whole gallery for each one. */
  const applyLens = useCallback(() => {
    const layer = zoomLayerRef.current;
    if (!layer) return;
    const { x, y } = pointerRef.current;
    const travel = (HOVER_ZOOM - 1) * 100;
    layer.style.transform =
      `translate3d(${(0.5 - x) * travel}%, ${(0.5 - y) * travel}%, 0) scale(${HOVER_ZOOM})`;
  }, []);

  const handleFramePointerMove = useCallback((e) => {
    if (e.pointerType !== "mouse" || !src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    if (!magnified) setMagnified(true);
    cancelAnimationFrame(lensFrameRef.current);
    lensFrameRef.current = requestAnimationFrame(applyLens);
  }, [applyLens, magnified, src]);

  const handleFramePointerLeave = useCallback(() => {
    cancelAnimationFrame(lensFrameRef.current);
    setMagnified(false);
    const layer = zoomLayerRef.current;
    if (layer) layer.style.transform = "";
  }, []);

  // A new photo starts unmagnified, whatever the last one was showing.
  useEffect(() => {
    const layer = zoomLayerRef.current;
    if (layer) layer.style.transform = "";
    setMagnified(false);
  }, [src]);

  useEffect(() => () => cancelAnimationFrame(lensFrameRef.current), []);

  const handleFrameTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleFrameTouchEnd = useCallback((e) => {
    const started = swipeRef.current;
    swipeRef.current = null;
    if (!started || !e.changedTouches.length) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - started.x;
    const dy = touch.clientY - started.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    e.preventDefault();
    moveImage(dx < 0 ? 1 : -1);
  }, [moveImage]);

  /* ── Viewer stage ───────────────────────────────────────────────────────*/
  const handleViewerWheel = useCallback((e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }, [zoomBy]);

  const handleMouseDown = useCallback((e) => {
    swallowSelectionDrag(e);
    if (zoom <= MIN_ZOOM || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, pan };
    setInteracting(true);
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPan(clampPan({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy }, zoom));
  }, [clampPan, zoom]);

  const stopMousePan = useCallback(() => {
    dragRef.current = null;
    setInteracting(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchRef.current = { distance: touchDistance(e.touches), zoom };
      dragRef.current = null;
      setInteracting(true);
      return;
    }

    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    if (zoom > MIN_ZOOM) {
      dragRef.current = { x: touch.clientX, y: touch.clientY, pan };
      setInteracting(true);
    }
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const nextZoom = clampZoom(
        pinchRef.current.zoom * (touchDistance(e.touches) / pinchRef.current.distance)
      );
      setZoom(nextZoom);
      setPan((p) => clampPan(p, nextZoom));
      return;
    }

    if (e.touches.length !== 1 || !dragRef.current || zoom <= MIN_ZOOM) return;

    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragRef.current.x;
    const dy = touch.clientY - dragRef.current.y;
    setPan(clampPan({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy }, zoom));
  }, [clampPan, zoom]);

  const handleTouchEnd = useCallback((e) => {
    if (pinchRef.current) {
      if (e.touches.length < 2) {
        pinchRef.current = null;
        setInteracting(false);
      }
      return;
    }

    const started = touchStartRef.current;
    touchStartRef.current = null;
    dragRef.current = null;
    setInteracting(false);

    if (!started || !e.changedTouches.length) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - started.x;
    const dy = touch.clientY - started.y;
    const moved = Math.hypot(dx, dy);
    const duration = Date.now() - started.time;

    // At rest, a horizontal flick pages through the set instead of panning.
    if (zoom <= MIN_ZOOM && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
      moveImage(dx < 0 ? 1 : -1);
      return;
    }

    if (moved > 8 || duration > 260) return;

    const now = Date.now();
    if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
      e.preventDefault();
      lastTapRef.current = 0;
      toggleZoom();
      return;
    }
    lastTapRef.current = now;
  }, [moveImage, toggleZoom, zoom]);

  const zoomedIn = zoom > MIN_ZOOM;

  return (
    <div
      className="flex select-none flex-col gap-3 md:flex-row md:items-start md:justify-center md:gap-4"
      style={{ "--frame-h": FRAME_HEIGHT }}
    >
      {/* Thumbnail rail — a column beside the frame on desktop, a strip
          underneath on phones. */}
      {displayImages.length > 1 && (
        <div className="order-2 flex shrink-0 gap-2.5 overflow-x-auto md:order-1 md:h-[var(--frame-h)] md:w-[76px] md:flex-col md:overflow-y-auto md:overflow-x-visible">
          {displayImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => switchImage(i)}
              onMouseDown={swallowSelectionDrag}
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label={`View image ${i + 1}`}
              aria-current={activeIndex === i}
              className={[
                "relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-2xl bg-haze transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink md:h-[95px] md:w-[76px]",
                activeIndex === i
                  ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
                  : "opacity-55 hover:opacity-100",
              ].join(" ")}
            >
              <Image
                src={img}
                alt={`${name} view ${i + 1}`}
                fill
                unoptimized={shouldUnoptimizeImage(img)}
                draggable={false}
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main frame — height is capped to the viewport, width follows the 4:5
          ratio, so the photo always sits fully on screen. */}
      <div className="group relative order-1 mx-auto w-full md:order-2 md:w-auto">
        <button
          type="button"
          disabled={!src}
          onClick={() => src && openViewer(activeIndex)}
          onDoubleClick={() => src && openViewer(activeIndex, HOVER_ZOOM)}
          onMouseDown={swallowSelectionDrag}
          onPointerMove={handleFramePointerMove}
          onPointerLeave={handleFramePointerLeave}
          onTouchStart={handleFrameTouchStart}
          onTouchEnd={handleFrameTouchEnd}
          aria-label={src ? `Open ${name} in full screen` : "No image"}
          className={[
            "relative block aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-haze text-left",
            "md:h-[var(--frame-h)] md:w-auto",
            src ? "cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper" : "cursor-default",
          ].join(" ")}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {src ? (
            <div
              ref={zoomLayerRef}
              className="absolute inset-0 transition-transform duration-base ease-swift"
            >
              <Image
                src={src}
                alt={name}
                fill
                priority
                unoptimized={shouldUnoptimizeImage(src)}
                sizes="(max-width: 768px) 92vw, 520px"
                draggable={false}
                className="pointer-events-none object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-smoke">
              No image
            </div>
          )}

          {displayImages.length > 1 && (
            <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-paper-pure/90 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-ink shadow-soft backdrop-blur">
              {activeIndex + 1} / {displayImages.length}
            </span>
          )}

          {src && (
            <span
              className={`pointer-events-none absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper-pure/90 text-ink shadow-soft backdrop-blur transition-opacity duration-base ease-swift ${
                magnified ? "opacity-0" : "opacity-100"
              }`}
            >
              <Expand size={16} strokeWidth={2.1} />
            </span>
          )}
        </button>

        {/* Arrows sit outside the button so paging never opens the viewer. */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => moveImage(-1)}
              onMouseDown={swallowSelectionDrag}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-pure/90 text-ink shadow-soft backdrop-blur transition-opacity duration-base ease-swift hover:bg-paper-pure md:flex can-hover:opacity-0 can-hover:group-hover:opacity-100"
            >
              <ChevronLeft size={19} strokeWidth={2.1} />
            </button>
            <button
              type="button"
              onClick={() => moveImage(1)}
              onMouseDown={swallowSelectionDrag}
              aria-label="Next image"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-pure/90 text-ink shadow-soft backdrop-blur transition-opacity duration-base ease-swift hover:bg-paper-pure md:flex can-hover:opacity-0 can-hover:group-hover:opacity-100"
            >
              <ChevronRight size={19} strokeWidth={2.1} />
            </button>
          </>
        )}
      </div>

      {viewerOpen && src && (
        <div
          className="fixed inset-0 z-[70] animate-fade-in select-none bg-ink/95 text-paper-pure backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — image viewer`}
        >
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-4 md:px-6">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-paper">{name}</p>
              {displayImages.length > 1 && (
                <p className="text-[12px] tabular-nums text-paper/50">
                  {activeIndex + 1} of {displayImages.length}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.08] p-1 backdrop-blur">
                <button
                  type="button"
                  title="Zoom out"
                  aria-label="Zoom out"
                  onClick={() => zoomBy(-ZOOM_STEP)}
                  disabled={zoom <= MIN_ZOOM}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Minus size={16} strokeWidth={2.1} />
                </button>
                <span className="w-[46px] text-center text-[12.5px] font-semibold tabular-nums text-paper/70">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  title="Zoom in"
                  aria-label="Zoom in"
                  onClick={() => zoomBy(ZOOM_STEP)}
                  disabled={zoom >= MAX_ZOOM}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Plus size={16} strokeWidth={2.1} />
                </button>
              </div>

              <button
                type="button"
                title="Close"
                aria-label="Close gallery"
                onClick={closeViewer}
                className="press flex h-11 w-11 items-center justify-center rounded-full bg-paper-pure text-ink transition-colors duration-fast ease-swift hover:bg-beam"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                title="Previous image"
                aria-label="Previous image"
                onClick={() => moveImage(-1)}
                onMouseDown={swallowSelectionDrag}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-paper backdrop-blur transition-colors hover:bg-white/20 md:left-6"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                type="button"
                title="Next image"
                aria-label="Next image"
                onClick={() => moveImage(1)}
                onMouseDown={swallowSelectionDrag}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-paper backdrop-blur transition-colors hover:bg-white/20 md:right-6"
              >
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </>
          )}

          <div
            ref={stageRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden px-4 pb-28 pt-20 md:px-20 md:pb-32"
            style={{
              touchAction: "none",
              cursor: zoomedIn ? (interacting ? "grabbing" : "grab") : "zoom-in",
            }}
            onClick={(e) => {
              // Clicking the empty ground closes; the image itself does not.
              if (e.target === e.currentTarget && !zoomedIn) closeViewer();
            }}
            onDoubleClick={toggleZoom}
            onWheel={handleViewerWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopMousePan}
            onMouseLeave={stopMousePan}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              className="pointer-events-none relative h-full w-full"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transition: interacting ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform",
              }}
            >
              <Image
                src={src}
                alt={name}
                fill
                priority
                unoptimized={shouldUnoptimizeImage(src)}
                sizes="100vw"
                draggable={false}
                className="pointer-events-none object-contain"
              />
            </div>
          </div>

          {displayImages.length > 1 ? (
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5">
              <div className="flex max-w-full gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    title={`${name} view ${i + 1}`}
                    aria-label={`${name} view ${i + 1}`}
                    onClick={() => switchImage(i)}
                    onMouseDown={swallowSelectionDrag}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    className={[
                      "relative h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-white/10 transition focus:outline-none md:h-16 md:w-[52px]",
                      activeIndex === i
                        ? "opacity-100 ring-2 ring-beam"
                        : "opacity-50 hover:opacity-100",
                    ].join(" ")}
                  >
                    <Image
                      src={img}
                      alt={`${name} view ${i + 1}`}
                      fill
                      unoptimized={shouldUnoptimizeImage(img)}
                      draggable={false}
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="absolute inset-x-0 bottom-6 z-20 text-center text-[12.5px] text-paper/45">
              Double click to zoom · Esc to close
            </p>
          )}
        </div>
      )}
    </div>
  );
}
