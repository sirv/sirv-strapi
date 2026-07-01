interface SirvGlobal {
  Sirv?: { start?: (el?: Element) => void };
}

const SIRV_JS_URL = 'https://scripts.sirv.com/sirvjs/v3/sirv.js';

/** Injects sirv.js once per document (idempotent). Requires scripts.sirv.com in the admin CSP. */
export function loadSirvJs(): void {
  if (typeof document === 'undefined') return;
  if ((window as unknown as SirvGlobal).Sirv) return;
  if (document.querySelector(`script[src="${SIRV_JS_URL}"]`)) return;
  const script = document.createElement('script');
  script.src = SIRV_JS_URL;
  script.async = true;
  document.head.appendChild(script);
}

/** Calls Sirv.start() once sirv.js is available, to initialize dynamically-added .Sirv nodes. */
export function startSirv(): () => void {
  let tries = 0;
  const id = setInterval(() => {
    const sirv = (window as unknown as SirvGlobal).Sirv;
    if (sirv?.start) {
      try {
        sirv.start();
      } catch {
        // ignore - sirv.js also auto-scans on load
      }
      clearInterval(id);
    } else if (++tries > 60) {
      clearInterval(id);
    }
  }, 150);
  return () => clearInterval(id);
}
