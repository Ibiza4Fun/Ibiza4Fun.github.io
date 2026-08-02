/** Type filter on the index. Nothing is removed from the DOM, only hidden. */

(function () {
  "use strict";

  const chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  const items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  const shown = document.getElementById("shown");
  const empty = document.getElementById("empty");

  if (chips.length === 0 || items.length === 0) return;

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const kind = chip.dataset.kind;

      chips.forEach(function (other) {
        other.setAttribute("aria-pressed", String(other === chip));
      });

      let count = 0;
      items.forEach(function (item) {
        const match = kind === "alle" || item.dataset.kind === kind;
        item.hidden = !match;
        if (match) count++;
      });

      if (shown) shown.textContent = String(count);
      if (empty) empty.hidden = count > 0;
    });
  });
})();
