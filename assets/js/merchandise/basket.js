import { BASKET_STORAGE_KEY } from "./config.js";

function buildItemKey(item) {
  return [item.productId, item.gsmId, item.colorId, item.personalizationMethod].join("::");
}

export function createBasketController({ dom, tools, ui, catalog, trackEvent }) {
  let basket = load();
  let findProduct = () => null;
  let quoteStarted = basket.length > 0;

  function setProductLookup(fn) {
    findProduct = fn;
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item) => item && typeof item.productId === "string").map((item) => ({
        productId: item.productId,
        gsmId: item.gsmId || "",
        colorId: item.colorId || "",
        personalizationMethod: item.personalizationMethod || "",
        quantity: Number.parseInt(item.quantity, 10) || 1
      }));
    } catch (_error) {
      return [];
    }
  }

  function save() {
    window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basket));
  }

  function ensureQuoteStarted(source) {
    if (quoteStarted) return;
    quoteStarted = true;
    trackEvent(ui.formStart, { section_name: "merchandise_quote", item_name: source });
  }

  function findLine(key) {
    return basket.find((item) => buildItemKey(item) === key) || null;
  }

  function getSnapshot() {
    return basket.map((item) => {
      const product = findProduct(item.productId);
      if (!product) return null;
      const configuredPrice = catalog.getConfiguredPrice(product, item);
      const gsmLabel = product.gsmOptions.find((option) => option.id === item.gsmId)?.label || product.gsmOptions[0]?.label || "";
      const colorLabel = product.colorOptions.find((option) => option.id === item.colorId)?.label || product.colorOptions[0]?.label || "";
      return {
        key: buildItemKey(item),
        id: product.id,
        name: tools.localize(product.displayName),
        category: tools.getCategoryLabel(product.displayCategoryKey),
        quantity: item.quantity,
        gsm: gsmLabel,
        color: colorLabel,
        personalizationMethod: item.personalizationMethod,
        personalizationLabel: tools.getMethodLabel(item.personalizationMethod),
        unitPrice: catalog.formatConfiguredPrice(configuredPrice),
        lineTotal: Number((configuredPrice.from * item.quantity).toFixed(2)) === Number((configuredPrice.to * item.quantity).toFixed(2))
          ? tools.formatCurrency(configuredPrice.from * item.quantity)
          : `${tools.formatCurrency(configuredPrice.from * item.quantity)} – ${tools.formatCurrency(configuredPrice.to * item.quantity)}`
      };
    }).filter(Boolean);
  }

  function getSummaryText() {
    return getSnapshot().map((item) => `${item.name} | ${item.quantity} | ${item.gsm} | ${item.color} | ${item.personalizationLabel} | ${item.unitPrice}`).join("\n");
  }

  function updateHiddenFields() {
    const snapshot = getSnapshot();
    if (dom.hiddenBasketJson) dom.hiddenBasketJson.value = JSON.stringify(snapshot);
    if (dom.hiddenBasketSummary) dom.hiddenBasketSummary.value = getSummaryText();
    if (dom.hiddenProductNames) dom.hiddenProductNames.value = snapshot.map((item) => item.name).join(", ");
    if (dom.hiddenPageUrl) dom.hiddenPageUrl.value = window.location.href;
    if (dom.hiddenLanguage) dom.hiddenLanguage.value = document.body.dataset.language || "en";
    if (dom.hiddenTimestamp) dom.hiddenTimestamp.value = new Date().toISOString();
  }

  function add(product, selection) {
    if (!product) return;
    const safeSelection = {
      gsmId: selection?.gsmId || product.defaultSelection.gsmId,
      colorId: selection?.colorId || product.defaultSelection.colorId,
      personalizationMethod: selection?.personalizationMethod || product.defaultSelection.personalizationMethod,
      quantity: Math.max(product.moq, Number.parseInt(selection?.quantity, 10) || product.moq)
    };
    const key = buildItemKey({ productId: product.id, ...safeSelection });
    const existing = findLine(key);
    if (existing) {
      existing.quantity += safeSelection.quantity;
    } else {
      basket.push({ productId: product.id, ...safeSelection });
    }
    save();
    render();
    ensureQuoteStarted("add_to_quote");
    trackEvent("merchandise_add_to_quote", { item_name: tools.localize(product.displayName), personalization_method: safeSelection.personalizationMethod });
  }

  function update(key, selection) {
    const existing = findLine(key);
    if (!existing) {
      return;
    }
    const product = findProduct(existing.productId);
    if (!product) {
      return;
    }
    const nextItem = {
      productId: existing.productId,
      gsmId: selection?.gsmId || existing.gsmId || product.defaultSelection.gsmId,
      colorId: selection?.colorId || existing.colorId || product.defaultSelection.colorId,
      personalizationMethod: selection?.personalizationMethod || existing.personalizationMethod || product.defaultSelection.personalizationMethod,
      quantity: Math.max(product.moq, Number.parseInt(selection?.quantity, 10) || existing.quantity || product.moq)
    };
    const nextKey = buildItemKey(nextItem);
    basket = basket.filter((item) => buildItemKey(item) !== key);
    const duplicate = findLine(nextKey);
    if (duplicate) {
      duplicate.quantity += nextItem.quantity;
    } else {
      basket.push(nextItem);
    }
    save();
    render();
  }

  function remove(key) {
    const existing = findLine(key);
    const product = existing ? findProduct(existing.productId) : null;
    basket = basket.filter((item) => buildItemKey(item) !== key);
    save();
    render();
    trackEvent("merchandise_remove_from_quote", { item_name: product ? tools.localize(product.displayName) : key, personalization_method: existing?.personalizationMethod || "" });
  }

  function clear() {
    basket = [];
    save();
    render();
  }

  function render() {
    if (!dom.basketList || !dom.basketEmpty || !dom.basketCount || !dom.basketRange) return;
    const lines = basket.map((item) => {
      const product = findProduct(item.productId);
      if (!product) {
        return null;
      }
      return { item, product, configuredPrice: catalog.getConfiguredPrice(product, item) };
    }).filter(Boolean);

    if (!lines.length) {
      dom.basketList.innerHTML = "";
      dom.basketEmpty.hidden = false;
      dom.basketCount.textContent = ui.basketEmptyTitle;
      dom.basketRange.textContent = "—";
      updateHiddenFields();
      return;
    }

    dom.basketEmpty.hidden = true;
    let totalFrom = 0;
    let totalTo = 0;

    dom.basketList.innerHTML = lines.map(({ item, product, configuredPrice }) => {
      totalFrom += configuredPrice.from * item.quantity;
      totalTo += configuredPrice.to * item.quantity;
      const gsmLabel = product.gsmOptions.find((option) => option.id === item.gsmId)?.label || product.gsmOptions[0]?.label || "";
      const colorLabel = product.colorOptions.find((option) => option.id === item.colorId)?.label || product.colorOptions[0]?.label || "";
      return `
        <article class="quote-item" data-basket-key="${tools.escapeHtml(buildItemKey(item))}">
          <div class="quote-item-head">
            <div>
              <p class="project-tag">${tools.escapeHtml(tools.getCategoryLabel(product.displayCategoryKey))}</p>
              <h3>${tools.escapeHtml(tools.localize(product.displayName))}</h3>
              <p class="quote-item-config">${tools.escapeHtml(`${ui.gsm}: ${gsmLabel} · ${ui.color}: ${colorLabel} · ${ui.personalization}: ${tools.getMethodLabel(item.personalizationMethod)}`)}</p>
            </div>
            <div class="quote-item-head-actions">
              <button class="quote-action" data-basket-action="edit" data-basket-key="${tools.escapeHtml(buildItemKey(item))}" type="button">${tools.escapeHtml(ui.edit)}</button>
              <button class="quote-remove" data-basket-action="remove" data-basket-key="${tools.escapeHtml(buildItemKey(item))}" type="button">${tools.escapeHtml(ui.remove)}</button>
            </div>
          </div>
          <div class="quote-item-grid">
            <label class="form-field">
              <span>${tools.escapeHtml(ui.quantity)}</span>
              <input data-basket-qty data-basket-key="${tools.escapeHtml(buildItemKey(item))}" min="${tools.escapeHtml(String(product.moq))}" step="1" type="number" value="${tools.escapeHtml(String(item.quantity))}"/>
            </label>
            <div class="quote-item-meta">
              <span>${tools.escapeHtml(ui.unitEstimate)}</span>
              <strong>${tools.escapeHtml(catalog.formatConfiguredPrice(configuredPrice))}</strong>
            </div>
            <div class="quote-item-meta">
              <span>${tools.escapeHtml(ui.lineEstimate)}</span>
              <strong>${tools.escapeHtml(Number((configuredPrice.from * item.quantity).toFixed(2)) === Number((configuredPrice.to * item.quantity).toFixed(2)) ? tools.formatCurrency(configuredPrice.from * item.quantity) : `${tools.formatCurrency(configuredPrice.from * item.quantity)} – ${tools.formatCurrency(configuredPrice.to * item.quantity)}`)}</strong>
            </div>
          </div>
        </article>
      `;
    }).join("");

    dom.basketCount.textContent = tools.interpolate(ui.basketItems, { count: lines.length });
    dom.basketRange.textContent = Number(totalFrom.toFixed(2)) === Number(totalTo.toFixed(2)) ? tools.formatCurrency(totalFrom) : `${tools.formatCurrency(totalFrom)} – ${tools.formatCurrency(totalTo)}`;
    updateHiddenFields();
  }

  function handleChange(event) {
    const quantityInput = event.target.closest("[data-basket-qty]");
    if (quantityInput) {
      const key = quantityInput.getAttribute("data-basket-key") || "";
      const line = findLine(key);
      const product = line ? findProduct(line.productId) : null;
      if (line && product) {
        line.quantity = Math.max(product.moq, Number.parseInt(quantityInput.value, 10) || product.moq);
        save();
        render();
      }
      return true;
    }

    return false;
  }

  return {
    setProductLookup,
    getItems() {
      return basket;
    },
    getSnapshot,
    add,
    update,
    remove,
    clear,
    render,
    updateHiddenFields,
    handleChange,
    buildItemKey
  };
}
