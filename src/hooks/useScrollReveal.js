import { useEffect } from 'react';

// Observes every `.reveal` element below the given root (or document.body)
// and toggles `.in-view` when it enters the viewport. Pair with the
// `.reveal` / `.in-view` CSS in src/index.css.
//
// Usage from a page:
//   useScrollReveal();                       // observes anywhere on the page
//   useScrollReveal(rootRef);                // scope to a ref
//   useScrollReveal(null, [activeTab]);      // re-run when a dep changes (e.g. tab switch)
export function useScrollReveal(rootRef = null, deps = []) {
  useEffect(() => {
    const root =
      rootRef && rootRef.current ? rootRef.current : document;
    const targets = Array.from(root.querySelectorAll('.reveal'));
    if (!targets.length) return undefined;

    // If IntersectionObserver isn't available, just reveal everything immediately.
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('in-view'));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      {
        // Require the element to be more clearly in view before triggering, so the
        // user is actively scrolling when the animation plays. Larger negative
        // bottom margin pushes the trigger line ~18% of the viewport up from the
        // bottom edge — the element has to scroll well past the fold to fire.
        threshold: 0.18,
        rootMargin: '0px 0px -18% 0px',
      }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
