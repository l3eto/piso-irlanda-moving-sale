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
    index: 0
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
  galleryModal: document.getElementById("galleryModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalMainImage: document.getElementById("modalMainImage"),
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
      card.dataset.itemId = String(item.id);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Abrir galeria de ${item.nombre}`);
      card.classList.add("cursor-pointer");
    } else {
      image.removeAttribute("src");
      image.alt = "";
      image.classList.add("hidden");
      imagePlaceholder.classList.remove("hidden");
      photosBadge.classList.add("hidden");
      delete card.dataset.itemId;
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.removeAttribute("aria-label");
      card.classList.remove("cursor-pointer");
    }

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
  if (!item || images.length === 0) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  state.modal.index = safeIndex;
  const currentImage = images[safeIndex];

  elements.modalTitle.textContent = item.nombre;
  elements.modalMeta.textContent = `#${item.id} · ${item.area} · ${item.unidades} ud.`;
  elements.modalMainImage.src = toAssetUrl(currentImage);
  elements.modalMainImage.alt = `Foto ${safeIndex + 1} de ${item.nombre}`;
  elements.modalMainImage.onerror = () => {
    elements.modalMainImage.removeAttribute("src");
    elements.modalMainImage.alt = "Imagen no disponible";
  };
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
  elements.modalCounter.textContent = `${safeIndex + 1} / ${images.length}`;

  const singleImage = images.length <= 1;
  setDisabled(elements.modalPrev, singleImage);
  setDisabled(elements.modalNext, singleImage);

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

function openModalForItem(itemId) {
  const item = getItemById(itemId);
  if (!item) {
    return;
  }
  const images = getImagesForItem(item.id);
  if (images.length === 0) {
    return;
  }

  state.modal.item = item;
  state.modal.images = images;
  state.modal.index = 0;
  renderModal();
  elements.galleryModal.classList.remove("hidden");
  elements.galleryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  elements.galleryModal.classList.add("hidden");
  elements.galleryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");
}

function changeModalImage(step) {
  if (state.modal.images.length <= 1) {
    return;
  }
  const nextIndex = (state.modal.index + step + state.modal.images.length) % state.modal.images.length;
  state.modal.index = nextIndex;
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
  elements.areaFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = `Todas las areas (${items.length})`;
  elements.areaFilter.appendChild(allOption);

  for (const area of sortedAreas) {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = `${area} (${areaCounts.get(area)})`;
    elements.areaFilter.appendChild(option);
  }

  if (preserveArea && areaCounts.has(preserveArea)) {
    elements.areaFilter.value = preserveArea;
  } else {
    state.filters.area = "";
    elements.areaFilter.value = "";
  }
}

function setupFilters() {
  elements.statusFilter.value = state.filters.status;

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.areaFilter.addEventListener("change", (event) => {
    state.filters.area = event.target.value;
    render();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    render();
  });

  elements.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
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
    openModalForItem(Number.parseInt(card.dataset.itemId, 10));
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
    openModalForItem(Number.parseInt(card.dataset.itemId, 10));
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
    setupCardInteraction();
    setupModalInteraction();
    render();
  } catch (error) {
    elements.grid.innerHTML = `<p class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${error.message}</p>`;
  }
}

init();
