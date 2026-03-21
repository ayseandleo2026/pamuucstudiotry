const METHOD_ADJUSTMENTS = {
  embroidery: { from: 1.6, to: 2.1 },
  "screen-print": { from: 1.05, to: 1.45 },
  "dtf-print": { from: 0.9, to: 1.25 },
  "dtg-print": { from: 1.15, to: 1.55 },
  transfer: { from: 0.85, to: 1.2 }
};

function parseJsonField(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function toNumber(tools, value) {
  const result = tools.toNumber(value);
  return Number.isFinite(result) ? result : 0;
}

function normalizeOptionId(tools, prefix, value, fallback) {
  const base = tools.slugify(String(value || "").trim()) || fallback;
  return `${prefix}-${base}`;
}

function parseGsmValue(value) {
  const match = String(value || "").match(/(\d{2,4})\s*gsm/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function getBaseGsm(row) {
  return parseGsmValue(row.gsm) || parseGsmValue(row.composition) || 0;
}

function normalizeGsmOptions(row, tools) {
  const rawField = row.gsmOptions || row.gsm || "";
  const explicitValues = tools.toArray(rawField);
  const baseGsm = getBaseGsm(row);
  const gsmValues = explicitValues.length
    ? explicitValues
    : baseGsm
      ? [`${baseGsm} GSM`]
      : ["Standard weight"];

  const uniqueValues = tools.uniq(gsmValues.map((item) => item.trim()).filter(Boolean));
  const fallbackBase = baseGsm || parseGsmValue(uniqueValues[0]) || 180;

  return uniqueValues.map((label, index) => {
    const gsmValue = parseGsmValue(label) || fallbackBase;
    const delta = index === 0 ? 0 : Math.max(0, gsmValue - fallbackBase) / 80;
    return {
      id: normalizeOptionId(tools, "gsm", label, `gsm-${index + 1}`),
      label: /gsm/i.test(label) ? label : `${label}`,
      value: gsmValue,
      adjustment: {
        from: Number((delta * 0.45).toFixed(2)),
        to: Number((delta * 0.7).toFixed(2))
      },
      default: index === 0
    };
  });
}

function normalizeColorOptions(row, tools) {
  const rawColors = tools.uniq(tools.toArray(row.colorOptions || row.colors));
  const colorValues = rawColors.length ? rawColors : ["Colour on request"];

  return colorValues.map((label, index) => {
    const normalized = label.trim().toLowerCase();
    const premium = /heather|heritage|washed|dust|anthracite|midnight|orchid|mindful|soul|earth/.test(normalized);
    return {
      id: normalizeOptionId(tools, "color", label, `color-${index + 1}`),
      label,
      adjustment: premium ? { from: 0.25, to: 0.4 } : { from: 0, to: 0 },
      default: index === 0
    };
  });
}

function normalizePersonalizationOptions(row, tools, normalizeMethod) {
  const methods = tools.uniq(tools.toArray(row.personalizationMethods).map(normalizeMethod)).filter(Boolean);
  const safeMethods = methods.length ? methods : ["embroidery"];

  return safeMethods.map((value, index) => ({
    id: value,
    value,
    adjustment: METHOD_ADJUSTMENTS[value] || { from: 0.95, to: 1.35 },
    default: index === 0
  }));
}

function buildExplicitMatrix(row, tools) {
  const payload = parseJsonField(row.pricingMatrix || row.priceMatrix || row.pricing || row.optionPricing);
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return payload.reduce((matrix, entry) => {
      const key = [entry.gsm || "*", entry.color || "*", entry.personalization || entry.method || "*"].join("|").toLowerCase();
      matrix.set(key, {
        from: toNumber(tools, entry.priceFrom),
        to: toNumber(tools, entry.priceTo || entry.priceFrom)
      });
      return matrix;
    }, new Map());
  }

  if (Array.isArray(payload?.combinations)) {
    return payload.combinations.reduce((matrix, entry) => {
      const key = [entry.gsm || "*", entry.color || "*", entry.personalization || entry.method || "*"].join("|").toLowerCase();
      matrix.set(key, {
        from: toNumber(tools, entry.priceFrom),
        to: toNumber(tools, entry.priceTo || entry.priceFrom)
      });
      return matrix;
    }, new Map());
  }

  return null;
}

function getMatrixCandidateKeys(selection) {
  return [
    `${selection.gsmLabel}|${selection.colorLabel}|${selection.personalizationMethod}`.toLowerCase(),
    `${selection.gsmLabel}|*|${selection.personalizationMethod}`.toLowerCase(),
    `*|${selection.colorLabel}|${selection.personalizationMethod}`.toLowerCase(),
    `*|*|${selection.personalizationMethod}`.toLowerCase(),
    `${selection.gsmLabel}|${selection.colorLabel}|*`.toLowerCase(),
    `${selection.gsmLabel}|*|*`.toLowerCase(),
    `*|${selection.colorLabel}|*`.toLowerCase()
  ];
}

export function buildPricingModel(row, tools, normalizeMethod) {
  const baseFrom = Math.max(0, toNumber(tools, row.priceFrom));
  const baseTo = Math.max(baseFrom, toNumber(tools, row.priceTo || row.priceFrom));
  const gsmOptions = normalizeGsmOptions(row, tools);
  const colorOptions = normalizeColorOptions(row, tools);
  const personalizationOptions = normalizePersonalizationOptions(row, tools, normalizeMethod);

  return {
    baseFrom,
    baseTo,
    gsmOptions,
    colorOptions,
    personalizationOptions,
    explicitMatrix: buildExplicitMatrix(row, tools)
  };
}

export function getDefaultSelection(product) {
  return {
    gsmId: product.gsmOptions[0]?.id || "",
    colorId: product.colorOptions[0]?.id || "",
    personalizationMethod: product.personalizationOptions[0]?.value || "",
    quantity: product.moq
  };
}

export function getConfiguredPrice(product, selection = {}) {
  const gsmOption = product.gsmOptions.find((item) => item.id === selection.gsmId) || product.gsmOptions[0] || null;
  const colorOption = product.colorOptions.find((item) => item.id === selection.colorId) || product.colorOptions[0] || null;
  const personalizationOption = product.personalizationOptions.find((item) => item.value === selection.personalizationMethod) || product.personalizationOptions[0] || null;

  const safeSelection = {
    gsmId: gsmOption?.id || "",
    gsmLabel: gsmOption?.label || "",
    colorId: colorOption?.id || "",
    colorLabel: colorOption?.label || "",
    personalizationMethod: personalizationOption?.value || ""
  };

  if (product.pricingModel.explicitMatrix instanceof Map) {
    for (const key of getMatrixCandidateKeys(safeSelection)) {
      const exact = product.pricingModel.explicitMatrix.get(key);
      if (exact) {
        return {
          from: exact.from,
          to: exact.to,
          source: "matrix",
          selection: safeSelection,
          unitLabel: "selected"
        };
      }
    }
  }

  const from = product.pricingModel.baseFrom
    + (gsmOption?.adjustment.from || 0)
    + (colorOption?.adjustment.from || 0)
    + (personalizationOption?.adjustment.from || 0);
  const to = product.pricingModel.baseTo
    + (gsmOption?.adjustment.to || 0)
    + (colorOption?.adjustment.to || 0)
    + (personalizationOption?.adjustment.to || 0);

  return {
    from: Number(from.toFixed(2)),
    to: Number(to.toFixed(2)),
    source: "estimate",
    selection: safeSelection,
    unitLabel: "estimated"
  };
}

export function formatConfiguredPrice(tools, ui, configuredPrice) {
  if (!configuredPrice) {
    return ui.priceUnavailable;
  }

  if (Number(configuredPrice.from) === Number(configuredPrice.to)) {
    return tools.interpolate(ui.priceFromLabel, { price: tools.formatCurrency(configuredPrice.from) });
  }

  return `${tools.formatCurrency(configuredPrice.from)} – ${tools.formatCurrency(configuredPrice.to)}`;
}
