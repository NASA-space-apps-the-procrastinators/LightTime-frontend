/** Each line prints at `at` ms; its dots run for DOTS_MS, then the status prints. Timings match `.boot` in globals.css. */
const STEPS = [
  { text: "initializing light time", done: "ok", at: 100 },
  { text: "connecting to the space station", done: "connected", at: 700 },
  { text: "connecting to earth", done: "connected", at: 1300 },
];
const DOTS_MS = 400;
const CURSOR_AT = 1900;

/** Head script: the boot plays once per tab, never for test browsers (they would wait on it), and the class lands before first paint. */
export const BOOT_SCRIPT = `try{if(navigator.webdriver||sessionStorage.getItem("lighttime.booted"))document.documentElement.classList.add("booted");else sessionStorage.setItem("lighttime.booted","1")}catch(e){}`;

/** Server-rendered so it covers the console from the first paint; pure CSS, so it needs no JavaScript to finish. */
export function BootScreen() {
  return (
    <div
      aria-hidden="true"
      className="boot fixed inset-0 z-[100] flex items-center justify-center bg-[#070c18] px-4 font-mono text-xs text-slate-300 sm:text-base"
    >
      <div className="flex flex-col gap-2">
        <p className="mb-2 text-xs tracking-[0.3em] text-slate-500 uppercase">
          Light Time
        </p>
        {STEPS.map((s) => (
          // Prompt and text in two columns, so a line that wraps on a narrow phone stays under its text.
          <p
            key={s.text}
            className="boot-show flex gap-[1ch]"
            style={{ animationDelay: `${s.at}ms` }}
          >
            <span className="text-lime-300">&gt;</span>
            <span>
              {s.text}
              <span
                className="boot-dots"
                style={{
                  animationDelay: `${s.at}ms`,
                  animationDuration: `${DOTS_MS}ms`,
                }}
              >
                ...
              </span>{" "}
              <span
                className="boot-show text-lime-300"
                style={{ animationDelay: `${s.at + DOTS_MS + 100}ms` }}
              >
                {s.done}
              </span>
            </span>
          </p>
        ))}
        <p
          className="boot-show flex gap-[1ch]"
          style={{ animationDelay: `${CURSOR_AT}ms` }}
        >
          <span className="text-lime-300">&gt;</span>
          <span className="boot-cursor">_</span>
        </p>
      </div>
    </div>
  );
}
