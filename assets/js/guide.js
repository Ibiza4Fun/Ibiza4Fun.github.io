/**
 * Guide steps: tap to tick off, progress in the header, ticks remembered.
 *
 * Remembered per page path in localStorage, so putting the phone away and
 * picking it up again does not lose your place. Cleared by the reset button.
 * Storage can throw (private mode, disabled cookies) - when it does, the guide
 * still works, it just forgets.
 */

(function () {
  "use strict";

  const steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  if (steps.length === 0) return;

  const fill = document.getElementById("fill");
  const doneCount = document.getElementById("pdone");
  const total = document.getElementById("ptotal");
  const reset = document.getElementById("reset");
  const key = "guide:" + window.location.pathname;

  function save() {
    try {
      const state = steps.map(function (s) {
        return s.getAttribute("aria-pressed") === "true" ? 1 : 0;
      });
      window.localStorage.setItem(key, state.join(""));
    } catch (err) {
      /* No storage available. The guide still works, it just forgets. */
    }
  }

  function load() {
    let stored = null;
    try {
      stored = window.localStorage.getItem(key);
    } catch (err) {
      return;
    }
    if (!stored || stored.length !== steps.length) return;
    steps.forEach(function (step, i) {
      step.setAttribute("aria-pressed", stored[i] === "1" ? "true" : "false");
    });
  }

  function refresh() {
    const done = steps.filter(function (s) {
      return s.getAttribute("aria-pressed") === "true";
    }).length;
    if (doneCount) doneCount.textContent = String(done);
    if (total) total.textContent = String(steps.length);
    if (fill) fill.style.width = (done / steps.length) * 100 + "%";
  }

  steps.forEach(function (step) {
    step.addEventListener("click", function () {
      const next = step.getAttribute("aria-pressed") === "true" ? "false" : "true";
      step.setAttribute("aria-pressed", next);
      save();
      refresh();
    });
  });

  if (reset) {
    reset.addEventListener("click", function () {
      steps.forEach(function (s) {
        s.setAttribute("aria-pressed", "false");
      });
      save();
      refresh();
    });
  }

  load();
  refresh();
})();
