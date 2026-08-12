import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const inputCsvPath = path.join(rootDir, "private", "items.csv");
const inputImagesPath = path.join(rootDir, "private", "images");
const outputDataPath = path.join(rootDir, "docs", "data");
const outputImagesPath = path.join(outputDataPath, "images");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(header) {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(raw) {
  if (raw == null) {
    return NaN;
  }
  const cleaned = String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "").trim();
  if (!cleaned) {
    return NaN;
  }
  return Number.parseFloat(cleaned);
}

function resolveHeaders(lines) {
  const required = new Set(["area", "nombre", "unidades", "maximo"]);
  for (let i = 0; i < lines.length; i += 1) {
    const headers = parseCsvLine(lines[i]).map(normalizeHeader);
    const headerSet = new Set(headers);
    const hasAllRequired = [...required].every((field) => headerSet.has(field));
    if (hasAllRequired) {
      return { headers, startAt: i + 1 };
    }
  }
  return { headers: [], startAt: lines.length };
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }
  return "";
}

function parseMeasure(raw) {
  const parsed = parseNumber(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEstado(raw) {
  const value = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (value.includes("vendid")) {
    return "vendido";
  }
  if (value.includes("reserv")) {
    return "reservado";
  }
  return "disponible";
}

function splitCsvLines(csvText) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current.trim().length > 0) {
        lines.push(current.trim());
      }
      current = "";
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    lines.push(current.trim());
  }

  return lines;
}

function parseCsv(csvText) {
  const lines = splitCsvLines(csvText);

  if (lines.length < 2) {
    return [];
  }

  const { headers, startAt } = resolveHeaders(lines);
  if (headers.length === 0) {
    return [];
  }

  let fallbackId = 1;
  const items = [];

  for (const line of lines.slice(startAt)) {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, colIdx) => {
      row[header] = values[colIdx] ?? "";
    });

    const area = String(row.area || "").trim();
    const nombre = String(row.nombre || "").trim();

    if (!area || !nombre) {
      continue;
    }

    const units = Number.parseInt(row.unidades || "0", 10);
    const salePrice = parseNumber(row.maximo);
    const webPrice = parseNumber(getRowValue(row, ["web", "precio web"]));
    const offerPrice = parseNumber(getRowValue(row, ["oferta", "oferta"]));
    const alto = parseMeasure(getRowValue(row, ["alto (z)", "alto"]));
    const ancho = parseMeasure(getRowValue(row, ["ancho (x)", "ancho"]));
    const largo = parseMeasure(getRowValue(row, ["largo (y)", "largo"]));
    const descripcion = String(getRowValue(row, ["descripcion", "descripcion breve", "detalle"]) || "").trim();
    const estado = normalizeEstado(getRowValue(row, ["estado"]));
    const explicitId = Number.parseInt(String(row.id || "").trim(), 10);
    const id = Number.isFinite(explicitId) && explicitId > 0 ? explicitId : fallbackId;
    fallbackId += 1;

    const itemObj = {
     id,
     area,
     nombre,
     unidades: Number.isFinite(units) ? units : 0,
     precioWeb: Number.isFinite(webPrice) ? webPrice : null,
     precioVenta: Number.isFinite(salePrice) ? salePrice : 0,
     medidas: {
       alto,
       ancho,
       largo
     },
     descripcion,
     estado,
     wallapop: String(row.wallapop || "").trim()
    };

    // Agregar oferta solo si existe
    if (Number.isFinite(offerPrice)) {
     itemObj.oferta = offerPrice;
    }

    items.push(itemObj);
  }

  return items;
}

async function getImageFilesByItemId() {
  const index = {};

  try {
    const dirEntries = await readdir(inputImagesPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const itemId = entry.name;
      const sourceItemDir = path.join(inputImagesPath, itemId);
      const outputItemDir = path.join(outputImagesPath, itemId);
      await mkdir(outputItemDir, { recursive: true });

      const files = await readdir(sourceItemDir, { withFileTypes: true });
      const validImages = files
        .filter((fileEntry) => fileEntry.isFile())
        .map((fileEntry) => fileEntry.name)
        .filter((fileName) => /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName))
        .sort((a, b) => a.localeCompare(b, "es"));

      index[itemId] = validImages.map((fileName) => `data/images/${itemId}/${fileName}`);

      for (const fileName of validImages) {
        const from = path.join(sourceItemDir, fileName);
        const to = path.join(outputItemDir, fileName);
        await copyFile(from, to);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return index;
}

async function cleanOutputImagesDir() {
  try {
    const existing = await stat(outputImagesPath);
    if (existing.isDirectory()) {
      await rm(outputImagesPath, { recursive: true, force: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function run() {
  const csvContent = await readFile(inputCsvPath, "utf8");
  const items = parseCsv(csvContent);

  await mkdir(outputDataPath, { recursive: true });
  await cleanOutputImagesDir();
  await mkdir(outputImagesPath, { recursive: true });

  const imageIndex = await getImageFilesByItemId();

  await writeFile(path.join(outputDataPath, "items.json"), JSON.stringify(items, null, 2), "utf8");
  await writeFile(path.join(outputDataPath, "images-index.json"), JSON.stringify(imageIndex, null, 2), "utf8");

  console.log(`OK: ${items.length} items generados en docs/data/items.json`);
  console.log(`OK: indice de imagenes generado en docs/data/images-index.json`);
}

run().catch((error) => {
  console.error("Error al generar datos:", error);
  process.exitCode = 1;
});
