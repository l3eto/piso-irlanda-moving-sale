const EURO = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const state = {
  items: [],
  imagesById: {},
  filters: {
    search: "",
    area: "",
    sort: "id"
  }
};

const elements = {
  grid: document.getElementById("itemsGrid"),
  cardTemplate: document.getElementById("itemCardTemplate"),
  countLabel: document.getElementById("countLabel"),
  searchInput: document.getElementById("searchInput"),
  areaFilter: document.getElementById("areaFilter"),
  sortFilter: document.getElementById("sortFilter")
};

function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? EURO.format(number) : "-";
}

function getImagesForItem(itemId) {
  const key = String(itemId);
  return state.imagesById[key] || [];
}

function itemMatchesFilters(item) {
  const bySearch = !state.filters.search || item.nombre.toLowerCase().includes(state.filters.search);
  const byArea = !state.filters.area || item.area === state.filters.area;
  return bySearch && byArea;
}

function sortItems(items) {
  const sorted = [...items];
  switch (state.filters.sort) {
    case "priceAsc":
      sorted.sort((a, b) => a.precioVenta - b.precioVenta);
      break;
    case "priceDesc":
      sorted.sort((a, b) => b.precioVenta - a.precioVenta);
      break;
    case "nameAsc":
      sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      break;
    default:
      sorted.sort((a, b) => a.id - b.id);
      break;
  }
  return sorted;
}

function renderCards(items) {
  elements.grid.innerHTML = "";

  if (items.length === 0) {
    elements.grid.innerHTML = `<p class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No hay resultados con esos filtros.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    const node = elements.cardTemplate.content.cloneNode(true);
    const image = node.querySelector(".item-image");
    const imagePlaceholder = node.querySelector(".item-image-placeholder");
    const id = node.querySelector(".item-id");
    const name = node.querySelector(".item-name");
    const area = node.querySelector(".item-area");
    const units = node.querySelector(".item-units");
    const sale = node.querySelector(".item-sale");
    const link = node.querySelector(".item-link");

    const itemImages = getImagesForItem(item.id);
    if (itemImages.length > 0) {
      image.src = `./${itemImages[0]}`;
      image.alt = `Foto de ${item.nombre}`;
      image.classList.remove("hidden");
      imagePlaceholder.classList.add("hidden");
    } else {
      image.removeAttribute("src");
      image.alt = "";
      image.classList.add("hidden");
      imagePlaceholder.classList.remove("hidden");
    }

    id.textContent = String(item.id);
    name.textContent = item.nombre;
    area.textContent = item.area;
    units.textContent = String(item.unidades);
    sale.textContent = formatPrice(item.precioVenta);

    if (item.wallapop) {
      link.href = item.wallapop;
    } else {
      link.removeAttribute("href");
      link.classList.remove("bg-sky-600", "hover:bg-sky-700");
      link.classList.add("cursor-not-allowed", "bg-slate-300", "text-slate-600");
      link.textContent = "Enlace de compra aun no disponible";
      link.setAttribute("aria-disabled", "true");
    }

    fragment.appendChild(node);
  }

  elements.grid.appendChild(fragment);
}

function render() {
  const filtered = state.items.filter(itemMatchesFilters);
  const sorted = sortItems(filtered);
  elements.countLabel.textContent = `${sorted.length} articulo(s)`;
  renderCards(sorted);
}

function setupFilters() {
  const areas = [...new Set(state.items.map((item) => item.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  for (const area of areas) {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    elements.areaFilter.appendChild(option);
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.areaFilter.addEventListener("change", (event) => {
    state.filters.area = event.target.value;
    render();
  });

  elements.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });
}

async function loadData() {
  const [itemsResponse, imagesResponse] = await Promise.all([
    fetch("./data/items.json"),
    fetch("./data/images-index.json")
  ]);

  if (!itemsResponse.ok) {
    throw new Error("No se pudo leer data/items.json");
  }

  state.items = await itemsResponse.json();
  state.imagesById = imagesResponse.ok ? await imagesResponse.json() : {};
}

async function init() {
  try {
    await loadData();
    setupFilters();
    render();
  } catch (error) {
    elements.grid.innerHTML = `<p class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${error.message}</p>`;
  }
}

init();
