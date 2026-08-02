/**
 * Registers the offline cache.
 *
 * Fails open on purpose: no service worker support, an insecure origin, or a
 * failed registration all leave a perfectly working online page behind. It must
 * never fail silently in a way that looks like success, so the reason is logged.
 */

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) {
    console.info("Offline cache unavailable: no service worker support.");
    return;
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function (err) {
      console.warn("Offline cache not registered:", err && err.message);
    });
  });
})();
