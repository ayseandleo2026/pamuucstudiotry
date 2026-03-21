function getCandidateUrls(body, tools) {
  const configured = body.dataset.productsUrl || "";
  const configuredResolved = configured ? new URL(configured, window.location.href).toString() : "";
  const candidates = [
    configuredResolved,
    new URL("../assets/data/products.json", window.location.href).toString(),
    new URL("../../assets/data/products.json", window.location.href).toString(),
    new URL("../data/merch-products.json", window.location.href).toString(),
    new URL("../../data/merch-products.json", window.location.href).toString(),
    new URL("../assets/data/products.csv", window.location.href).toString(),
    new URL("../../assets/data/products.csv", window.location.href).toString()
  ].filter(Boolean);

  return tools.uniq(candidates);
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  const pushCell = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    if (!row.length && !current) {
      return;
    }
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      pushCell();
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      pushRow();
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    pushRow();
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1)
    .filter((values) => values.some((value) => String(value || "").trim()))
    .map((values) => headers.reduce((record, header, index) => {
      record[header] = String(values[index] || "").trim();
      return record;
    }, {}));
}

function parsePayload(payload, candidateUrl) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.products)) {
    return payload.products;
  }

  throw new Error(`Catalog payload at ${candidateUrl} is not a product array`);
}

async function parseResponse(response, candidateUrl) {
  const extension = candidateUrl.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = await response.text();
    return parseCsv(text);
  }

  const json = await response.json();
  return parsePayload(json, candidateUrl);
}

export async function loadProductRows(body, tools) {
  const candidates = getCandidateUrls(body, tools);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Catalog fetch failed with status ${response.status} at ${candidate}`);
      }

      const rows = await parseResponse(response, candidate);
      if (!Array.isArray(rows)) {
        throw new Error(`Catalog rows at ${candidate} are invalid`);
      }
      return rows;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Catalog fetch failed for all candidate URLs");
}
