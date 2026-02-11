"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";

function IconCrosshair(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type GalleryItem = {
  id: string;
  x: number; // world-space px
  y: number; // world-space px
  w: number; // px
  h: number; // px
  rotation: number; // deg
  shade: string; // tailwind class
  date?: string;
  category: string;
  event?: string;
};

// Bigger virtual space to comfortably host 100–200+ items.
const WORLD_SIZE = 8000;
const CAPTION_GAP = 10;
const CAPTION_HEIGHT = 22; // fixed caption height for consistent layout + collision math

const CATEGORIES = [
  "Nature",
  "Portraits",
  "Street",
  "Architecture",
  "Still Life",
  "Abstract",
  "Travel",
  "Night",
  "Minimal",
  "Documentary",
  "Macro",
  "Conceptual",
  "Motion",
  "Landscapes",
] as const;

const EVENTS = [
  "Graduation Day (Ottawa, 2021)",
  "Studio Session Vol. 2",
  "Desert Trip (2022)",
  "Winter Walks",
  "Summer Festival (2023)",
  "Museum Afternoon",
  "City Lights Night",
  "Family Gathering",
] as const;

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

function wrapTranslateWithPeriod(v: number, period: number) {
  // Keep translate in (-period, 0]. period is in *screen pixels* (tile size after scaling).
  const m = ((v % period) + period) % period; // [0, period)
  return m - period; // (-period, 0]
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function createSeededRng(seed: number) {
  // Simple deterministic PRNG (Mulberry32). Great for stable "random" layouts.
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function wrapDeltaOnWorld(delta: number) {
  // Smallest signed delta on a wrapping axis of length WORLD_SIZE.
  return ((delta + WORLD_SIZE / 2) % WORLD_SIZE) - WORLD_SIZE / 2;
}

function wrapDeltaWithPeriod(delta: number, period: number) {
  // Smallest signed delta on a wrapping axis of arbitrary length (period).
  return ((delta + period / 2) % period) - period / 2;
}

function Modal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: GalleryItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Close when clicking outside the modal box.
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white/70">Selected</div>
            <div className="text-lg font-semibold text-white">{item.id}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div
            className={[
              "rounded-2xl border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)]",
              item.shade,
            ].join(" ")}
            style={{
              // Keep preview responsive on small screens.
              width: `min(90vw, ${Math.round(item.w * 1.6)}px)`,
              height: `min(60vh, ${Math.round(item.h * 1.6)}px)`,
              transform: `rotate(${item.rotation}deg)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const worldScaleRef = useRef<HTMLDivElement | null>(null);

  const paperNoiseSvg = useMemo(() => {
    // Monochrome noise tile as an inline SVG (no external assets).
    // IMPORTANT: size chosen to divide WORLD_SIZE so it tiles seamlessly across world repeats.
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix type="matrix" values="
            0 0 0 0 0.55
            0 0 0 0 0.45
            0 0 0 0 0.35
            0 0 0 0.9 0"/>
        </filter>
        <rect width="200" height="200" filter="url(#n)" opacity="0.75"/>
      </svg>
    `.trim();
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, []);

  // Responsive scale:
  // On small screens, we slightly "zoom out" so the world feels less cramped.
  // This is not user zoom; it's a layout adaptation for better mobile UX.
  const [worldScale, setWorldScale] = useState(1);
  const worldScaleRefValue = useRef(1);
  useEffect(() => {
    worldScaleRefValue.current = worldScale;
  }, [worldScale]);

  const [ready, setReady] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [showCenterButton, setShowCenterButton] = useState(false);
  const showCenterButtonRef = useRef(false);
  const centerAnimRef = useRef<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // Smooth movement with rAF: keep "target" and "current" offsets in refs to avoid rerenders.
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });

  // Drag tracking refs.
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const lastPointerTimeRef = useRef(0);
  const movedDistanceRef = useRef(0);
  const suppressClickUntilRef = useRef(0);
  const velocityRef = useRef({ x: 0, y: 0 }); // px/ms
  const isInertiaRef = useRef(false);
  const lastRafTimeRef = useRef<number | null>(null);

  const items = useMemo<GalleryItem[]>(() => {
    const rng = createSeededRng(1337);
    const shades = [
      "bg-red-950",
      "bg-slate-900",
      "bg-neutral-900",
      "bg-stone-500",
      "bg-blue-950",
    ];

    const overlapArea = (a: Pick<GalleryItem, "x" | "y" | "w" | "h">, b: Pick<GalleryItem, "x" | "y" | "w" | "h">) => {
      const x1 = Math.max(a.x, b.x);
      const y1 = Math.max(a.y, b.y);
      const x2 = Math.min(a.x + a.w, b.x + b.w);
      const y2 = Math.min(a.y + a.h, b.y + b.h);
      const iw = Math.max(0, x2 - x1);
      const ih = Math.max(0, y2 - y1);
      return iw * ih;
    };

    // Target: 100–200 items. Keep it deterministic for stable layout.
    const count = 160;
    const margin = 320;
    const list: GalleryItem[] = [];
    // Tracks overlap pairing. If partner[i] !== null, item i is already overlapping one other item.
    // This enforces your rule: no photo can be overlapped by 2 photos, and no overlapping photo can
    // itself be overlapped by someone else (overlap graph is a matching: degree <= 1).
    const partner: Array<number | null> = [];

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const randomDateLabel = () => {
      const year = 2017 + Math.floor(rng() * 10); // 2017–2026
      const month = monthNames[Math.floor(rng() * monthNames.length)] ?? "Jan";
      return `${month} ${year}`;
    };

    for (let i = 0; i < count; i++) {
      // Size mix: mostly small, some medium, a few large (better for dense galleries).
      const r = rng();
      let baseW: number;
      let baseH: number;
      if (r < 0.08) {
        // large
        baseW = Math.round(clamp(520 + rng() * 420, 520, 940));
        baseH = Math.round(clamp(380 + rng() * 340, 380, 720));
      } else if (r < 0.35) {
        // medium
        baseW = Math.round(clamp(300 + rng() * 320, 300, 620));
        baseH = Math.round(clamp(220 + rng() * 260, 220, 480));
      } else {
        // small
        baseW = Math.round(clamp(170 + rng() * 240, 170, 410));
        baseH = Math.round(clamp(130 + rng() * 200, 130, 330));
      }
      const rotation = Math.round((rng() - 0.5) * 10); // subtle organic tilt
      const shade = shades[Math.floor(rng() * shades.length)] ?? "bg-zinc-900";

      // Metadata (deterministic). Some photos may not have date or event.
      const hasDate = rng() < 0.78;
      const hasEvent = rng() < 0.28;
      const date = hasDate ? randomDateLabel() : undefined;
      const category =
        CATEGORIES[Math.floor(rng() * CATEGORIES.length)] ?? "Nature";
      const event = hasEvent
        ? (EVENTS[Math.floor(rng() * EVENTS.length)] ?? "Special Series")
        : undefined;

      // --- Placement logic (strict overlap rules) ---
      // 1) No block covers >10% of another (axis-aligned approximation).
      // 2) A block may overlap with AT MOST one other block.
      // 3) If two blocks overlap, neither is allowed to overlap any other block.
      const maxCoverRatio = 0.1;
      const maxAttempts = 6000;

      // Keep a bit of breathing room around the center title area.
      const centerExclusion = {
        x: WORLD_SIZE / 2 - 650,
        y: WORLD_SIZE / 2 - 220,
        w: 1300,
        h: 440,
      };

      const findPlacement = (w: number, h: number, attempts: number) => {
        const area = w * h;
        const totalH = h + CAPTION_GAP + CAPTION_HEIGHT;
        for (let attempt = 0; attempt < attempts; attempt++) {
          const x = Math.round(margin + rng() * (WORLD_SIZE - margin * 2 - w));
          const y = Math.round(margin + rng() * (WORLD_SIZE - margin * 2 - totalH));

          // Avoid placing directly on top of the center title region.
          const centerOverlap = overlapArea({ x, y, w, h: totalH }, centerExclusion);
          if (centerOverlap > 0) continue;

          let ok = true;
          let overlapIndex: number | null = null;

          const candidateBlock = { x, y, w, h };
          const candidateCaption = {
            x,
            y: y + h + CAPTION_GAP,
            w,
            h: CAPTION_HEIGHT,
          };

          for (let j = 0; j < list.length; j++) {
            const other = list[j]!;
            const otherBlock = { x: other.x, y: other.y, w: other.w, h: other.h };
            const otherCaption = {
              x: other.x,
              y: other.y + other.h + CAPTION_GAP,
              w: other.w,
              h: CAPTION_HEIGHT,
            };

            // Titles must never be covered (by blocks or other titles).
            if (overlapArea(candidateBlock, otherCaption) > 0) {
              ok = false;
              break;
            }
            if (overlapArea(candidateCaption, otherBlock) > 0) {
              ok = false;
              break;
            }
            if (overlapArea(candidateCaption, otherCaption) > 0) {
              ok = false;
              break;
            }

            const inter = overlapArea(candidateBlock, otherBlock);
            if (inter <= 0) continue;

            // Other item already overlaps someone else -> reject (keeps degree <= 1).
            if (partner[j] != null) {
              ok = false;
              break;
            }

            // Candidate may overlap at most one item.
            if (overlapIndex != null && overlapIndex !== j) {
              ok = false;
              break;
            }

            const otherArea = other.w * other.h;
            const coverCandidate = inter / area;
            const coverOther = inter / otherArea;
            if (coverCandidate > maxCoverRatio || coverOther > maxCoverRatio) {
              ok = false;
              break;
            }

            overlapIndex = j;
          }

          if (ok) return { x, y, w, h, overlapIndex };
        }
        return null;
      };

      // Try base size; if hard to place (rare), shrink a bit to keep rules satisfied.
      const shrinkSteps = [1, 0.88, 0.78] as const;
      let placement:
        | { x: number; y: number; w: number; h: number; overlapIndex: number | null }
        | null = null;

      for (const s of shrinkSteps) {
        placement = findPlacement(
          Math.max(120, Math.round(baseW * s)),
          Math.max(90, Math.round(baseH * s)),
          maxAttempts,
        );
        if (placement) break;
      }

      // Final fallback: try a small size (should virtually always succeed without breaking rules).
      if (!placement) {
        placement = findPlacement(180, 140, maxAttempts * 2);
      }

      // If placement still fails (extremely unlikely), skip this item rather than violating rules.
      if (!placement) continue;

      const newIndex = list.length;
      list.push({
        id: `Piece ${newIndex + 1}`,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        rotation,
        shade,
        date,
        category,
        event,
      });
      partner.push(null);

      if (placement.overlapIndex != null) {
        partner[newIndex] = placement.overlapIndex;
        partner[placement.overlapIndex] = newIndex;
      }
    }

    return list;
  }, []);

  useLayoutEffect(() => {
    // Disable page scrollbars (full-screen canvas feel).
    const prevOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const computeScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const base = Math.min(vw, vh);
      // Tuned for phones/tablets: small screens zoom out a bit; large screens stay 1.
      const s = clamp(base / 900, 0.72, 1);
      return s;
    };

    const applyScaleAndMaybeCenter = (opts?: { center?: boolean }) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = computeScale();
      setWorldScale(s);
      worldScaleRefValue.current = s;

      if (worldScaleRef.current) {
        worldScaleRef.current.style.transform = `scale(${s})`;
      }

      const tile = WORLD_SIZE * s;

      if (opts?.center) {
        // Center the world on initial load.
        const initialX = wrapTranslateWithPeriod(vw / 2 - tile / 2, tile);
        const initialY = wrapTranslateWithPeriod(vh / 2 - tile / 2, tile);
        targetOffsetRef.current = { x: initialX, y: initialY };
        currentOffsetRef.current = { x: initialX, y: initialY };
        if (worldRef.current) {
          worldRef.current.style.transform = `translate3d(${initialX}px, ${initialY}px, 0)`;
        }
      } else {
        // If scale changes (resize/orientation), just re-wrap the display space.
        const cur = currentOffsetRef.current;
        const tgt = targetOffsetRef.current;
        currentOffsetRef.current = {
          x: wrapTranslateWithPeriod(cur.x, tile),
          y: wrapTranslateWithPeriod(cur.y, tile),
        };
        targetOffsetRef.current = {
          x: wrapTranslateWithPeriod(tgt.x, tile),
          y: wrapTranslateWithPeriod(tgt.y, tile),
        };
      }
    };

    // Initialize transforms before first paint (prevents the "BAM" shift).
    applyScaleAndMaybeCenter({ center: true });
    // Reveal on next frame so styles are applied, then fade in.
    requestAnimationFrame(() => setReady(true));
    const onResize = () => applyScaleAndMaybeCenter();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const current = currentOffsetRef.current;
      const target = targetOffsetRef.current;
      const v = velocityRef.current;
      const s = worldScaleRefValue.current;
      const tile = WORLD_SIZE * s;

      const now = performance.now();
      const last = lastRafTimeRef.current ?? now;
      const dt = Math.max(1, Math.min(40, now - last)); // ms, clamped for stability
      lastRafTimeRef.current = now;

      // Smooth center animation (used by the "Back to center" button).
      const centerAnim = centerAnimRef.current;
      if (centerAnim) {
        const t = (now - centerAnim.startTime) / centerAnim.duration;
        const clamped = Math.max(0, Math.min(1, t));
        const easeOutCubic = 1 - Math.pow(1 - clamped, 3);
        target.x = centerAnim.startX + (centerAnim.endX - centerAnim.startX) * easeOutCubic;
        target.y = centerAnim.startY + (centerAnim.endY - centerAnim.startY) * easeOutCubic;
        velocityRef.current = { x: 0, y: 0 };
        isInertiaRef.current = false;
        if (clamped >= 1) {
          current.x = target.x;
          current.y = target.y;
          centerAnimRef.current = null;
        }
      }

      // --- Motion model ---
      // Goal: keep the original "nice" feel while dragging (not rigid),
      // but start inertia immediately on release (no pause).
      if (isDragging) {
        // While dragging, do NOT zero velocity here (we track it in pointermove for inertia).
        isInertiaRef.current = false;
      } else if (isInertiaRef.current) {
        target.x += v.x * dt;
        target.y += v.y * dt;

        // Exponential friction: tuned so it glides then stops quickly.
        const decay = Math.exp(-dt * 0.0105);
        v.x *= decay;
        v.y *= decay;

        // Stop threshold (px/ms).
        if (Math.hypot(v.x, v.y) < 0.02) {
          isInertiaRef.current = false;
          v.x = 0;
          v.y = 0;
        }
      }

      // Time-based follow: slightly tighter while dragging, a touch looser while coasting.
      const followSpeed = isDragging ? 0.12 : isInertiaRef.current ? 0.09 : 0.14;
      const alpha = 1 - Math.exp(-dt * followSpeed);
      current.x += (target.x - current.x) * alpha;
      current.y += (target.y - current.y) * alpha;

      // Apply transform without rerendering.
      // --- Infinite wrap logic (seamless) ---
      // We render a 3x3 tiled world and only wrap the *displayed* translate.
      // Because the content repeats every WORLD_SIZE, wrapping becomes visually invisible.
      const displayX = wrapTranslateWithPeriod(current.x, tile);
      const displayY = wrapTranslateWithPeriod(current.y, tile);

      // Show "Back to center" button only when viewport is not near world center.
      // Compute which world coordinate is under the viewport center, then measure wrapped distance.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const viewCenterWorldX = ((vw / 2 - displayX) / s + WORLD_SIZE * 10) % WORLD_SIZE;
      const viewCenterWorldY = ((vh / 2 - displayY) / s + WORLD_SIZE * 10) % WORLD_SIZE;
      const dxWorld = wrapDeltaOnWorld(viewCenterWorldX - WORLD_SIZE / 2);
      const dyWorld = wrapDeltaOnWorld(viewCenterWorldY - WORLD_SIZE / 2);
      const distScreen = Math.hypot(dxWorld * s, dyWorld * s);
      const nextShow = distScreen > 240;
      if (nextShow !== showCenterButtonRef.current) {
        showCenterButtonRef.current = nextShow;
        setShowCenterButton(nextShow);
      }

      // Optional: keep numbers bounded over very long sessions.
      // This is invisible because we only use wrapped values for rendering.
      if (Math.abs(current.x) > 10_000_000 || Math.abs(current.y) > 10_000_000) {
        current.x = displayX;
        current.y = displayY;
        targetOffsetRef.current = { x: displayX, y: displayY };
      }

      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${displayX}px, ${displayY}px, 0)`;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isDragging]);

  const endDrag = () => {
    activePointerIdRef.current = null;
    setIsDragging(false);
    document.body.style.userSelect = "";
  };

  const scrollToCenter = () => {
    const s = worldScaleRefValue.current;
    const tile = WORLD_SIZE * s;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const desiredX0 = wrapTranslateWithPeriod(vw / 2 - (WORLD_SIZE / 2) * s, tile);
    const desiredY0 = wrapTranslateWithPeriod(vh / 2 - (WORLD_SIZE / 2) * s, tile);

    // Choose the shortest wrapped path to center (prevents long "around the world" pans).
    const curX = wrapTranslateWithPeriod(currentOffsetRef.current.x, tile);
    const curY = wrapTranslateWithPeriod(currentOffsetRef.current.y, tile);
    currentOffsetRef.current = { x: curX, y: curY };
    targetOffsetRef.current = { x: curX, y: curY };

    const dx = wrapDeltaWithPeriod(desiredX0 - curX, tile);
    const dy = wrapDeltaWithPeriod(desiredY0 - curY, tile);

    velocityRef.current = { x: 0, y: 0 };
    isInertiaRef.current = false;
    centerAnimRef.current = {
      startX: curX,
      startY: curY,
      endX: curX + dx,
      endY: curY + dy,
      startTime: performance.now(),
      duration: 650,
    };
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {showCenterButton ? (
          <motion.button
            key="back-to-center"
            type="button"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            className={[
              "pointer-events-auto fixed z-50",
              "right-4 sm:right-5",
              // desktop: bottom-right; mobile: top-right
              "top-4 sm:top-auto sm:bottom-5",
              "rounded-full border border-orange-950/20 bg-red-50/80 px-4 py-2.5",
              "text-sm font-semibold tracking-wide text-orange-950",
              "shadow-[0_12px_40px_rgba(0,0,0,0.20)] backdrop-blur-sm",
              "hover:bg-orange-950/10",
              "whitespace-nowrap select-none",
            ].join(" ")}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              scrollToCenter();
            }}
            aria-label="Back to center"
          >
            <span className="inline-flex items-center gap-2 pt-0.5">
              <IconCrosshair className="h-5 w-5" />
              <span className="sm:hidden">Center</span>
              <span className="hidden sm:inline">Back to center</span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div
        ref={viewportRef}
        className={[
          "fixed inset-0 overflow-hidden bg-red-50",
          "touch-none", // prevent native panning/scroll
          isDragging ? "cursor-grabbing" : "cursor-grab",
          "select-none",
          // Avoid showing the wrong position on first paint; fade in when ready.
          ready ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-500 ease-out",
        ].join(" ")}
        onPointerDown={(e) => {
          // --- Drag logic (pointer events; desktop + mobile) ---
          if (e.button !== 0 && e.pointerType === "mouse") return;
          activePointerIdRef.current = e.pointerId;
          lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
          lastPointerTimeRef.current = performance.now();
          lastRafTimeRef.current = null;
          velocityRef.current = { x: 0, y: 0 };
          isInertiaRef.current = false;
          movedDistanceRef.current = 0;
          setIsDragging(true);
          document.body.style.userSelect = "none";

          // Capture pointer so we keep receiving moves outside the viewport.
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const activeId = activePointerIdRef.current;
          if (activeId == null || e.pointerId !== activeId) return;

          const last = lastPointerPosRef.current;
          const dx = e.clientX - last.x;
          const dy = e.clientY - last.y;
          lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

          movedDistanceRef.current += Math.hypot(dx, dy);

          const target = targetOffsetRef.current;
          const now = performance.now();
          const dt = Math.max(4, now - lastPointerTimeRef.current); // ms
          lastPointerTimeRef.current = now;

          // Move the world with the pointer.
          // Note: we do NOT wrap here. Wrapping is done only when rendering, which
          // becomes seamless thanks to the tiled world.
          targetOffsetRef.current = { x: target.x + dx, y: target.y + dy };

          // Track drag velocity for inertia (px/ms), smoothed to avoid jitter.
          const instVx = dx / dt;
          const instVy = dy / dt;
          const v = velocityRef.current;
          v.x = v.x * 0.82 + instVx * 0.18;
          v.y = v.y * 0.82 + instVy * 0.18;

          e.preventDefault();
        }}
        onPointerUp={(e) => {
          const activeId = activePointerIdRef.current;
          if (activeId == null || e.pointerId !== activeId) return;

          // If we moved meaningfully, suppress click-open that might occur on blocks.
          if (movedDistanceRef.current > 6) {
            suppressClickUntilRef.current = performance.now() + 140;
          }

          // Start inertia if this was a real drag (not a tap).
          const v = velocityRef.current;
          const speed = Math.hypot(v.x, v.y);
          // Clamp insane speeds (rare, but can happen with event batching).
          const maxSpeed = 2.2; // px/ms (~2200px/s)
          if (speed > maxSpeed) {
            const k = maxSpeed / speed;
            v.x *= k;
            v.y *= k;
          }
          isInertiaRef.current = movedDistanceRef.current > 10 && speed > 0.04;

          try {
            (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
          } catch {
            // no-op
          }
          endDrag();
        }}
        onPointerCancel={() => endDrag()}
        onPointerLeave={() => {
          // If user drags out of the viewport and releases elsewhere, pointer capture still handles it.
          // This is just a safety net.
        }}
      >
        {/* World: larger-than-viewport virtual space */}
        <div
          ref={worldRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: "translate3d(0,0,0)",
          }}
        >
          <div
            ref={worldScaleRef}
            className="absolute left-0 top-0"
            style={{
              width: WORLD_SIZE * 3,
              height: WORLD_SIZE * 3,
              transformOrigin: "0 0",
              transform: `scale(${worldScale})`,
            }}
          >
            {/* 3x3 tiled world for seamless looping */}
            {([-1, 0, 1] as const).flatMap((ty) =>
              ([-1, 0, 1] as const).map((tx) => (
                <div
                  key={`${tx},${ty}`}
                  className="absolute left-0 top-0"
                  style={{
                    width: WORLD_SIZE,
                    height: WORLD_SIZE,
                    transform: `translate3d(${tx * WORLD_SIZE}px, ${ty * WORLD_SIZE}px, 0)`,
                  }}
                >
                  {/* Paper texture is part of the world (moves with drag + wraps seamlessly) */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: [
                        // subtle paper fibers
                        // Spacing chosen to divide WORLD_SIZE so patterns align at tile edges.
                        "repeating-linear-gradient(0deg, rgba(0,0,0,0.030) 0px, rgba(0,0,0,0.030) 1px, rgba(255,255,255,0.00) 2px, rgba(255,255,255,0.00) 8px)",
                        "repeating-linear-gradient(90deg, rgba(0,0,0,0.018) 0px, rgba(0,0,0,0.018) 1px, rgba(255,255,255,0.00) 2px, rgba(255,255,255,0.00) 10px)",
                        // fine grain/noise tile
                        paperNoiseSvg,
                      ].join(", "),
                      backgroundRepeat: "repeat, repeat, repeat",
                      backgroundSize: "auto, auto, 200px 200px",
                      backgroundBlendMode: "multiply",
                      opacity: 0.35,
                      mixBlendMode: "multiply",
                    }}
                  />

                  {/* Organic, scattered blocks (absolute positioning only) */}
                  {items.map((it) => (
                    <div
                      key={`${tx},${ty}:${it.id}`}
                      className="absolute"
                      style={{
                        left: it.x,
                        top: it.y,
                        width: it.w,
                        height: it.h + CAPTION_GAP + CAPTION_HEIGHT,
                      }}
                    >
                      <button
                        type="button"
                        draggable={false}
                        className={[
                          "absolute left-0 top-0 rounded-2xl border border-white/10 shadow-lg",
                          "transition-transform duration-200 ease-out hover:scale-[1.03]",
                          "active:scale-[0.99]",
                          it.shade,
                        ].join(" ")}
                        style={{
                          width: it.w,
                          height: it.h,
                          transform: `rotate(${it.rotation}deg)`,
                        }}
                        onClick={() => {
                          // Avoid opening when the user intended to drag.
                          if (performance.now() < suppressClickUntilRef.current) return;
                          setSelected(it);
                        }}
                        aria-label={`Open ${it.id}`}
                      >
                        <span className="sr-only">{it.id}</span>
                      </button>

                      {/* Title under each photo (fixed font size, dot-separated parts). */}
                      <div
                        className={`${plexMono.className} absolute left-0 text-center text-[11px] font-medium leading-[22px] tracking-[0.12em] text-orange-950/90`}
                        style={{
                          top: it.h + CAPTION_GAP,
                          width: it.w,
                          height: CAPTION_HEIGHT,
                          transform: `rotate(${it.rotation}deg)`,
                          transformOrigin: "50% 0%",
                        }}
                      >
                        <div className="mx-auto w-full overflow-hidden text-ellipsis whitespace-nowrap px-1">
                          {(() => {
                            const parts: React.ReactNode[] = [];

                            if (it.date) {
                              parts.push(
                                <span key="date" className="font-medium">
                                  {it.date}
                                </span>,
                              );
                            }

                            // 2nd part (category) is clickable (future navigation).
                            parts.push(
                              <a
                                key="cat"
                                href={`/#type-${slugify(it.category)}`}
                                onClick={(e) => {
                                  // Placeholder now; you'll wire to real routes later.
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="font-semibold underline-offset-4 hover:underline"
                                aria-label={`Filter by ${it.category}`}
                              >
                                {it.category}
                              </a>,
                            );

                            // 3rd part (event) is optional + clickable if present.
                            if (it.event) {
                              parts.push(
                                <a
                                  key="event"
                                  href={`/#event-${slugify(it.event)}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="font-medium underline-offset-4 hover:underline"
                                  aria-label={`View event ${it.event}`}
                                >
                                  {it.event}
                                </a>,
                              );
                            }

                            return parts.flatMap((node, idx) => {
                              if (idx === 0) return [node];
                              return [
                                <span
                                  key={`dot-${idx}`}
                                  className="mx-2 pb-1 inline-block align-middle text-[15px] leading-0 text-orange-950/60"
                                  aria-hidden="true"
                                >
                                  •
                                </span>,
                                node,
                              ];
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Center text anchored in world-space (not fixed to screen) */}
                  {tx === 0 && ty === 0 ? (
                    <div
                      className="absolute text-center"
                      style={{
                        left: WORLD_SIZE / 2,
                        top: WORLD_SIZE / 2,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div
                        className={`${playfair.className} text-5xl italic font-semibold tracking-tight text-orange-950`}
                      >
                        Alya&apos;s Art Universe
                      </div>
                      <div
                        className={`${playfair.className} mt-3 text-lg italic text-orange-950`}
                      >
                        Drag to explore
                      </div>
                    </div>
                  ) : null}
                </div>
              )),
            )}
          </div>
        </div>

        {/* Subtle vignette for depth 
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            // Less-rounded, smaller center emphasis; darker edges.
            backgroundImage: [
              // edge darkening (more "matte" than a big round vignette)
              "linear-gradient(to bottom, rgba(0,0,0,0.70), rgba(0,0,0,0.00) 38%)",
              "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.00) 40%)",
              "linear-gradient(to right, rgba(0,0,0,0.62), rgba(0,0,0,0.00) 32%)",
              "linear-gradient(to left, rgba(0,0,0,0.62), rgba(0,0,0,0.00) 32%)",
              // subtle center lift (kept smaller so it doesn't reach the center too much)
              "radial-gradient(circle at center, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.00) 26%)",
            ].join(", "),
            backgroundBlendMode: "multiply",
            opacity: 1,
          }}
        />*/}
      </div>

      <Modal
        open={selected != null}
        item={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
