import { IBM_Plex_Mono, Playfair_Display } from "next/font/google";

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

export default function AboutPage() {
  return (
    <main className="min-h-svh bg-red-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[340px_1fr] sm:gap-10">
          {/* Portrait column */}
          <aside className="relative">
            <div className="rounded-3xl border border-orange-950/15 bg-white/50 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.10)] backdrop-blur-sm">
              <div className="overflow-hidden rounded-2xl border border-orange-950/15 bg-white">
                <img
                  src="/photos/Art/Analog photography/IMG_5897_edited.jpg"
                  alt="Portrait"
                  className="block h-auto w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className={`${plexMono.className} mt-3 text-xs tracking-[0.18em] text-orange-950/70`}>
                PORTFOLIO • ABOUT
              </div>
            </div>
          </aside>

          {/* Letter column */}
          <section className="relative">
            <div
              className={[
                "relative overflow-hidden rounded-3xl border border-orange-950/15 bg-white/60",
                "shadow-[0_30px_90px_rgba(0,0,0,0.12)] backdrop-blur-sm",
              ].join(" ")}
            >
              {/* paper texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: [
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.020) 0px, rgba(0,0,0,0.020) 1px, rgba(255,255,255,0.00) 2px, rgba(255,255,255,0.00) 10px)",
                    "repeating-linear-gradient(90deg, rgba(0,0,0,0.012) 0px, rgba(0,0,0,0.012) 1px, rgba(255,255,255,0.00) 2px, rgba(255,255,255,0.00) 12px)",
                    "radial-gradient(circle at 20% 10%, rgba(255,240,210,0.55) 0%, rgba(255,255,255,0.0) 42%)",
                  ].join(", "),
                }}
              />

              <div className="relative p-6 sm:p-10">
                <div className={`${plexMono.className} text-xs tracking-[0.22em] text-orange-950/70`}>
                  A LETTER FROM
                </div>
                <h1 className={`${playfair.className} mt-3 text-4xl sm:text-5xl italic font-semibold tracking-tight text-orange-950`}>
                  Alya
                </h1>

                <div className="mt-6 space-y-5 text-[15px] leading-7 text-orange-950/85">
                  <p className={`${playfair.className} italic text-lg text-orange-950/80`}>
                    Dear visitor,
                  </p>

                  <p>
                    Welcome to my little universe. I’m <span className="font-semibold">Alya</span>, and this space is my
                    portfolio made to feel like wandering through a drawer of prints, notes, and moments that mattered.
                  </p>

                  <p>
                    I love images that look like they’ve lived a life: soft grain, imperfect edges, and stories hiding in
                    the quiet parts. Sometimes I work in crisp color, sometimes in black and white always chasing a
                    feeling more than a “perfect” frame.
                  </p>

                  <p>
                    If you’re here, take your time. Drag around, open a piece, and let your eyes rest. This gallery is
                    meant to be explored slowly—like reading a letter twice, just to catch what you missed the first time.
                  </p>

                  <div className="pt-2">
                    <p className={`${playfair.className} italic text-lg text-orange-950/80`}>
                      With warmth,
                    </p>
                    <p className={`${playfair.className} mt-1 text-2xl italic font-semibold text-orange-950`}>
                      Alya
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span className={`${plexMono.className} rounded-full border border-orange-950/15 bg-orange-950/5 px-3 py-1 text-xs tracking-[0.18em] text-orange-950/70`}>
                    PHOTOGRAPHY
                  </span>
                  <span className={`${plexMono.className} rounded-full border border-orange-950/15 bg-orange-950/5 px-3 py-1 text-xs tracking-[0.18em] text-orange-950/70`}>
                    ART DIRECTION
                  </span>
                  <span className={`${plexMono.className} rounded-full border border-orange-950/15 bg-orange-950/5 px-3 py-1 text-xs tracking-[0.18em] text-orange-950/70`}>
                    VISUAL STORIES
                  </span>
                </div>
              </div>
            </div>

            {/* small “ink stain” */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-950/10 blur-2xl" />
          </section>
        </div>
      </div>
    </main>
  );
}

