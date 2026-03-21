export function createFilterState() {
  return {
    category: "all",
    personalizationMethod: "all",
    moqTier: "all",
    leadTimeTier: "all",
    useCase: "all"
  };
}

export function hasActiveFilters(filterState) {
  return Object.values(filterState).some((value) => value !== "all");
}

export function resetFilters(filterState) {
  filterState.category = "all";
  filterState.personalizationMethod = "all";
  filterState.moqTier = "all";
  filterState.leadTimeTier = "all";
  filterState.useCase = "all";
}

export function applyFilters(products, filterState) {
  return products.filter((product) => {
    if (!product.active) return false;
    if (filterState.category !== "all" && product.displayCategoryKey !== filterState.category) return false;
    if (filterState.personalizationMethod !== "all" && !product.personalizationMethodsList.includes(filterState.personalizationMethod)) return false;
    if (filterState.moqTier !== "all" && product.moqTier !== filterState.moqTier) return false;
    if (filterState.leadTimeTier !== "all" && product.leadTimeTier !== filterState.leadTimeTier) return false;
    if (filterState.useCase !== "all" && !product.useCasesList.includes(filterState.useCase)) return false;
    return true;
  });
}

export function getActiveFilterChips(filterState, helpers) {
  const chips = [];
  const { getCategoryLabel, getMethodLabel, getUseCaseLabel } = helpers;

  if (filterState.category !== "all") {
    chips.push({ key: "category", label: getCategoryLabel(filterState.category) });
  }
  if (filterState.personalizationMethod !== "all") {
    chips.push({ key: "personalizationMethod", label: getMethodLabel(filterState.personalizationMethod) });
  }
  if (filterState.moqTier !== "all") {
    chips.push({ key: "moqTier", label: helpers.getMoqTierLabel(filterState.moqTier) });
  }
  if (filterState.leadTimeTier !== "all") {
    chips.push({ key: "leadTimeTier", label: helpers.getLeadTimeTierLabel(filterState.leadTimeTier) });
  }
  if (filterState.useCase !== "all") {
    chips.push({ key: "useCase", label: getUseCaseLabel(filterState.useCase) });
  }

  return chips;
}
