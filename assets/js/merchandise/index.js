import { createBasketController } from "./basket.js";
import { createCatalogController } from "./catalog.js";
import { loadProductRows } from "./data.js";
import { createLocaleTools } from "./utils.js";
import { createFilterState, hasActiveFilters, resetFilters } from "./filters.js";
import { createModalController } from "./modal.js";
import { createMerchFormController } from "./form.js";

function createDomMap() {
  return {
    body: document.body,
    filterShell: document.querySelector(".merch-filter-shell"),
    resultsCount: document.querySelector("#merch-results-count"),
    categoryFilters: document.querySelector("#merch-category-filters"),
    filterMethod: document.querySelector("#filter-personalization"),
    filterMoq: document.querySelector("#filter-moq"),
    filterLead: document.querySelector("#filter-lead-time"),
    filterUseCase: document.querySelector("#filter-use-case"),
    catalogGrid: document.querySelector("#merch-catalog-grid"),
    detailModal: document.querySelector("#merch-detail-modal"),
    detailPanel: document.querySelector("#merch-detail-panel"),
    detailContent: document.querySelector("#merch-detail-content"),
    basketList: document.querySelector("#quote-basket-list"),
    basketEmpty: document.querySelector("#quote-basket-empty"),
    basketRange: document.querySelector("#quote-basket-range"),
    basketCount: document.querySelector("#quote-basket-count"),
    quoteForm: document.querySelector("#merch-quote-form"),
    formStatus: document.querySelector("#merch-form-status"),
    uploadInput: document.querySelector("#logo-upload"),
    uploadError: document.querySelector("#logo-upload-error"),
    hiddenBasketJson: document.querySelector("#quote-basket-json"),
    hiddenBasketSummary: document.querySelector("#quote-basket-summary"),
    hiddenProductNames: document.querySelector("#quote-product-names"),
    hiddenPageUrl: document.querySelector("#quote-page-url"),
    hiddenLanguage: document.querySelector("#quote-language"),
    hiddenTimestamp: document.querySelector("#quote-timestamp")
  };
}

function scrollToCatalog() {
  const catalogSection = document.querySelector("#catalog");
  if (!catalogSection) {
    return;
  }

  catalogSection.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start"
  });
}

function applyShortcut(shortcutValue, filterState, dom) {
  resetFilters(filterState);

  const map = {
    "useCase:launch-kit": { category: "Bags & Accessories", useCase: "launch-kit" },
    "useCase:event-kit": { useCase: "event-kit" },
    "useCase:team-gifting": { useCase: "team-gifting" },
    "useCase:guest-retail": { useCase: "guest-retail" },
    "useCase:uniforms-extension": { useCase: "uniforms-extension" }
  };

  const next = map[shortcutValue];
  if (!next) {
    return;
  }

  if (next.category) {
    filterState.category = next.category;
  }
  if (next.useCase) {
    filterState.useCase = next.useCase;
    if (dom.filterUseCase) {
      dom.filterUseCase.value = next.useCase;
    }
  }
}

function renderShortcutFilters(filterState) {
  document.querySelectorAll("[data-merch-shortcut]").forEach((button) => {
    const shortcutValue = button.getAttribute("data-merch-shortcut") || "";
    button.classList.toggle("is-active", shortcutValue === `useCase:${filterState.useCase}`);
  });
}

function syncFilterControls(dom, filterState) {
  if (dom.filterMethod) dom.filterMethod.value = filterState.personalizationMethod;
  if (dom.filterMoq) dom.filterMoq.value = filterState.moqTier;
  if (dom.filterLead) dom.filterLead.value = filterState.leadTimeTier;
  if (dom.filterUseCase) dom.filterUseCase.value = filterState.useCase;
}

function setFilterKeyToAll(filterState, key) {
  if (Object.prototype.hasOwnProperty.call(filterState, key)) {
    filterState[key] = "all";
  }
}

(async function bootstrapMerchandisePage() {
  const body = document.body;
  if (!body || body.dataset.pageType !== "merchandise") {
    return;
  }

  const dom = createDomMap();
  const studioApi = window.PamuucStudio || {};
  const currentLanguage = studioApi.currentLanguage || body.dataset.language || "en";
  const getPathWithBase = typeof studioApi.getPathWithBase === "function" ? studioApi.getPathWithBase : (value) => value;
  const trackEvent = typeof studioApi.trackEvent === "function" ? studioApi.trackEvent : () => {};
  const tools = createLocaleTools(currentLanguage, getPathWithBase);
  const ui = tools.ui;
  const filterState = createFilterState();

  const catalog = createCatalogController({ dom, currentLanguage, tools, ui, trackEvent });
  const basket = createBasketController({ dom, tools, ui, catalog, trackEvent });
  const modal = createModalController({ body, dom, tools, ui, catalog });
  const form = createMerchFormController({ dom, tools, ui, basket, trackEvent, currentLanguage });

  basket.setProductLookup((productId) => catalog.getProductById(productId));

  const renderAll = () => {
    catalog.renderCategoryFilters(filterState);
    catalog.renderFilterSelects(filterState);
    renderShortcutFilters(filterState);
    catalog.renderCatalog(filterState);
    basket.render();
    form.syncHiddenFields();
  };

  const openProduct = (productId, trigger, selection = null, editingKey = "") => {
    const product = catalog.getProductById(productId);
    if (!product) {
      return;
    }

    modal.open(product, trigger, selection || product.defaultSelection, editingKey);
    trackEvent("merchandise_product_open", {
      item_name: tools.localize(product.displayName),
      section_name: "catalog"
    });
  };

  const bindEvents = () => {
    document.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-filter-category]");
      if (categoryButton) {
        filterState.category = categoryButton.getAttribute("data-filter-category") || "all";
        if (!hasActiveFilters(filterState)) {
          catalog.showFeaturedOnly();
        }
        renderAll();
        trackEvent("merchandise_filter_use", {
          filter_type: "category",
          item_name: filterState.category
        });
        return;
      }

      const shortcutButton = event.target.closest("[data-merch-shortcut]");
      if (shortcutButton) {
        const shortcutValue = shortcutButton.getAttribute("data-merch-shortcut") || "";
        applyShortcut(shortcutValue, filterState, dom);
        renderAll();
        scrollToCatalog();
        trackEvent("merchandise_filter_use", {
          filter_type: "shortcut",
          item_name: shortcutValue
        });
        return;
      }

      const cardAction = event.target.closest("[data-merch-action]");
      if (cardAction) {
        const action = cardAction.getAttribute("data-merch-action");
        const productId = cardAction.getAttribute("data-product-id") || "";
        const product = catalog.getProductById(productId);

        if ((action === "configure" || action === "open") && product) {
          openProduct(product.id, cardAction, product.defaultSelection);
        }

        if (action === "quick-add" && product) {
          basket.add(product, product.defaultSelection);
        }
        return;
      }

      const basketAction = event.target.closest("[data-basket-action]");
      if (basketAction) {
        const action = basketAction.getAttribute("data-basket-action") || "";
        const key = basketAction.getAttribute("data-basket-key") || "";
        const line = basket.getItems().find((item) => basket.buildItemKey(item) === key);
        const product = line ? catalog.getProductById(line.productId) : null;

        if (action === "remove") {
          basket.remove(key);
          form.syncHiddenFields();
          return;
        }

        if (action === "edit" && product && line) {
          openProduct(product.id, basketAction, line, key);
        }
        return;
      }

      const modalClose = event.target.closest("[data-merch-modal-close]");
      if (modalClose) {
        modal.close();
        return;
      }

      const chipButton = event.target.closest("[data-filter-chip]");
      if (chipButton) {
        setFilterKeyToAll(filterState, chipButton.getAttribute("data-filter-chip") || "");
        if (!hasActiveFilters(filterState)) {
          catalog.showFeaturedOnly();
        }
        syncFilterControls(dom, filterState);
        renderAll();
        return;
      }

      const clearButton = event.target.closest("#merch-clear-filters");
      if (clearButton) {
        resetFilters(filterState);
        catalog.showFeaturedOnly();
        syncFilterControls(dom, filterState);
        renderAll();
        return;
      }

      const viewAllButton = event.target.closest("#merch-view-all");
      if (viewAllButton) {
        catalog.showFullCatalog();
        renderAll();
        scrollToCatalog();
        return;
      }

      const galleryThumb = event.target.closest("[data-gallery-thumb]");
      if (galleryThumb) {
        const productId = galleryThumb.getAttribute("data-product-id") || "";
        const nextIndex = Number.parseInt(galleryThumb.getAttribute("data-gallery-thumb"), 10) || 0;
        const product = catalog.getProductById(productId);
        if (product) {
          modal.switchGallery(product, nextIndex);
        }
      }
    });

    [dom.filterMethod, dom.filterMoq, dom.filterLead, dom.filterUseCase].forEach((select) => {
      if (!select) {
        return;
      }

      select.addEventListener("change", () => {
        filterState.personalizationMethod = dom.filterMethod?.value || "all";
        filterState.moqTier = dom.filterMoq?.value || "all";
        filterState.leadTimeTier = dom.filterLead?.value || "all";
        filterState.useCase = dom.filterUseCase?.value || "all";
        if (!hasActiveFilters(filterState)) {
          catalog.showFeaturedOnly();
        } else {
          catalog.showFullCatalog();
        }
        renderAll();
        trackEvent("merchandise_filter_use", {
          filter_type: select.name || select.id,
          item_name: select.value || "all"
        });
      });
    });

    if (dom.basketList) {
      dom.basketList.addEventListener("change", (event) => {
        if (basket.handleChange(event)) {
          form.syncHiddenFields();
        }
      });
    }

    if (dom.detailContent) {
      dom.detailContent.addEventListener("change", (event) => {
        const detailForm = event.target.closest("[data-merch-detail-form]");
        if (detailForm) {
          modal.syncConfiguredState(detailForm);
        }
      });

      dom.detailContent.addEventListener("input", (event) => {
        const detailForm = event.target.closest("[data-merch-detail-form]");
        if (detailForm) {
          modal.syncConfiguredState(detailForm);
        }
      });

      dom.detailContent.addEventListener("submit", (event) => {
        const detailForm = event.target.closest("[data-merch-detail-form]");
        if (!detailForm) {
          return;
        }

        event.preventDefault();
        const productId = detailForm.getAttribute("data-product-id") || "";
        const product = catalog.getProductById(productId);
        if (!product) {
          return;
        }

        const selection = modal.getSelectionFromForm(detailForm, product);
        const editingKey = detailForm.getAttribute("data-basket-key") || modal.getEditingKey();
        if (editingKey) {
          basket.update(editingKey, selection);
        } else {
          basket.add(product, selection);
        }
        modal.close();
      });
    }

    form.bind();

    document.addEventListener("keydown", (event) => {
      if (!dom.detailModal || !dom.detailModal.classList.contains("is-open")) {
        return;
      }

      if (event.key === "Escape") {
        modal.close();
        return;
      }

      modal.trapTab(event);
    });
  };

  try {
    const rawProducts = await loadProductRows(body, tools);
    catalog.setProducts(rawProducts);
    renderAll();
    bindEvents();
  } catch (error) {
    console.error("Merchandise catalog failed to initialize", error);
    catalog.setCatalogError(ui.catalogError);
    basket.render();
    form.syncHiddenFields();
    bindEvents();
  }
})();
