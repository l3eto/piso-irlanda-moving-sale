const EURO = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const state = {
  items: [],
  imagesById: {},
  filters: {
    search: "",
    area: "",
    status: "disponible",
    sort: "id"
  },
  modal: {
    item: null,
    images: [],
    index: 0,
    visibleItems: [],
    currentItemIndex: 0
  }
};

const elements = {
  grid: document.getElementById("itemsGrid"),
  cardTemplate: document.getElementById("itemCardTemplate"),
  countLabel: document.getElementById("countLabel"),
  searchInput: document.getElementById("searchInput"),
  areaFilter: document.getElementById("areaFilter"),
  statusFilter: document.getElementById("statusFilter"),
  sortFilter: document.getElementById("sortFilter"),
  areaFilterDesktop: document.getElementById("areaFilterDesktop"),
  statusFilterDesktop: document.getElementById("statusFilterDesktop"),
  sortFilterDesktop: document.getElementById("sortFilterDesktop"),
  filterToggle: document.getElementById("filterToggle"),
  filtersPanel: document.getElementById("filtersPanel"),
  galleryModal: document.getElementById("galleryModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalMainImage: document.getElementById("modalMainImage"),
  modalImagePlaceholder: document.getElementById("modalImagePlaceholder"),
  modalHerePrice: document.getElementById("modalHerePrice"),
  modalWallapopPrice: document.getElementById("modalWallapopPrice"),
  modalDescriptionRow: document.getElementById("modalDescriptionRow"),
  modalDescription: document.getElementById("modalDescription"),
  modalWallapop: document.getElementById("modalWallapop"),
  modalThumbs: document.getElementById("modalThumbs"),
  modalCounter: document.getElementById("modalCounter"),
  modalPrev: document.getElementById("modalPrev"),
  modalNext: document.getElementById("modalNext")
};

function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? EURO.format(number) : "-";
}

function formatMeasure(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  return `${number} cm`;
}

function formatSize(medidas) {
  if (!medidas) {
    return "-";
  }
  const alto = formatMeasure(medidas.alto);
  const ancho = formatMeasure(medidas.ancho);
  const largo = formatMeasure(medidas.largo);
  if (alto === "-" && ancho === "-" && largo === "-") {
    return "-";
  }
  return `Al ${alto} · An ${ancho} · La ${largo}`;
}

function getWallapopUrl(value) {
  const raw = String(value || "").trim();
  return raw;
}

function normalizeEstado(value) {
  const raw = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (raw.includes("vendid")) {
    return "vendido";
  }
  if (raw.includes("reserv")) {
    return "reservado";
  }
  return "disponible";
}

function getStatusMeta(estado) {
  const normalized = normalizeEstado(estado);
  if (normalized === "reservado") {
    return {
      value: "reservado",
      label: "Reservado",
      classes: ["bg-amber-100", "text-amber-700"]
    };
  }
  if (normalized === "vendido") {
    return {
      value: "vendido",
      label: "Vendido",
      classes: ["bg-rose-100", "text-rose-700"]
    };
  }
  return {
    value: "disponible",
    label: "Disponible",
    classes: ["bg-emerald-100", "text-emerald-700"]
  };
}

function getHerePrice(item) {
  if (Number.isFinite(Number(item.precioWeb))) {
    return Number(item.precioWeb);
  }
  return Number(item.precioVenta);
}

function toAssetUrl(assetPath) {
  const normalized = String(assetPath || "").replace(/\\/g, "/");
  const encodedPath = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `./${encodedPath}`;
}

function getImagesForItem(itemId) {
  const key = String(itemId);
  return state.imagesById[key] || [];
}

function getItemById(itemId) {
  return state.items.find((item) => item.id === itemId);
}

function updateUrlWithFilters() {
  const params = new URLSearchParams();
  if (state.filters.search) params.set("search", state.filters.search);
  if (state.filters.area) params.set("area", state.filters.area);
  if (state.filters.status && state.filters.status !== "disponible") params.set("status", state.filters.status);
  if (state.filters.sort && state.filters.sort !== "id") params.set("sort", state.filters.sort);

  const queryString = params.toString();
  const newUrl = queryString ? `?${queryString}` : window.location.pathname;
  window.history.replaceState(null, "", newUrl + window.location.hash);
}

function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.filters.search = params.get("search") || "";
  state.filters.area = params.get("area") || "";
  state.filters.status = params.get("status") || "disponible";
  state.filters.sort = params.get("sort") || "id";

  elements.searchInput.value = state.filters.search;
  elements.areaFilter.value = state.filters.area;
  elements.statusFilter.value = state.filters.status;
  elements.sortFilter.value = state.filters.sort;
  elements.areaFilterDesktop.value = state.filters.area;
  elements.statusFilterDesktop.value = state.filters.status;
  elements.sortFilterDesktop.value = state.filters.sort;
}

function openModalForItemId(itemId) {
  const item = getItemById(itemId);
  if (!item) {
    return;
  }

  state.modal.item = item;
  state.modal.images = getImagesForItem(item.id);
  state.modal.index = 0;
  renderModal();
  elements.galleryModal.classList.remove("hidden");
  elements.galleryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#product-${itemId}`);
}

function closeModalAndRestoreUrl() {
  elements.galleryModal.classList.add("hidden");
  elements.galleryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function checkUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#product-")) {
    const productId = Number.parseInt(hash.substring("#product-".length), 10);
    if (Number.isFinite(productId)) {
      openModalForItemId(productId);
    }
  }
}

function itemMatchesFilters(item) {
  const bySearch = !state.filters.search || item.nombre.toLowerCase().includes(state.filters.search);
  const byArea = !state.filters.area || item.area === state.filters.area;
  const byStatus = !state.filters.status || normalizeEstado(item.estado) === state.filters.status;
  return bySearch && byArea && byStatus;
}

function itemMatchesSearchAndStatus(item) {
  const bySearch = !state.filters.search || item.nombre.toLowerCase().includes(state.filters.search);
  const byStatus = !state.filters.status || normalizeEstado(item.estado) === state.filters.status;
  return bySearch && byStatus;
}

function sortItems(items) {
  const sorted = [...items];
  switch (state.filters.sort) {
    case "priceAsc":
      sorted.sort((a, b) => getHerePrice(a) - getHerePrice(b));
      break;
    case "priceDesc":
      sorted.sort((a, b) => getHerePrice(b) - getHerePrice(a));
      break;
    case "nameAsc":
      sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      break;
    default:
      sorted.sort((a, b) => {
        const areaCompare = a.area.localeCompare(b.area, "es");
        if (areaCompare !== 0) {
          return areaCompare;
        }
        return a.nombre.localeCompare(b.nombre, "es");
      });
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
    const card = node.querySelector(".item-card");
    const image = node.querySelector(".item-image");
    const imagePlaceholder = node.querySelector(".item-image-placeholder");
    const photosBadge = node.querySelector(".item-photos-badge");
    const id = node.querySelector(".item-id");
    const name = node.querySelector(".item-name");
    const area = node.querySelector(".item-area");
    const status = node.querySelector(".item-status");
    const units = node.querySelector(".item-units");
    const herePrice = node.querySelector(".item-here-price");
    const sizeRow = node.querySelector(".item-size-row");
    const size = node.querySelector(".item-size");
    const link = node.querySelector(".item-link");

    const itemImages = getImagesForItem(item.id);
    
    // Mostrar imagen si existe
    if (itemImages.length > 0) {
      image.src = toAssetUrl(itemImages[0]);
      image.alt = `Foto de ${item.nombre}`;
      image.onerror = () => {
        image.removeAttribute("src");
        image.alt = "";
        image.classList.add("hidden");
        imagePlaceholder.classList.remove("hidden");
      };
      image.classList.remove("hidden");
      imagePlaceholder.classList.add("hidden");
      photosBadge.textContent = `${itemImages.length} foto(s)`;
      photosBadge.classList.remove("hidden");
    } else {
      image.removeAttribute("src");
      image.alt = "";
      image.classList.add("hidden");
      imagePlaceholder.classList.remove("hidden");
      photosBadge.classList.add("hidden");
    }
    
    // Hacer clickable todos los productos (con o sin imagen)
    card.dataset.itemId = String(item.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Ver detalles de ${item.nombre}`);
    card.classList.add("cursor-pointer");

    id.textContent = String(item.id);
    name.textContent = item.nombre;
    area.textContent = item.area;
    const statusMeta = getStatusMeta(item.estado);
    status.textContent = statusMeta.label;
    status.classList.remove("bg-amber-100", "text-amber-700", "bg-rose-100", "text-rose-700", "bg-emerald-100", "text-emerald-700");
    status.classList.add(...statusMeta.classes);
    units.textContent = String(item.unidades);
    herePrice.textContent = formatPrice(getHerePrice(item));
    const sizeText = formatSize(item.medidas);
    if (sizeText === "-") {
      sizeRow.classList.add("hidden");
    } else {
      sizeRow.classList.remove("hidden");
      size.textContent = sizeText;
    }

    const wallapopUrl = getWallapopUrl(item.wallapop);
    if (wallapopUrl) {
      link.href = wallapopUrl;
      link.textContent = `Ver en Wallapop (${formatPrice(item.precioVenta)})`;
      link.classList.remove("hidden");
      link.removeAttribute("aria-disabled");
      link.classList.remove("cursor-not-allowed", "bg-slate-300", "text-slate-600");
      link.classList.add("bg-sky-600", "text-white", "hover:bg-sky-700");
    } else {
      link.removeAttribute("href");
      link.classList.add("hidden");
    }

    fragment.appendChild(node);
  }

  elements.grid.appendChild(fragment);
}

function setDisabled(button, disabled) {
  button.disabled = disabled;
  if (disabled) {
    button.classList.add("cursor-not-allowed", "opacity-40");
  } else {
    button.classList.remove("cursor-not-allowed", "opacity-40");
  }
}

function renderModal() {
  const { item, images, index } = state.modal;
  if (!item) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  state.modal.index = safeIndex;
  const currentImage = images.length > 0 ? images[safeIndex] : null;

  elements.modalTitle.textContent = item.nombre;
  elements.modalMeta.textContent = `Ref: #${item.id} · ${item.area} · ${item.unidades} ud.`;
  
  if (currentImage) {
    elements.modalMainImage.src = toAssetUrl(currentImage);
    elements.modalMainImage.alt = `Foto ${safeIndex + 1} de ${item.nombre}`;
    elements.modalMainImage.onerror = () => {
      elements.modalMainImage.removeAttribute("src");
      elements.modalMainImage.alt = "Imagen no disponible";
      elements.modalImagePlaceholder.classList.remove("hidden");
    };
    elements.modalMainImage.classList.remove("hidden");
    elements.modalImagePlaceholder.classList.add("hidden");
  } else {
    elements.modalMainImage.removeAttribute("src");
    elements.modalMainImage.alt = "Imagen no disponible";
    elements.modalMainImage.classList.add("hidden");
    elements.modalImagePlaceholder.classList.remove("hidden");
  }

  elements.modalHerePrice.textContent = formatPrice(getHerePrice(item));
  elements.modalWallapopPrice.textContent = formatPrice(item.precioVenta);
  const description = String(item.descripcion || "").trim();
  if (description) {
    elements.modalDescription.textContent = description;
    elements.modalDescriptionRow.classList.remove("hidden");
  } else {
    elements.modalDescription.textContent = "";
    elements.modalDescriptionRow.classList.add("hidden");
  }
  elements.modalCounter.textContent = images.length > 0 ? `${safeIndex + 1} / ${images.length}` : "Sin imágenes";

  const singleImage = images.length <= 1;
  setDisabled(elements.modalPrev, singleImage);
  setDisabled(elements.modalNext, singleImage);

  const visibleItems = getVisibleItems();
  const singleProduct = visibleItems.length <= 1;
  setDisabled(document.getElementById("modalPrevProduct"), singleProduct);
  setDisabled(document.getElementById("modalNextProduct"), singleProduct);
  
  const currentItemIndex = visibleItems.findIndex(i => i.id === item.id);
  const productCounterEl = document.getElementById("modalProductCounter");
  if (productCounterEl) {
    productCounterEl.textContent = `${currentItemIndex + 1} / ${visibleItems.length}`;
  }

  elements.modalThumbs.innerHTML = "";
  const thumbsFragment = document.createDocumentFragment();
  images.forEach((imagePath, imageIndex) => {
    const thumbButton = document.createElement("button");
    thumbButton.type = "button";
    thumbButton.className = "overflow-hidden rounded-lg border transition";
    if (imageIndex === safeIndex) {
      thumbButton.classList.add("border-sky-500", "ring-2", "ring-sky-100");
    } else {
      thumbButton.classList.add("border-slate-200", "hover:border-slate-300");
    }
    thumbButton.dataset.thumbIndex = String(imageIndex);

    const thumbImage = document.createElement("img");
    thumbImage.src = toAssetUrl(imagePath);
    thumbImage.alt = `Miniatura ${imageIndex + 1} de ${item.nombre}`;
    thumbImage.className = "h-16 w-full object-cover";
    thumbButton.appendChild(thumbImage);

    thumbsFragment.appendChild(thumbButton);
  });
  elements.modalThumbs.appendChild(thumbsFragment);

  const wallapopUrl = getWallapopUrl(item.wallapop);
  if (wallapopUrl) {
    elements.modalWallapop.href = wallapopUrl;
    elements.modalWallapop.textContent = `Ver en Wallapop (${formatPrice(item.precioVenta)})`;
    elements.modalWallapop.classList.remove("hidden");
    elements.modalWallapop.removeAttribute("aria-disabled");
    elements.modalWallapop.classList.remove("cursor-not-allowed", "bg-slate-300", "text-slate-600");
    elements.modalWallapop.classList.add("bg-sky-600", "text-white", "hover:bg-sky-700");
  } else {
    elements.modalWallapop.removeAttribute("href");
    elements.modalWallapop.classList.add("hidden");
  }
}

function closeModal() {
  closeModalAndRestoreUrl();
}

function changeModalImage(step) {
  if (state.modal.images.length <= 1) {
    return;
  }
  const nextIndex = (state.modal.index + step + state.modal.images.length) % state.modal.images.length;
  state.modal.index = nextIndex;
  renderModal();
}

function getVisibleItems() {
  const filtered = state.items.filter(itemMatchesFilters);
  const sorted = sortItems(filtered);
  return sorted.filter(item => getImagesForItem(item.id).length > 0);
}

function changeModalProduct(step) {
  const visibleItems = getVisibleItems();
  if (visibleItems.length <= 1 || !state.modal.item) {
    return;
  }
  
  const currentIndex = visibleItems.findIndex(item => item.id === state.modal.item.id);
  if (currentIndex === -1) {
    return;
  }
  
  const nextIndex = (currentIndex + step + visibleItems.length) % visibleItems.length;
  const nextItem = visibleItems[nextIndex];
  
  state.modal.item = nextItem;
  state.modal.images = getImagesForItem(nextItem.id);
  state.modal.index = 0;
  state.modal.currentItemIndex = nextIndex;
  renderModal();
}

function render() {
  updateAreaFilterOptions();
  const filtered = state.items.filter(itemMatchesFilters);
  const sorted = sortItems(filtered);
  elements.countLabel.textContent = `${sorted.length} articulo(s)`;
  renderCards(sorted);
}

function updateAreaFilterOptions() {
  const preserveArea = state.filters.area;
  const items = state.items.filter(itemMatchesSearchAndStatus);
  const areaCounts = new Map();
  for (const item of items) {
    if (!item.area) {
      continue;
    }
    areaCounts.set(item.area, (areaCounts.get(item.area) || 0) + 1);
  }

  const sortedAreas = [...areaCounts.keys()].sort((a, b) => a.localeCompare(b, "es"));
  
  const updateSelect = (selectElement) => {
    selectElement.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = `Todas las areas (${items.length})`;
    selectElement.appendChild(allOption);

    for (const area of sortedAreas) {
      const option = document.createElement("option");
      option.value = area;
      option.textContent = `${area} (${areaCounts.get(area)})`;
      selectElement.appendChild(option);
    }

    if (preserveArea && areaCounts.has(preserveArea)) {
      selectElement.value = preserveArea;
    } else {
      selectElement.value = "";
    }
  };

  updateSelect(elements.areaFilter);
  updateSelect(elements.areaFilterDesktop);

  if (!preserveArea || !areaCounts.has(preserveArea)) {
    state.filters.area = "";
  }
}

function setupFilters() {
  elements.statusFilter.value = state.filters.status;
  elements.statusFilterDesktop.value = state.filters.status;

  const syncFilters = () => {
    state.filters.search = elements.searchInput.value.trim().toLowerCase();
    state.filters.area = elements.areaFilter.value;
    state.filters.status = elements.statusFilter.value;
    state.filters.sort = elements.sortFilter.value;
    
    elements.areaFilterDesktop.value = state.filters.area;
    elements.statusFilterDesktop.value = state.filters.status;
    elements.sortFilterDesktop.value = state.filters.sort;
    
    updateUrlWithFilters();
    render();
  };

  const syncFromDesktop = () => {
    elements.areaFilter.value = elements.areaFilterDesktop.value;
    elements.statusFilter.value = elements.statusFilterDesktop.value;
    elements.sortFilter.value = elements.sortFilterDesktop.value;
    
    state.filters.search = elements.searchInput.value.trim().toLowerCase();
    state.filters.area = elements.areaFilterDesktop.value;
    state.filters.status = elements.statusFilterDesktop.value;
    state.filters.sort = elements.sortFilterDesktop.value;
    
    updateUrlWithFilters();
    render();
  };

  elements.searchInput.addEventListener("input", syncFilters);
  elements.areaFilter.addEventListener("change", syncFilters);
  elements.statusFilter.addEventListener("change", syncFilters);
  elements.sortFilter.addEventListener("change", syncFilters);

  elements.areaFilterDesktop.addEventListener("change", syncFromDesktop);
  elements.statusFilterDesktop.addEventListener("change", syncFromDesktop);
  elements.sortFilterDesktop.addEventListener("change", syncFromDesktop);

  elements.filterToggle.addEventListener("click", () => {
    elements.filtersPanel.classList.toggle("hidden");
  });
}

function setupCardInteraction() {
  elements.grid.addEventListener("click", (event) => {
    if (event.target.closest(".item-link")) {
      return;
    }
    const card = event.target.closest(".item-card");
    if (!card || !card.dataset.itemId) {
      return;
    }
    openModalForItemId(Number.parseInt(card.dataset.itemId, 10));
  });

  elements.grid.addEventListener("keydown", (event) => {
    const isActivationKey = event.key === "Enter" || event.key === " ";
    if (!isActivationKey) {
      return;
    }
    const card = event.target.closest(".item-card");
    if (!card || !card.dataset.itemId) {
      return;
    }
    event.preventDefault();
    openModalForItemId(Number.parseInt(card.dataset.itemId, 10));
  });
}

function setupModalInteraction() {
  elements.galleryModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close='true']")) {
      closeModal();
      return;
    }

    const thumb = event.target.closest("[data-thumb-index]");
    if (thumb) {
      state.modal.index = Number.parseInt(thumb.dataset.thumbIndex, 10);
      renderModal();
    }
  });

  elements.modalPrev.addEventListener("click", () => changeModalImage(-1));
  elements.modalNext.addEventListener("click", () => changeModalImage(1));

  document.getElementById("modalPrevProduct").addEventListener("click", () => changeModalProduct(-1));
  document.getElementById("modalNextProduct").addEventListener("click", () => changeModalProduct(1));

  document.addEventListener("keydown", (event) => {
    if (elements.galleryModal.classList.contains("hidden")) {
      return;
    }
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key === "ArrowLeft") {
      changeModalImage(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      changeModalImage(1);
    }
  });

  window.addEventListener("hashchange", () => {
    if (elements.galleryModal.classList.contains("hidden")) {
      checkUrlHash();
    } else {
      closeModal();
    }
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
    loadFiltersFromUrl();
    setupCardInteraction();
    setupModalInteraction();
    render();
    checkUrlHash();
  } catch (error) {
    elements.grid.innerHTML = `<p class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${error.message}</p>`;
  }
}

init();
