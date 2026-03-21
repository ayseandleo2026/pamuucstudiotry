(() => {
  "use strict";

  import("./assets/js/merchandise/index.js").catch((error) => {
    console.error("Failed to load merchandise script", error);
  });
})();
