import { CATEGORY_LABELS, METHOD_LABELS, PAGE_COPY, USE_CASE_LABELS } from "./config.js";

export function createLocaleTools(currentLanguage, getPathWithBase = (value) => value) {
  const ui = PAGE_COPY[currentLanguage] || PAGE_COPY.en;
  const locale = { en: "en-IE", fr: "fr-FR", it: "it-IT", es: "es-ES" }[currentLanguage] || "en-IE";

  function localize(value) {
    if (value == null) {
      return "";
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, currentLanguage)) {
        return value[currentLanguage];
      }
      if (Object.prototype.hasOwnProperty.call(value, "en")) {
        return value.en;
      }
      const fallback = Object.values(value)[0];
      return typeof fallback === "string" ? fallback : "";
    }
    return String(value);
  }

  function interpolate(template, values = {}) {
    return Object.entries(values).reduce((output, [key, value]) => output.replaceAll(`{${key}}`, String(value)), template);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniq(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function toNumber(value) {
    const normalized = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : 0;
  }

  function resolvePath(path) {
    if (!path) {
      return "";
    }
    if (path.startsWith("/")) {
      return getPathWithBase(path);
    }
    return path;
  }

  function formatCurrency(value) {
    const numericValue = Number(value) || 0;
    const hasDecimals = Math.abs(numericValue % 1) > 0.001;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0
    }).format(numericValue);
  }

  function getCategoryLabel(key) {
    return localize(CATEGORY_LABELS[key]) || key;
  }

  function getMethodLabel(key) {
    return localize(METHOD_LABELS[key]) || key;
  }

  function getUseCaseLabel(key) {
    return localize(USE_CASE_LABELS[key]) || key;
  }

  return {
    ui,
    locale,
    localize,
    interpolate,
    escapeHtml,
    slugify,
    uniq,
    toArray,
    toNumber,
    resolvePath,
    formatCurrency,
    getCategoryLabel,
    getMethodLabel,
    getUseCaseLabel
  };
}
