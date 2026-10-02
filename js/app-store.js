// App Store release switch. Until the app is live there's no App Store page to link to,
// so App Store links become "Coming soon" labels and availability copy is swapped.
// Launch day: set APP_RELEASED to true.
const APP_RELEASED = false;

// Markup hooks, used only while unreleased:
//   data-coming-soon="text"  replaces the element's text
//                            (App Store links without it read "Coming soon to the App Store")
function applyReleaseState() {
  if (APP_RELEASED) return;

  document.querySelectorAll('[data-coming-soon]').forEach((element) => {
    element.textContent = element.dataset.comingSoon;
  });

  document.querySelectorAll('a[href*="apps.apple.com"]').forEach((link) => {
    link.removeAttribute('href');
    link.classList.add('is-coming-soon');
    link.style.pointerEvents = 'none';
    link.style.cursor = 'default';
    if (link.dataset.comingSoon === undefined) link.textContent = 'Coming soon to the App Store';
  });
}

// The header arrives through includes.js, so wait for it before rewriting links.
document.addEventListener('includes-loaded', applyReleaseState);
