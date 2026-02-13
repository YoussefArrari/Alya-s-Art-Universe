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
        <div className="grid grid-cols-1 gap-6  sm:gap-10">
          {/* Portrait column 
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
          </aside>*/}

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

                <h1 className={`${playfair.className} mt-3 text-4xl sm:text-5xl italic font-semibold tracking-tight text-orange-950`}>
                  About Alya
                </h1>

                <div className="mt-6 space-y-5 text-[15px] leading-7 text-orange-950/85">


                  <p>
                    Alya Bouslama (she/her) is an Ottawa-based photographer working across artistic, event, and institutional photography. Born and raised in Tunis, Tunisia, she first picked up a camera by following in her father’s footsteps and quickly turned image-making into a way of understanding the world around her.
                  </p>

                  <p>
                    Her work moves between people, spaces, and landscapes, drawn to light, movement, and the quiet energy of everyday moments. Alongside her artistic practice, she works as an event and campus photographer, documenting formal events, games, and university life.
                  </p>

                  <p>
                    She is completing a Bachelor’s degree in Visual Arts and Communications at the University of Ottawa and continues to explore photography as a way of observing, connecting, and making sense of the world.
                  </p>


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

