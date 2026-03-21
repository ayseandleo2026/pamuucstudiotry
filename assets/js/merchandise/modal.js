export function createModalController({ body, dom, tools, ui, catalog }) {
  const state = {
    lastFocusedElement: null,
    activeProductId: "",
    editingKey: ""
  };

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll("a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);
  }

  function getProduct() {
    return catalog.getProductById(state.activeProductId);
  }

  function getSelectionFromForm(form, product = getProduct()) {
    if (!form || !product) {
      return null;
    }

    return {
      gsmId: String(form.elements.namedItem("gsm-option")?.value || product.gsmOptions[0]?.id || ""),
      colorId: String(form.elements.namedItem("color-option")?.value || product.colorOptions[0]?.id || ""),
      personalizationMethod: String(form.elements.namedItem("personalization-method")?.value || product.personalizationOptions[0]?.value || ""),
      quantity: Math.max(product.moq, Number.parseInt(form.elements.namedItem("quantity")?.value, 10) || product.moq)
    };
  }

  function formatLineTotal(configuredPrice, quantity) {
    if (!configuredPrice) {
      return ui.priceUnavailable;
    }

    const totalFrom = configuredPrice.from * quantity;
    const totalTo = configuredPrice.to * quantity;
    if (Number(totalFrom) === Number(totalTo)) {
      return tools.formatCurrency(totalFrom);
    }
    return `${tools.formatCurrency(totalFrom)} – ${tools.formatCurrency(totalTo)}`;
  }

  function renderSpec(title, value) {
    if (!value) return "";
    return `<section class="merch-detail-spec"><h3>${tools.escapeHtml(title)}</h3><p>${tools.escapeHtml(value)}</p></section>`;
  }

  function buildOptions(options, selected, labelGetter = (option) => option.label || option.value || option.id) {
    return options.map((option) => {
      const value = option.id || option.value;
      return `<option value="${tools.escapeHtml(value)}"${selected === value ? " selected" : ""}>${tools.escapeHtml(labelGetter(option))}</option>`;
    }).join("");
  }

  function buildMarkup(product, selection, editingKey = "") {
    const safeSelection = { ...catalog.getDefaultSelection(product), ...selection };
    const configuredPrice = catalog.getConfiguredPrice(product, safeSelection);
    const name = tools.localize(product.displayName);
    const sizeSummary = product.sizesList.length ? product.sizesList.join(" · ") : ui.sizesOnRequest;
    const composition = product.compositionDisplay || ui.compositionOnRequest;
    const packages = product.packagingOptionsList.length
      ? product.packagingOptionsList.slice(0, 3).map((item) => `<span class="spec-chip">${tools.escapeHtml(item)}</span>`).join("")
      : `<span class="spec-chip">${tools.escapeHtml(ui.packagingOnRequest)}</span>`;
    const methods = product.personalizationOptions.map((option) => `<span class="merch-method-pill">${tools.escapeHtml(tools.getMethodLabel(option.value))}</span>`).join("");

    return `
      <article class="modal-article merch-detail-article">
        <p class="modal-kicker">${tools.escapeHtml(ui.detailKicker)}</p>
        <div class="merch-detail-layout">
          <div class="merch-detail-visual">
            ${catalog.renderMedia(product, "detail")}
            <div class="merch-detail-swatch-panel" data-detail-swatches>
              <h3>${tools.escapeHtml(ui.colors)}</h3>
              ${catalog.renderSwatches(product, safeSelection.colorId)}
            </div>
          </div>
          <div class="merch-detail-copy">
            <p class="project-tag">${tools.escapeHtml(tools.getCategoryLabel(product.displayCategoryKey))}</p>
            <h2>${tools.escapeHtml(name)}</h2>
            <p class="modal-intro">${tools.escapeHtml(tools.localize(product.shortDescription))}</p>
            <div class="merch-detail-price-box">
              <span>${tools.escapeHtml(ui.priceRange)}</span>
              <strong data-configured-price>${tools.escapeHtml(catalog.formatConfiguredPrice(configuredPrice))}</strong>
              <p data-configured-note>${tools.escapeHtml(ui.priceBasedOnSelection)}</p>
            </div>
            <p class="merch-detail-body">${tools.escapeHtml(tools.localize(product.fullDescription))}</p>
            <div class="merch-detail-spec-grid">
              ${renderSpec(ui.moq, String(product.moq))}
              ${renderSpec(ui.leadTime, tools.localize(product.leadTimeShort))}
              ${renderSpec(ui.sizes, sizeSummary)}
              ${renderSpec(ui.composition, composition)}
            </div>
            <div class="merch-detail-clusters">
              <section>
                <h3>${tools.escapeHtml(ui.personalization)}</h3>
                <div class="merch-method-row">${methods}</div>
              </section>
              <section>
                <h3>${tools.escapeHtml(ui.packaging)}</h3>
                <div class="spec-chip-row">${packages}</div>
              </section>
            </div>
            <form class="merch-detail-form" data-merch-detail-form data-product-id="${tools.escapeHtml(product.id)}"${editingKey ? ` data-basket-key="${tools.escapeHtml(editingKey)}"` : ""}>
              <label class="form-field">
                <span>${tools.escapeHtml(ui.gsm)}</span>
                <select name="gsm-option">${buildOptions(product.gsmOptions, safeSelection.gsmId, (option) => option.label)}</select>
              </label>
              <label class="form-field">
                <span>${tools.escapeHtml(ui.color)}</span>
                <select name="color-option">${buildOptions(product.colorOptions, safeSelection.colorId, (option) => option.label)}</select>
              </label>
              <label class="form-field">
                <span>${tools.escapeHtml(ui.personalization)}</span>
                <select name="personalization-method">${buildOptions(product.personalizationOptions, safeSelection.personalizationMethod, (option) => tools.getMethodLabel(option.value))}</select>
              </label>
              <label class="form-field">
                <span>${tools.escapeHtml(ui.quantity)}</span>
                <input min="${tools.escapeHtml(String(product.moq))}" name="quantity" step="1" type="number" value="${tools.escapeHtml(String(safeSelection.quantity || product.moq))}"/>
              </label>
              <div class="merch-detail-form-footer">
                <div class="merch-detail-total">
                  <span>${tools.escapeHtml(ui.lineEstimate)}</span>
                  <strong data-line-total>${tools.escapeHtml(formatLineTotal(configuredPrice, safeSelection.quantity || product.moq))}</strong>
                </div>
                <button class="button button-primary" type="submit">${tools.escapeHtml(editingKey ? ui.updateLine : ui.detailAdd)}</button>
              </div>
            </form>
          </div>
        </div>
      </article>
    `;
  }

  function syncConfiguredState(form) {
    const product = getProduct();
    if (!form || !product) {
      return;
    }

    const selection = getSelectionFromForm(form, product);
    const configuredPrice = catalog.getConfiguredPrice(product, selection);
    const priceNode = form.closest(".merch-detail-copy")?.querySelector("[data-configured-price]");
    const lineNode = form.querySelector("[data-line-total]");
    const swatchNode = form.closest(".merch-detail-layout")?.querySelector("[data-detail-swatches]");

    if (priceNode) {
      priceNode.textContent = catalog.formatConfiguredPrice(configuredPrice);
    }
    if (lineNode) {
      lineNode.textContent = formatLineTotal(configuredPrice, selection.quantity);
    }
    if (swatchNode) {
      swatchNode.innerHTML = `<h3>${tools.escapeHtml(ui.colors)}</h3>${catalog.renderSwatches(product, selection.colorId)}`;
    }
  }

  function open(product, trigger, selection = null, editingKey = "") {
    if (!product || !dom.detailModal || !dom.detailContent) return;
    state.activeProductId = product.id;
    state.editingKey = editingKey;
    dom.detailContent.innerHTML = buildMarkup(product, selection || product.defaultSelection, editingKey);
    dom.detailModal.classList.add("is-open");
    dom.detailModal.setAttribute("aria-hidden", "false");
    body.classList.add("modal-open");
    state.lastFocusedElement = trigger || document.activeElement;
    const focusable = getFocusableElements(dom.detailPanel || dom.detailModal);
    if (focusable.length) {
      focusable[0].focus({ preventScroll: true });
    }
  }

  function close() {
    if (!dom.detailModal || !dom.detailContent) return;
    dom.detailModal.classList.remove("is-open");
    dom.detailModal.setAttribute("aria-hidden", "true");
    dom.detailContent.replaceChildren();
    body.classList.remove("modal-open");
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus({ preventScroll: true });
    }
    state.lastFocusedElement = null;
    state.activeProductId = "";
    state.editingKey = "";
  }

  function switchGallery(product, nextIndex) {
    if (!dom.detailContent || !product) return;
    const image = product.galleryImages[nextIndex];
    if (!image) return;
    const stage = dom.detailContent.querySelector("[data-gallery-stage]");
    if (stage) {
      stage.innerHTML = `<img alt="${tools.escapeHtml(tools.localize(product.displayName))}" class="merch-detail-image" src="${tools.escapeHtml(tools.resolvePath(image))}"/>`;
    }
    dom.detailContent.querySelectorAll("[data-gallery-thumb]").forEach((thumb) => {
      const active = Number.parseInt(thumb.getAttribute("data-gallery-thumb"), 10) === nextIndex;
      thumb.classList.toggle("is-active", active);
      thumb.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function trapTab(event) {
    if (!dom.detailModal || !dom.detailModal.classList.contains("is-open") || event.key !== "Tab") {
      return;
    }
    const focusable = getFocusableElements(dom.detailPanel || dom.detailModal);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    open,
    close,
    switchGallery,
    trapTab,
    syncConfiguredState,
    getSelectionFromForm,
    getEditingKey() {
      return state.editingKey;
    }
  };
}
