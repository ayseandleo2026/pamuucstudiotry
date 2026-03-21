import { CATEGORY_ORDER, COLOR_HEX_MAP, FEATURED_CATEGORY_ORDER, GENERIC_PALETTE_KEYS, PAGE_COPY } from "./config.js";
import { applyFilters, getActiveFilterChips, hasActiveFilters } from "./filters.js";
import { buildPricingModel, formatConfiguredPrice, getConfiguredPrice, getDefaultSelection } from "./pricing.js";

const DISPLAY_NAMES = {
  "baby-bib": { en: "Babies' Bib", fr: "Bavoir bébé", it: "Bavaglino bebé", es: "Babero de bebé" },
  "tote-bag": { en: "Tote Bag", fr: "Tote bag", it: "Tote bag", es: "Tote bag" },
  "shopping-bag": { en: "Shopping Bag", fr: "Sac shopping", it: "Shopping bag", es: "Bolsa shopping" },
  "gym-bag": { en: "Gym Bag", fr: "Sac de sport", it: "Sacca sport", es: "Bolsa gym" },
  "pencil-case": { en: "Pencil Case", fr: "Trousse", it: "Astuccio", es: "Estuche" },
  "hip-bag": { en: "Hip Bag", fr: "Sac banane", it: "Marsupio", es: "Riñonera" },
  "duffle-bag": { en: "Duffle Bag", fr: "Sac week-end", it: "Borsone", es: "Bolsa duffle" },
  beanie: { en: "Beanie", fr: "Bonnet", it: "Beanie", es: "Beanie" },
  "bucket-hat": { en: "Bucket Hat", fr: "Bob", it: "Bucket hat", es: "Bucket hat" },
  cap: { en: "Cap", fr: "Casquette", it: "Cappellino", es: "Gorra" },
  "t-shirt": { en: "T-Shirt", fr: "T-shirt", it: "T-shirt", es: "Camiseta" },
  "womens-t-shirt": { en: "Women's T-Shirt", fr: "T-shirt femme", it: "T-shirt donna", es: "Camiseta mujer" },
  "long-sleeve-t-shirt": { en: "Long Sleeve T-Shirt", fr: "T-shirt manches longues", it: "T-shirt manica lunga", es: "Camiseta de manga larga" },
  "womens-long-sleeve-t-shirt": { en: "Women's Long Sleeve T-Shirt", fr: "T-shirt femme manches longues", it: "T-shirt donna manica lunga", es: "Camiseta mujer manga larga" },
  "tank-top": { en: "Tank Top", fr: "Débardeur", it: "Canotta", es: "Top sin mangas" },
  sweatshirt: { en: "Sweatshirt", fr: "Sweatshirt", it: "Felpa", es: "Sudadera" },
  hoodie: { en: "Hoodie", fr: "Hoodie", it: "Hoodie", es: "Sudadera con capucha" },
  "zip-hoodie": { en: "Zip Hoodie", fr: "Hoodie zippé", it: "Hoodie con zip", es: "Sudadera con cremallera" },
  joggers: { en: "Joggers", fr: "Joggers", it: "Joggers", es: "Joggers" },
  shorts: { en: "Shorts", fr: "Shorts", it: "Shorts", es: "Shorts" },
  polo: { en: "Polo", fr: "Polo", it: "Polo", es: "Polo" },
  "long-sleeve-polo": { en: "Long Sleeve Polo", fr: "Polo manches longues", it: "Polo manica lunga", es: "Polo manga larga" },
  shirt: { en: "Shirt", fr: "Chemise", it: "Camicia", es: "Camisa" },
  "denim-shirt": { en: "Denim Shirt", fr: "Chemise denim", it: "Camicia denim", es: "Camisa denim" },
  "oxford-shirt": { en: "Oxford Shirt", fr: "Chemise oxford", it: "Camicia oxford", es: "Camisa oxford" },
  "poplin-shirt": { en: "Poplin Shirt", fr: "Chemise popeline", it: "Camicia popeline", es: "Camisa popelina" },
  jacket: { en: "Jacket", fr: "Veste", it: "Giacca", es: "Chaqueta" },
  "fleece-jacket": { en: "Fleece Jacket", fr: "Veste polaire", it: "Giacca in pile", es: "Chaqueta polar" },
  "sherpa-jacket": { en: "Sherpa Jacket", fr: "Veste sherpa", it: "Giacca sherpa", es: "Chaqueta sherpa" },
  "padded-jacket": { en: "Padded Jacket", fr: "Veste matelassée", it: "Giacca imbottita", es: "Chaqueta acolchada" },
  "softshell-jacket": { en: "Softshell Jacket", fr: "Veste softshell", it: "Giacca softshell", es: "Chaqueta softshell" },
  "technical-jacket": { en: "Technical Jacket", fr: "Veste technique", it: "Giacca tecnica", es: "Chaqueta técnica" },
  gilet: { en: "Gilet", fr: "Gilet", it: "Gilet", es: "Chaleco" }
};

const DESCRIPTORS = {
  accessory: {
    en: "Useful branded piece for launches, gifting, or guest-facing environments.",
    fr: "Pièce brandée utile pour lancements, gifting ou espaces orientés client.",
    it: "Articolo brandizzato utile per lanci, gifting o ambienti guest-facing.",
    es: "Pieza de marca útil para lanzamientos, gifting o entornos de cara al cliente."
  },
  tee: {
    en: "Core branded essential for teams, launches, and premium everyday wear.",
    fr: "Essentiel brandé pour équipes, lancements et usage quotidien premium.",
    it: "Essenziale brandizzato per team, lanci e uso quotidiano premium.",
    es: "Esencial de marca para equipos, lanzamientos y uso diario premium."
  },
  longsleeve: {
    en: "Long sleeve essential for layered wardrobes and cooler service settings.",
    fr: "Essentiel manches longues pour garde-robes superposées et contextes plus frais.",
    it: "Essenziale a manica lunga per guardaroba a strati e contesti più freschi.",
    es: "Esencial de manga larga para vestuarios en capas y entornos más frescos."
  },
  hoodie: {
    en: "Soft branded layer suited to teams, gifting, onboarding, and relaxed uniforms.",
    fr: "Couche douce adaptée aux équipes, gifting, onboarding et uniformes plus relax.",
    it: "Layer morbido adatto a team, gifting, onboarding e uniformi più rilassate.",
    es: "Capa suave adecuada para equipos, gifting, onboarding y uniformes más relajados."
  },
  crewneck: {
    en: "Crewneck layer with a clean profile for gifting, staff drops, or daily wear.",
    fr: "Couche col rond au profil propre pour gifting, drops équipe ou usage quotidien.",
    it: "Layer girocollo dal profilo pulito per gifting, drop team o uso quotidiano.",
    es: "Capa de cuello redondo con perfil limpio para gifting, drops de equipo o uso diario."
  },
  polo: {
    en: "More structured branded option for teams that need a cleaner, polished tone.",
    fr: "Option plus structurée pour équipes ayant besoin d’un ton plus net et soigné.",
    it: "Opzione più strutturata per team che richiedono un tono più pulito e curato.",
    es: "Opción más estructurada para equipos que necesitan un tono más limpio y pulido."
  },
  shirt: {
    en: "Woven option for teams that need a sharper branded presentation.",
    fr: "Option tissée pour équipes qui ont besoin d’une présentation plus nette.",
    it: "Opzione tessuta per team che richiedono una presentazione brandizzata più curata.",
    es: "Opción tejida para equipos que necesitan una presentación de marca más cuidada."
  },
  outerwear: {
    en: "Outer layer for guest-facing teams, travel use, and premium branded coverage.",
    fr: "Couche extérieure pour équipes guest-facing, déplacements et couverture brandée premium.",
    it: "Layer esterno per team guest-facing, trasferte e copertura brandizzata premium.",
    es: "Capa exterior para equipos guest-facing, desplazamientos y cobertura de marca premium."
  },
  joggers: {
    en: "Comfort-led bottom layer for relaxed branded wardrobes and gifting programs.",
    fr: "Bas orienté confort pour garde-robes brandées plus relax et programmes gifting.",
    it: "Parte bassa orientata al comfort per guardaroba brandizzati più rilassati e gifting.",
    es: "Prenda inferior orientada al confort para vestuarios de marca relajados y gifting."
  },
  shorts: {
    en: "Short-form option for lighter climates, leisure use, or seasonal drops.",
    fr: "Option courte pour climats plus légers, usage leisure ou drops saisonniers.",
    it: "Opzione short per climi più miti, uso leisure o drop stagionali.",
    es: "Opción corta para climas más suaves, uso leisure o drops estacionales."
  },
  tank: {
    en: "Sleeveless option for active teams, warmer climates, or lighter branded use.",
    fr: "Option sans manches pour équipes actives, climats chauds ou usage plus léger.",
    it: "Opzione senza maniche per team attivi, climi caldi o uso brandizzato più leggero.",
    es: "Opción sin mangas para equipos activos, climas cálidos o usos más ligeros."
  }
};

export function createCatalogController({ dom, currentLanguage, tools, ui }) {
  const state = {
    products: [],
    featuredIds: [],
    showAllProducts: false
  };

  function isActiveValue(value) {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  function inferDisplayCategory(rawCategory, rawName) {
    const category = String(rawCategory || "").trim().toLowerCase();
    const name = String(rawName || "").trim().toLowerCase();

    if (category === "bags" || category === "accessories") return "Bags & Accessories";
    if (category === "headwear") return "Caps / Beanies";
    if (category === "polos") return "Polos";
    if (category === "shirts") return "Shirts (Woven)";
    if (category === "ls tees") return "Long Sleeve T-Shirts";
    if (category === "bottoms") return /short/.test(name) ? "Shorts" : "Sweatpants / Joggers";
    if (category === "outerwear") return /softshell|shell|body warmer|bodywarmer|gilet|technical|sleeveless/.test(name) ? "Outerwear – Light / Technical" : "Outerwear – Jackets";
    if (category === "sweatshirts") {
      if (/zip-thru|zip thru|zip hoodie|zip-?thru|zip sweatshirt/.test(name)) return "Zip Hoodies";
      if (/hoodie/.test(name)) return "Hoodies";
      return "Sweatshirts (Crewneck)";
    }
    if (category === "tees") {
      if (/tank|sleeveless/.test(name)) return "Tank Tops / Sleeveless";
      if (/women/.test(name)) return "T-Shirts (Women – Stella line)";
      return "T-Shirts (Unisex / Men)";
    }
    return "T-Shirts (Unisex / Men)";
  }

  function inferDisplayNameKey(rawName, displayCategory) {
    const name = String(rawName || "").trim().toLowerCase();
    if (displayCategory === "Bags & Accessories") {
      if (/bib/.test(name)) return "baby-bib";
      if (/pencil/.test(name)) return "pencil-case";
      if (/duffle/.test(name)) return "duffle-bag";
      if (/gym/.test(name)) return "gym-bag";
      if (/hip/.test(name)) return "hip-bag";
      if (/shopping/.test(name)) return "shopping-bag";
      return "tote-bag";
    }
    if (displayCategory === "Caps / Beanies") {
      if (/bucket/.test(name)) return "bucket-hat";
      if (/cap/.test(name)) return "cap";
      return "beanie";
    }
    if (displayCategory === "Long Sleeve T-Shirts") return /women/.test(name) ? "womens-long-sleeve-t-shirt" : "long-sleeve-t-shirt";
    if (displayCategory === "T-Shirts (Women – Stella line)") return "womens-t-shirt";
    if (displayCategory === "Tank Tops / Sleeveless") return "tank-top";
    if (displayCategory === "T-Shirts (Unisex / Men)") return "t-shirt";
    if (displayCategory === "Sweatshirts (Crewneck)") return "sweatshirt";
    if (displayCategory === "Hoodies") return "hoodie";
    if (displayCategory === "Zip Hoodies") return "zip-hoodie";
    if (displayCategory === "Sweatpants / Joggers") return "joggers";
    if (displayCategory === "Shorts") return "shorts";
    if (displayCategory === "Polos") return /long sleeve/.test(name) ? "long-sleeve-polo" : "polo";
    if (displayCategory === "Shirts (Woven)") {
      if (/denim/.test(name)) return "denim-shirt";
      if (/oxford/.test(name)) return "oxford-shirt";
      if (/poplin/.test(name)) return "poplin-shirt";
      return "shirt";
    }
    if (displayCategory === "Outerwear – Light / Technical") return /body warmer|bodywarmer|gilet/.test(name) ? "gilet" : /softshell/.test(name) ? "softshell-jacket" : "technical-jacket";
    if (displayCategory === "Outerwear – Jackets") return /fleece/.test(name) ? "fleece-jacket" : /sherpa/.test(name) ? "sherpa-jacket" : /padded/.test(name) ? "padded-jacket" : "jacket";
    return "t-shirt";
  }

  function inferDescriptorKey(displayCategory) {
    if (["Bags & Accessories", "Caps / Beanies"].includes(displayCategory)) return "accessory";
    if (displayCategory === "Long Sleeve T-Shirts") return "longsleeve";
    if (displayCategory === "Tank Tops / Sleeveless") return "tank";
    if (["Sweatshirts (Crewneck)", "Zip Hoodies"].includes(displayCategory)) return "crewneck";
    if (displayCategory === "Hoodies") return "hoodie";
    if (displayCategory === "Polos") return "polo";
    if (displayCategory === "Shirts (Woven)") return "shirt";
    if (["Outerwear – Jackets", "Outerwear – Light / Technical"].includes(displayCategory)) return "outerwear";
    if (displayCategory === "Sweatpants / Joggers") return "joggers";
    if (displayCategory === "Shorts") return "shorts";
    return "tee";
  }

  function normalizeMethod(value) {
    const slug = tools.slugify(value);
    if (slug.includes("screen")) return "screen-print";
    if (slug.includes("embroider")) return "embroidery";
    if (slug.includes("dtg")) return "dtg-print";
    if (slug.includes("dtf")) return "dtf-print";
    if (slug.includes("transfer")) return "transfer";
    return slug || "embroidery";
  }

  function normalizeMoqTier(moq) {
    if (moq <= 1) return "from-1-piece";
    if (moq < 25) return "2-24";
    if (moq < 50) return "25-49";
    if (moq < 100) return "50-99";
    return "100-plus";
  }

  function getMoqTierLabel(value) {
    const map = {
      "from-1-piece": { en: "From 1", fr: "Dès 1", it: "Da 1", es: "Desde 1" },
      "2-24": { en: "2–24 units", fr: "2–24 unités", it: "2–24 unità", es: "2–24 unidades" },
      "25-49": { en: "25–49 units", fr: "25–49 unités", it: "25–49 unità", es: "25–49 unidades" },
      "50-99": { en: "50–99 units", fr: "50–99 unités", it: "50–99 unità", es: "50–99 unidades" },
      "100-plus": { en: "100+ units", fr: "100+ unités", it: "100+ unità", es: "100+ unidades" }
    };
    return tools.localize(map[value]) || value;
  }

  function getLeadTimeTierLabel(value) {
    const map = {
      "14-21-days": {
        en: "14–21 days",
        fr: "14–21 jours",
        it: "14–21 giorni",
        es: "14–21 días"
      },
      "4-5-weeks": {
        en: "4–5 weeks",
        fr: "4–5 semaines",
        it: "4–5 settimane",
        es: "4–5 semanas"
      },
      "5-6-weeks": {
        en: "5–6 weeks",
        fr: "5–6 semaines",
        it: "5–6 settimane",
        es: "5–6 semanas"
      },
      "6-plus-weeks": {
        en: "6+ weeks",
        fr: "6+ semaines",
        it: "6+ settimane",
        es: "6+ semanas"
      }
    };

    return tools.localize(map[value]) || value;
  }

  function normalizeLeadTime(row) {
    const raw = String(row.leadTime || "").trim();
    const match = raw.match(/\d+/);
    const days = match ? Number.parseInt(match[0], 10) : 14;
    return {
      days,
      tier: days <= 14 ? "14-21-days" : days <= 28 ? "4-5-weeks" : days <= 42 ? "5-6-weeks" : "6-plus-weeks",
      short: {
        en: `${days} day lead time`,
        fr: `${days} jours de délai`,
        it: `${days} giorni di lead time`,
        es: `${days} días de plazo`
      },
      detail: {
        en: String(row.leadTimeTier || row.leadTime || "").trim() || "Lead time confirmed after artwork and quantity review.",
        fr: String(row.leadTimeTier || row.leadTime || "").trim() || "Le délai est confirmé après validation de l’artwork et des quantités.",
        it: String(row.leadTimeTier || row.leadTime || "").trim() || "Il lead time viene confermato dopo la verifica di artwork e quantità.",
        es: String(row.leadTimeTier || row.leadTime || "").trim() || "El plazo se confirma tras revisar el artwork y las cantidades."
      }
    };
  }

  function inferUseCases(displayCategory) {
    const cases = new Set();
    if (["Bags & Accessories", "Caps / Beanies"].includes(displayCategory)) {
      cases.add("launch-kit");
      cases.add("team-gifting");
      cases.add("event-kit");
      cases.add("guest-retail");
    }
    if (["T-Shirts (Unisex / Men)", "Sweatshirts (Crewneck)", "Hoodies", "Zip Hoodies", "Polos"].includes(displayCategory)) {
      cases.add("team-gifting");
      cases.add("event-kit");
      cases.add("staff-drop");
    }
    if (["Shirts (Woven)", "Polos", "Outerwear – Jackets", "Outerwear – Light / Technical"].includes(displayCategory)) {
      cases.add("uniforms-extension");
    }
    if (!cases.size) {
      cases.add("team-gifting");
      cases.add("event-kit");
    }
    return Array.from(cases);
  }

  function inferSortPriority(rawName, displayCategory) {
    const name = String(rawName || "").toLowerCase();
    let score = 100;
    if (/bab(y|ies)|kids?/.test(name)) score += 70;
    if (/women/.test(name)) score += 8;
    if (/unisex/.test(name)) score -= 12;
    if (/essential|iconic|premium/.test(name)) score -= 10;
    if (displayCategory === "Bags & Accessories" && /tote|shopping/.test(name)) score -= 12;
    if (displayCategory === "Caps / Beanies" && /beanie/.test(name)) score -= 8;
    if (displayCategory === "Outerwear – Light / Technical" && /softshell/.test(name)) score -= 8;
    if (displayCategory === "Polos" && /polo/.test(name)) score -= 6;
    if (displayCategory === "T-Shirts (Unisex / Men)" && /t-shirt/.test(name)) score -= 8;
    if (displayCategory === "Sweatshirts (Crewneck)" && /sweatshirt/.test(name)) score -= 8;
    if (displayCategory === "Hoodies" && /hoodie/.test(name)) score -= 8;
    return score;
  }

  function buildSwatches(colorOptions) {
    return colorOptions.map((option) => {
      const normalized = option.label.trim().toLowerCase();
      const isGeneric = GENERIC_PALETTE_KEYS.has(normalized) || /on request/.test(normalized);
      const directHex = COLOR_HEX_MAP[normalized] || Object.entries(COLOR_HEX_MAP).find(([key]) => normalized.includes(key))?.[1] || "";
      return {
        id: option.id,
        label: option.label,
        hex: isGeneric ? "" : directHex,
        isGeneric,
        unavailable: false
      };
    });
  }

  function normalizeProduct(row) {
    const rawName = String(row.name || "").trim();
    const displayCategoryKey = inferDisplayCategory(row.category, rawName);
    const displayNameKey = inferDisplayNameKey(rawName, displayCategoryKey);
    const descriptorKey = inferDescriptorKey(displayCategoryKey);
    const primaryImage = String(row.image || "").trim();
    const galleryImages = tools.uniq(tools.toArray(row.gallery));
    const resolvedGallery = galleryImages.length ? galleryImages : primaryImage ? [primaryImage] : [];
    const leadTime = normalizeLeadTime(row);
    const moq = Math.max(1, Number.parseInt(row.moq, 10) || 1);
    const displayName = DISPLAY_NAMES[displayNameKey] || { en: rawName, fr: rawName, it: rawName, es: rawName };
    const descriptor = DESCRIPTORS[descriptorKey] || DESCRIPTORS.tee;
    const composition = String(row.composition || "").trim();
    const cleanedComposition = /official product sheet|style code|scheda prodotto ufficiale|fiche produit officielle|ficha oficial/i.test(composition) ? "" : composition;
    const pricingModel = buildPricingModel(row, tools, normalizeMethod);
    const colorOptions = pricingModel.colorOptions;
    const personalizationMethodsList = pricingModel.personalizationOptions.map((option) => option.value);

    const product = {
      id: String(row.id || tools.slugify(rawName)),
      slug: String(row.slug || tools.slugify(rawName)),
      rawName,
      rawCategory: String(row.category || "").trim(),
      displayNameKey,
      displayName,
      displayCategoryKey,
      shortDescription: descriptor,
      fullDescription: {
        en: `${descriptor.en} ${PAGE_COPY.en.productSummaryNote}`,
        fr: `${descriptor.fr} ${PAGE_COPY.fr.productSummaryNote}`,
        it: `${descriptor.it} ${PAGE_COPY.it.productSummaryNote}`,
        es: `${descriptor.es} ${PAGE_COPY.es.productSummaryNote}`
      },
      primaryImage,
      galleryImages: resolvedGallery,
      mediaCount: resolvedGallery.length,
      colorOptions,
      swatches: buildSwatches(colorOptions),
      sizesList: tools.uniq(tools.toArray(row.sizes)),
      compositionDisplay: cleanedComposition,
      moq,
      moqTier: normalizeMoqTier(moq),
      leadTimeDays: leadTime.days,
      leadTimeTier: leadTime.tier,
      leadTimeShort: leadTime.short,
      leadTimeDetail: leadTime.detail,
      pricingModel,
      gsmOptions: pricingModel.gsmOptions,
      personalizationOptions: pricingModel.personalizationOptions,
      personalizationMethodsList,
      packagingOptionsList: tools.uniq(tools.toArray(row.packagingOptions)),
      tagsList: tools.uniq(tools.toArray(row.tags).map(tools.slugify)),
      useCasesList: inferUseCases(displayCategoryKey),
      active: isActiveValue(row.active),
      sortPriority: inferSortPriority(rawName, displayCategoryKey)
    };

    product.defaultSelection = getDefaultSelection(product);
    product.defaultConfiguredPrice = getConfiguredPrice(product, product.defaultSelection);
    return product;
  }

  function normalizeProducts(rawProducts) {
    return rawProducts.reduce((products, row, index) => {
      try {
        const product = normalizeProduct(row || {});
        if (product.id) {
          products.push(product);
        }
      } catch (error) {
        console.error(`Skipping merchandise product at index ${index}`, error, row);
      }
      return products;
    }, []);
  }

  function compareProducts(a, b) {
    const categoryDelta = CATEGORY_ORDER.indexOf(a.displayCategoryKey) - CATEGORY_ORDER.indexOf(b.displayCategoryKey);
    if (categoryDelta !== 0) return categoryDelta;
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    if (a.pricingModel.baseFrom !== b.pricingModel.baseFrom) return a.pricingModel.baseFrom - b.pricingModel.baseFrom;
    return tools.localize(a.displayName).localeCompare(tools.localize(b.displayName));
  }

  function buildFeaturedIds(products) {
    const sorted = [...products].filter((product) => product.active).sort(compareProducts);
    const chosen = [];
    const chosenIds = new Set();

    FEATURED_CATEGORY_ORDER.forEach((categoryKey) => {
      const match = sorted.find((product) => product.displayCategoryKey === categoryKey && !chosenIds.has(product.id));
      if (match) {
        chosen.push(match.id);
        chosenIds.add(match.id);
      }
    });

    sorted.forEach((product) => {
      if (chosen.length >= 9 || chosenIds.has(product.id)) return;
      chosen.push(product.id);
      chosenIds.add(product.id);
    });

    return chosen.slice(0, 9);
  }

  function setProducts(rawProducts) {
    state.products = normalizeProducts(rawProducts);
    state.featuredIds = buildFeaturedIds(state.products);
  }

  function getProducts() {
    return state.products;
  }

  function getProductById(productId) {
    return state.products.find((product) => product.id === productId) || null;
  }

  function getVisibleProducts(filterState) {
    const filtered = applyFilters(state.products, filterState).sort(compareProducts);
    if (hasActiveFilters(filterState)) return filtered;
    if (state.showAllProducts) return filtered;
    const featuredLookup = new Set(state.featuredIds);
    return filtered.filter((product) => featuredLookup.has(product.id));
  }

  function formatPrice(product, selection = product.defaultSelection) {
    return formatConfiguredPrice(tools, ui, getConfiguredPrice(product, selection));
  }

  function getCompactLeadTime(product) {
    return tools.interpolate(ui.leadTimeCompact, { days: product.leadTimeDays || 14 });
  }

  function getCompactMeta(product) {
    return tools.interpolate(ui.compactMeta, { moq: product.moq, leadTime: getCompactLeadTime(product) });
  }

  function renderMedia(product, variant = "card") {
    const firstImage = product.galleryImages[0] ? tools.resolvePath(product.galleryImages[0]) : "";
    const alt = tools.escapeHtml(tools.localize(product.displayName));
    const placeholder = `<div class="merch-media-placeholder ${variant === "detail" ? "merch-media-placeholder-detail" : "merch-media-placeholder-card"}"><span>${tools.escapeHtml(ui.mediaPlaceholder)}</span></div>`;

    if (variant === "detail") {
      const stage = firstImage ? `<img alt="${alt}" class="merch-detail-image" src="${tools.escapeHtml(firstImage)}"/>` : placeholder;
      const thumbs = product.galleryImages.length > 1
        ? `<div class="merch-detail-thumbs" role="tablist" aria-label="${alt}">${product.galleryImages.map((image, index) => `<button aria-label="${alt} ${index + 1}" aria-selected="${index === 0 ? "true" : "false"}" class="merch-detail-thumb${index === 0 ? " is-active" : ""}" data-gallery-thumb="${index}" data-product-id="${tools.escapeHtml(product.id)}" role="tab" type="button"><img alt="" src="${tools.escapeHtml(tools.resolvePath(image))}"/></button>`).join("")}</div>`
        : "";
      return `<div class="merch-detail-media-shell" data-gallery-root="${tools.escapeHtml(product.id)}"><div class="merch-detail-media-stage" data-gallery-stage>${stage}</div>${thumbs}</div>`;
    }

    return `<div class="merch-card-media-inner${firstImage ? "" : " is-empty"}">${firstImage ? `<img alt="${alt}" class="merch-card-image" decoding="async" loading="lazy" src="${tools.escapeHtml(firstImage)}"/>` : placeholder}</div>`;
  }

  function renderSwatches(product, activeColorId = "") {
    if (!product.swatches.length) {
      return `<p class="merch-detail-note">${tools.escapeHtml(ui.colourOptionsOnRequest)}</p>`;
    }

    const visible = product.swatches.slice(0, 10).map((swatch) => {
      const style = swatch.hex ? ` style="--swatch-color:${tools.escapeHtml(swatch.hex)}"` : "";
      const className = swatch.hex ? "merch-swatch" : "merch-swatch merch-swatch-generic";
      const activeClass = swatch.id === activeColorId ? " is-active" : "";
      return `<span aria-label="${tools.escapeHtml(swatch.label)}" class="${className}${activeClass}" role="listitem"${style}></span>`;
    }).join("");
    return `<div class="merch-swatch-block"><div class="merch-swatch-row" role="list">${visible}</div><p class="merch-detail-note">${tools.escapeHtml(product.swatches.some((swatch) => swatch.hex) ? ui.showPalette : ui.multipleColours)}</p></div>`;
  }

  function renderCategoryFilters(filterState) {
    if (!dom.categoryFilters) return;
    const categories = CATEGORY_ORDER.filter((category) => state.products.some((product) => product.active && product.displayCategoryKey === category));
    dom.categoryFilters.innerHTML = [
      `<button class="filter-pill${filterState.category === "all" ? " is-active" : ""}" data-filter-category="all" type="button">${tools.escapeHtml(ui.allCategories)}</button>`,
      ...categories.map((category) => `<button class="filter-pill${filterState.category === category ? " is-active" : ""}" data-filter-category="${tools.escapeHtml(category)}" type="button">${tools.escapeHtml(tools.getCategoryLabel(category))}</button>`)
    ].join("");
  }

  function renderFilterSelects(filterState) {
    const active = state.products.filter((product) => product.active);
    const methods = tools.uniq(active.flatMap((product) => product.personalizationMethodsList));
    const moqTiers = tools.uniq(active.map((product) => product.moqTier));
    const leadTiers = tools.uniq(active.map((product) => product.leadTimeTier));
    const useCases = tools.uniq(active.flatMap((product) => product.useCasesList));

    const buildOptions = (allLabel, values, labelFn, selected) => [
      `<option value="all">${tools.escapeHtml(allLabel)}</option>`,
      ...values.map((value) => `<option value="${tools.escapeHtml(value)}"${selected === value ? " selected" : ""}>${tools.escapeHtml(labelFn(value))}</option>`)
    ].join("");

    if (dom.filterMethod) dom.filterMethod.innerHTML = buildOptions(ui.allMethods, methods, tools.getMethodLabel, filterState.personalizationMethod);
    if (dom.filterMoq) dom.filterMoq.innerHTML = buildOptions(ui.allMoq, moqTiers, getMoqTierLabel, filterState.moqTier);
    if (dom.filterLead) dom.filterLead.innerHTML = buildOptions(ui.allLeadTimes, leadTiers, getLeadTimeTierLabel, filterState.leadTimeTier);
    if (dom.filterUseCase) dom.filterUseCase.innerHTML = buildOptions(ui.allUseCases, useCases, tools.getUseCaseLabel, filterState.useCase);
  }

  function ensureCatalogChrome() {
    if (!dom.filterShell) return;
    let controls = document.querySelector("#merch-filter-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "merch-filter-controls";
      controls.className = "merch-filter-controls";
      controls.innerHTML = `
        <div class="merch-active-filters" id="merch-active-filters" aria-live="polite"></div>
        <div class="merch-filter-actions">
          <button class="merch-toolbar-button is-secondary" id="merch-view-all" type="button"></button>
          <button class="merch-toolbar-button" hidden id="merch-clear-filters" type="button"></button>
        </div>
      `;
      dom.filterShell.appendChild(controls);
    }

    let notice = document.querySelector("#merch-catalog-notice");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "merch-catalog-notice";
      notice.id = "merch-catalog-notice";
      dom.filterShell.insertAdjacentElement("afterend", notice);
    }

    dom.activeFilters = document.querySelector("#merch-active-filters");
    dom.viewAllButton = document.querySelector("#merch-view-all");
    dom.clearFiltersButton = document.querySelector("#merch-clear-filters");
    dom.catalogNotice = notice;
  }

  function renderToolbar(filterState) {
    ensureCatalogChrome();
    if (!dom.activeFilters || !dom.viewAllButton || !dom.clearFiltersButton || !dom.catalogNotice) return;

    const chips = getActiveFilterChips(filterState, {
      getCategoryLabel: tools.getCategoryLabel,
      getMethodLabel: tools.getMethodLabel,
      getUseCaseLabel: tools.getUseCaseLabel,
      getMoqTierLabel,
      getLeadTimeTierLabel
    });

    dom.activeFilters.innerHTML = chips.length
      ? chips.map((chip) => `<button class="merch-filter-chip" data-filter-chip="${tools.escapeHtml(chip.key)}" type="button"><span>${tools.escapeHtml(chip.label)}</span><span aria-hidden="true">×</span></button>`).join("")
      : `<span class="merch-filter-chip merch-filter-chip-static">${tools.escapeHtml(ui.featuredBadge)}</span>`;

    const showingFeatured = !hasActiveFilters(filterState) && !state.showAllProducts;
    const visible = getVisibleProducts(filterState);
    if (dom.resultsCount) {
      if (showingFeatured) dom.resultsCount.textContent = tools.interpolate(ui.featuredResults, { count: visible.length });
      else if (hasActiveFilters(filterState)) dom.resultsCount.textContent = tools.interpolate(ui.filteredResults, { count: visible.length });
      else dom.resultsCount.textContent = tools.interpolate(ui.fullResults, { count: visible.length });
    }

    dom.catalogNotice.textContent = showingFeatured ? ui.featuredNotice : hasActiveFilters(filterState) ? ui.filteredNotice : ui.fullNotice;
    dom.viewAllButton.hidden = !(showingFeatured && state.products.filter((product) => product.active).length > visible.length);
    dom.viewAllButton.textContent = ui.viewAll;
    dom.clearFiltersButton.hidden = !(chips.length || state.showAllProducts);
    dom.clearFiltersButton.textContent = chips.length ? ui.clearAll : ui.showFeatured;
  }

  function renderCatalog(filterState) {
    if (!dom.catalogGrid) return;
    const visible = getVisibleProducts(filterState);
    renderToolbar(filterState);

    if (!visible.length) {
      dom.catalogGrid.innerHTML = `<div class="merch-empty-state"><h3>${tools.escapeHtml(ui.resultsZero)}</h3><p>${tools.escapeHtml(ui.filteredNotice)}</p></div>`;
      return;
    }

    dom.catalogGrid.innerHTML = visible.map((product) => {
      const name = tools.localize(product.displayName);
      return `
        <article class="merch-card" data-product-id="${tools.escapeHtml(product.id)}">
          <button aria-label="${tools.escapeHtml(`${ui.configure}: ${name}`)}" class="merch-card-media" data-merch-action="configure" data-product-id="${tools.escapeHtml(product.id)}" type="button">
            ${renderMedia(product, "card")}
          </button>
          <div class="merch-card-body">
            <p class="merch-card-category">${tools.escapeHtml(tools.getCategoryLabel(product.displayCategoryKey))}</p>
            <div class="merch-card-copy">
              <h3>${tools.escapeHtml(name)}</h3>
              <p class="merch-card-descriptor">${tools.escapeHtml(tools.localize(product.shortDescription))}</p>
            </div>
            <div class="merch-card-summary">
              <strong class="merch-card-price">${tools.escapeHtml(formatPrice(product))}</strong>
              <p class="merch-card-meta">${tools.escapeHtml(getCompactMeta(product))}</p>
            </div>
            <div class="merch-card-actions">
              <button class="button button-secondary" data-merch-action="configure" data-product-id="${tools.escapeHtml(product.id)}" type="button">${tools.escapeHtml(ui.configure)}</button>
              <button class="button button-primary" data-merch-action="quick-add" data-product-id="${tools.escapeHtml(product.id)}" type="button">${tools.escapeHtml(ui.quickAdd)}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function setCatalogError(message) {
    if (dom.catalogGrid) {
      dom.catalogGrid.innerHTML = `<div class="merch-empty-state"><h3>${tools.escapeHtml(message || ui.catalogError)}</h3></div>`;
    }
    if (dom.resultsCount) {
      dom.resultsCount.textContent = message || ui.catalogError;
    }
  }

  function showFeaturedOnly() {
    state.showAllProducts = false;
  }

  function showFullCatalog() {
    state.showAllProducts = true;
  }

  return {
    state,
    normalizeProducts,
    setProducts,
    getProducts,
    getProductById,
    getVisibleProducts,
    formatPrice,
    getCompactMeta,
    getCompactLeadTime,
    renderCatalog,
    renderCategoryFilters,
    renderFilterSelects,
    renderMedia,
    renderSwatches,
    setCatalogError,
    showFeaturedOnly,
    showFullCatalog,
    getConfiguredPrice: (product, selection) => getConfiguredPrice(product, selection),
    formatConfiguredPrice: (configuredPrice) => formatConfiguredPrice(tools, ui, configuredPrice),
    getDefaultSelection
  };
}
