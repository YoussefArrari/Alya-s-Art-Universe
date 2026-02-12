"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

type FolderCategory = {
  dir: string; // relative path inside /public/photos, e.g. "Art/Analog photography"
  folder: string; // last segment, e.g. "Analog photography"
  count: number;
};

export function BottomNav() {
  const [navOpen, setNavOpen] = useState(false);
  const [folders, setFolders] = useState<FolderCategory[]>([]);
  const categoriesRootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const isGallery = pathname === "/";
  const isAbout = pathname === "/about";
  const isCategoryPage = pathname.startsWith("/category/");

  useEffect(() => {
    type PhotoRow = { dir?: unknown; folder?: unknown };
    const ac = new AbortController();
    fetch("/api/photos", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const map = new Map<string, FolderCategory>();

        for (const row of data as unknown[]) {
          const r = row as PhotoRow;
          const dir = typeof r.dir === "string" ? r.dir : "";
          if (!dir) continue; // we only want deepest folders that actually contain photos
          const folder =
            typeof r.folder === "string" ? r.folder : dir.split("/").at(-1) ?? dir;
          const prev = map.get(dir);
          map.set(dir, { dir, folder, count: (prev?.count ?? 0) + 1 });
        }

        const list = Array.from(map.values()).sort((a, b) => {
          const byName = a.folder.localeCompare(b.folder);
          if (byName) return byName;
          return a.dir.localeCompare(b.dir);
        });
        setFolders(list);
      })
      .catch(() => {
        // ignore (offline/aborted/etc.)
      });

    return () => ac.abort();
  }, []);

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
                  <IconTag className="h-4 w-4 text-orange-950/60" />
                  <span>CATEGORIES</span>
                </div>
                {folders.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {folders.map((f) => {
                      const href = `/category/${f.dir.split("/").map(encodeURIComponent).join("/")}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={f.dir}
                          href={href}
                          className={[
                            "group flex items-center justify-between gap-3",
                            "rounded-xl px-3 py-2 text-sm text-orange-950/80",
                            "hover:bg-orange-950/10 hover:text-orange-950",
                            isActive ? "bg-orange-950/10 text-orange-950" : "",
                          ].join(" ")}
                          onClick={() => setNavOpen(false)}
                          onPointerDown={(e) => e.stopPropagation()}
                          role="menuitem"
                          aria-label={`${f.folder} (${f.count})`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-950/35" />
                            <span className="min-w-0 truncate">{f.folder}</span>
                            <span className="ml-1 text-xs font-semibold text-orange-950/50">
                              {f.count}
                            </span>
                          </span>
                          <IconChevronRight className="h-4 w-4 shrink-0 text-orange-950/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-orange-950/60">
                    No folders found in <span className="font-semibold">/public/photos</span>.
                  </div>
                )}
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
            className={[
              "whitespace-nowrap rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tracking-wide",
              isGallery ? "bg-orange-950/10 text-orange-950" : "text-orange-950/70 hover:bg-orange-950/10 hover:text-orange-950",
            ].join(" ")}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setNavOpen(false)}
            aria-current={isGallery ? "page" : undefined}
          >
            Gallery
          </Link>

          <Link
            href="/about"
            className={[
              "whitespace-nowrap rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tracking-wide",
              isAbout ? "bg-orange-950/10 text-orange-950" : "text-orange-950/70 hover:bg-orange-950/10 hover:text-orange-950",
            ].join(" ")}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setNavOpen(false)}
            aria-current={isAbout ? "page" : undefined}
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
                isCategoryPage || navOpen
                  ? "bg-orange-950/10 text-orange-950"
                  : "text-orange-950/70 hover:bg-orange-950/10 hover:text-orange-950",
                "inline-flex items-center gap-1.5",
              ].join(" ")}
              onClick={() => setNavOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={navOpen}
              aria-current={isCategoryPage ? "page" : undefined}
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

