"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 3v2M17 3v2M4 8h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v12A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5v-12A2.5 2.5 0 0 1 6.5 5z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconTag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 12l9 9 9-9-9-9H7a4 4 0 0 0-4 4v5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

export function BottomNav() {
  const [navOpen, setNavOpen] = useState(false);
  const categoriesRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!navOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const root = categoriesRootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setNavOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex select-none justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        layout
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 46 }}
        className="pointer-events-auto flex w-full max-w-[860px] select-none items-center justify-center gap-2 sm:gap-3"
      >
        {/* Render menu outside the nav pill so nav can move without moving the menu. */}
        <AnimatePresence>
          {navOpen ? (
            <motion.div
              key="categories-menu"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
              className={[
                "pointer-events-auto fixed z-50",
                // Mobile: edge-aware full width with insets.
                "left-3 right-3",
                // Desktop: centered panel with max width.
                "sm:left-1/2 sm:right-auto sm:w-[min(92vw,500px)] sm:-translate-x-1/2",
                // Keep it just above the bottom nav.
                "bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]",
                "rounded-2xl border border-orange-950/20 bg-red-50/95",
                "shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm",
                "ring-1 ring-orange-950/5",
                "overflow-hidden",
              ].join(" ")}
              role="menu"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="ag-thin-scrollbar max-h-[calc(100vh-10rem)] sm:max-h-[65vh] overflow-auto p-2.5 sm:p-3">
                <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold tracking-[0.18em] text-orange-950/70">
                  <IconCalendar className="h-4 w-4 text-orange-950/60" />
                  <span>EVENTS</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {EVENTS.map((ev) => (
                    <a
                      key={ev}
                      href={`/#event-${slugify(ev)}`}
                      className={[
                        "group flex items-center justify-between gap-3",
                        "rounded-xl px-3 py-2 text-sm text-orange-950/80",
                        "hover:bg-orange-950/10 hover:text-orange-950",
                      ].join(" ")}
                      onClick={(e) => {
                        e.preventDefault();
                        setNavOpen(false);
                      }}
                      role="menuitem"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-950/35" />
                        <span className="min-w-0 truncate">{ev}</span>
                      </span>
                      <IconChevronRight className="h-4 w-4 shrink-0 text-orange-950/40 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ))}
                </div>

                <div className="my-3 h-px bg-orange-950/15" />

                <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold tracking-[0.18em] text-orange-950/70">
                  <IconTag className="h-4 w-4 text-orange-950/60" />
                  <span>CATEGORIES</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {CATEGORIES.map((cat) => (
                    <a
                      key={cat}
                      href={`/#type-${slugify(cat)}`}
                      className={[
                        "group flex items-center justify-between gap-3",
                        "rounded-xl px-3 py-2 text-sm text-orange-950/80",
                        "hover:bg-orange-950/10 hover:text-orange-950",
                      ].join(" ")}
                      onClick={(e) => {
                        e.preventDefault();
                        setNavOpen(false);
                      }}
                      role="menuitem"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-950/35" />
                        <span className="min-w-0 truncate">{cat}</span>
                      </span>
                      <IconChevronRight className="h-4 w-4 shrink-0 text-orange-950/40 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.nav
          layout
          className={[
            "relative flex max-w-fit items-center gap-0.5 sm:gap-1 rounded-full border border-orange-950/20",
            "bg-red-50/80 px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-[0_12px_40px_rgba(0,0,0,0.20)] backdrop-blur-sm",
            "select-none",
            "transform-gpu transition-[opacity,transform] duration-200",
            navOpen ? "opacity-90 translate-y-0.5 scale-[0.99]" : "opacity-100 translate-y-0 scale-100",
            navOpen ? "" : "",
          ].join(" ")}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            // Prevent browser text selection while dragging over nav.
            e.preventDefault();
          }}
          aria-label="Site navigation"
        >
          <Link
            href="/"
            className="whitespace-nowrap rounded-full bg-orange-950/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tracking-wide text-orange-950"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setNavOpen(false)}
          >
            Gallery
          </Link>

          <Link
            href="/about"
            className="whitespace-nowrap rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tracking-wide text-orange-950/70 hover:bg-orange-950/10 hover:text-orange-950"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setNavOpen(false)}
          >
            About
          </Link>

          <div
            ref={categoriesRootRef}
            className="relative"
          >
            <button
              type="button"
              className={[
                "whitespace-nowrap rounded-full px-3 sm:px-4 py-1.5 sm:py-2",
                "text-xs sm:text-sm font-semibold tracking-wide",
                "text-orange-950/70 hover:bg-orange-950/10 hover:text-orange-950",
                "inline-flex items-center gap-1.5",
              ].join(" ")}
              onClick={() => setNavOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={navOpen}
            >
              Categories
              <IconChevronDown
                className={[
                  "h-4 w-4 transition-transform duration-200",
                  navOpen ? "rotate-180 text-orange-950" : "text-orange-950/60",
                ].join(" ")}
              />
            </button>
          </div>
        </motion.nav>
      </motion.div>
    </div>
  );
}

