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
  },
  favorites: [],
  historySetup: false,
  isDirectEntry: false
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
  modalUnitsRow: document.getElementById("modalUnitsRow"),
  modalUnitsInfo: document.getElementById("modalUnitsInfo"),
  modalSizeRow: document.getElementById("modalSizeRow"),
  modalSize: document.getElementById("modalSize"),
  modalDescriptionRow: document.getElementById("modalDescriptionRow"),
  modalDescription: document.getElementById("modalDescription"),
  modalWallapop: document.getElementById("modalWallapop"),
  modalThumbs: document.getElementById("modalThumbs"),
  modalCounter: document.getElementById("modalCounter"),
  modalPrev: document.getElementById("modalPrev"),
  modalNext: document.getElementById("modalNext"),
  modalFavoriteBtn: document.getElementById("modalFavoriteBtn"),
  favoritesToggle: document.getElementById("favoritesToggle"),
  favoritesBadge: document.getElementById("favoritesBadge"),
  favoritesModal: document.getElementById("favoritesModal"),
  favoritesModalClose: document.getElementById("favoritesModalClose"),
  favoritesList: document.getElementById("favoritesList"),
  favoritesTotal: document.getElementById("favoritesTotal"),
  shareButton: document.getElementById("shareButton")
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

function getOfferPrice(item) {
  if (item.oferta && Number.isFinite(Number(item.oferta))) {
    return Number(item.oferta);
  }
  return null;
}

function hasOffer(item) {
  return getOfferPrice(item) !== null;
}

function getDiscountAmount(item) {
  const offerPrice = getOfferPrice(item);
  if (offerPrice === null) {
    return 0;
  }
  const regularPrice = getHerePrice(item);
  return regularPrice - offerPrice;
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
  
  // Siempre hacer push del hash (solo si no es entrada directa, que ya se encarga checkUrlHash)
  if (!state.isDirectEntry) {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#product-${itemId}`);
  }
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
      // Si es la primera carga con hash directo
      if (!state.historySetup && !state.isDirectEntry) {
        state.historySetup = true;
        state.isDirectEntry = true;
        
        // Esperar 500ms para que el navegador registre la entrada inicial
        setTimeout(() => {
          const separator = window.location.search ? "&" : "?";
          const baseUrl = `${window.location.pathname}${window.location.search}${separator}_m=1`;
          
          // Cambiar URL con param temporal (sin hash)
          window.history.replaceState(null, "", baseUrl);
          // Pushear con hash
          window.history.pushState(null, "", `${baseUrl}${hash}`);
          // Ahora abrir la modal
          openModalForItemId(productId);
        }, 500);
        
        return;
      }
      
      // Click normal desde el listado
      openModalForItemId(productId);
    }
  }
}

function loadFavorites() {
  const saved = localStorage.getItem("favorites");
  state.favorites = saved ? JSON.parse(saved) : [];
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
}

function updateFavoritesBadge() {
  if (state.favorites.length === 0) {
    elements.favoritesBadge.classList.add("hidden");
  } else {
    elements.favoritesBadge.classList.remove("hidden");
    elements.favoritesBadge.textContent = state.favorites.length;
  }
}

function updateFavoriteBtnStyle(btn, isFavorited) {
  if (isFavorited) {
    btn.classList.add("text-red-500");
    btn.classList.remove("text-slate-600");
    btn.title = "Quitar de favoritos";
  } else {
    btn.classList.remove("text-red-500");
    btn.classList.add("text-slate-600");
    btn.title = "Agregar a favoritos";
  }
}

function updateCardFavoriteBtns() {
  document.querySelectorAll(".item-favorite-btn").forEach(btn => {
    const card = btn.closest(".item-card");
    if (!card) return;
    
    const itemId = Number.parseInt(card.dataset.itemId, 10);
    const isFav = state.favorites.some(f => f.id === itemId);
    updateFavoriteBtnStyle(btn, isFav);
  });
}



function canAddToFavorites(item) {
  return normalizeEstado(item.estado) === "disponible";
}

function isFavorited(itemId) {
  return state.favorites.some(fav => fav.id === itemId);
}

function addToFavorites(itemId, quantity = 1) {
  const item = getItemById(itemId);
  if (!item || !canAddToFavorites(item)) {
    return false;
  }
  
  const existing = state.favorites.find(fav => fav.id === itemId);
  if (existing) {
    existing.cantidad += quantity;
  } else {
    state.favorites.push({ id: itemId, cantidad: quantity });
  }
  
  saveFavorites();
  updateFavoritesBadge();
  updateCardFavoriteBtns();
  renderFavorites();
  updateModalFavoriteButton();
  return true;
}

function removeFromFavorites(itemId) {
  state.favorites = state.favorites.filter(fav => fav.id !== itemId);
  saveFavorites();
  updateFavoritesBadge();
  updateCardFavoriteBtns();
  renderFavorites();
  updateModalFavoriteButton();
}

function updateFavoriteQuantity(itemId, quantity) {
  const favorite = state.favorites.find(fav => fav.id === itemId);
  if (favorite) {
    const item = getItemById(itemId);
    const maxQuantity = item ? item.unidades : 999;
    favorite.cantidad = Math.max(1, Math.min(quantity, maxQuantity));
    saveFavorites();
    renderFavorites();
  }
}

function updateModalFavoriteButton() {
  if (!state.modal.item) return;
  
  const isFav = isFavorited(state.modal.item.id);
  const canAdd = canAddToFavorites(state.modal.item);
  
  elements.modalFavoriteBtn.disabled = !canAdd;
  
  if (!canAdd) {
    elements.modalFavoriteBtn.classList.add("cursor-not-allowed", "opacity-50");
    elements.modalFavoriteBtn.classList.remove("hover:bg-red-50");
    const status = normalizeEstado(state.modal.item.estado);
    const statusLabel = status === "reservado" ? "Reservado" : "Vendido";
    elements.modalFavoriteBtn.textContent = `❌ ${statusLabel}`;
  } else if (isFav) {
    elements.modalFavoriteBtn.classList.remove("cursor-not-allowed", "opacity-50");
    elements.modalFavoriteBtn.classList.add("hover:bg-red-50");
    elements.modalFavoriteBtn.textContent = `♥ Quitar de favoritos`;
    elements.modalFavoriteBtn.classList.add("bg-red-50");
  } else {
    elements.modalFavoriteBtn.classList.remove("cursor-not-allowed", "opacity-50", "bg-red-50");
    elements.modalFavoriteBtn.classList.add("hover:bg-red-50");
    elements.modalFavoriteBtn.textContent = `♥ Agregar a favoritos`;
  }
}

function generateShareMessage() {
  if (state.favorites.length === 0) {
    return "Hola, me gustaría compartir estos productos contigo!";
  }
  
  let message = "Hola Beto! 👋\n\nMe interesan estos productos:\n\n";
  let total = 0;
  let totalWithoutOffer = 0;
  
  for (const fav of state.favorites) {
    const item = getItemById(fav.id);
    if (!item) continue;
    
    // Usar precio de oferta si existe, sino usar precio web
    const regularPrice = getHerePrice(item);
    const price = hasOffer(item) ? getOfferPrice(item) : regularPrice;
    const itemTotal = price * fav.cantidad;
    const itemTotalWithoutOffer = regularPrice * fav.cantidad;
    total += itemTotal;
    totalWithoutOffer += itemTotalWithoutOffer;
    
    const status = normalizeEstado(item.estado);
    let statusLabel = "";
    if (status === "reservado") statusLabel = " ⏳ (reservado)";
    else if (status === "vendido") statusLabel = " ✓ (vendido)";
    
    message += `📌 Ref #${item.id} - ${item.nombre}\n`;
    message += `   Precio: ${formatPrice(price)}`;
    if (hasOffer(item)) {
      message += ` (${formatPrice(regularPrice)} tachado)`;
    }
    message += ` x ${fav.cantidad} = ${formatPrice(itemTotal)}${statusLabel}\n\n`;
  }
  
  message += `💰 Total: ${formatPrice(total)}`;
  if (total < totalWithoutOffer) {
    message += ` (${formatPrice(totalWithoutOffer)} sin descuento)`;
  }
  message += `\n\n¡Gracias!`;
  return message;
}

function renderFavorites() {
  elements.favoritesList.innerHTML = "";
  
  if (state.favorites.length === 0) {
    elements.favoritesList.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <p class="text-center text-slate-600">
          <span class="block font-semibold">Aún no tienes favoritos</span>
          <span class="block text-sm">Haz clic en el corazón para agregar productos</span>
        </p>
      </div>
    `;
    elements.favoritesTotal.textContent = "0€";
    document.getElementById("favoritesCount").textContent = "0 productos";
    
    // Ocultar botón de compartir
    const shareContainer = document.getElementById("shareButtonContainer");
    if (shareContainer) {
      shareContainer.style.display = "none";
    }
    return;
  }
  
  // Mostrar botón de compartir
  const shareContainer = document.getElementById("shareButtonContainer");
  if (shareContainer) {
    shareContainer.style.display = "block";
  }
  
  let total = 0;
  let totalWithoutOffer = 0;
  const fragment = document.createDocumentFragment();
  
  for (const fav of state.favorites) {
    const item = getItemById(fav.id);
    if (!item) continue;
    
    // Usar precio de oferta si existe, sino usar precio web
    const regularPrice = getHerePrice(item);
    const price = hasOffer(item) ? getOfferPrice(item) : regularPrice;
    const itemTotal = price * fav.cantidad;
    const itemTotalWithoutOffer = regularPrice * fav.cantidad;
    total += itemTotal;
    totalWithoutOffer += itemTotalWithoutOffer;
    
    const status = normalizeEstado(item.estado);
    let statusBadge = "";
    let statusClass = "";
    
    if (status === "reservado") {
      statusBadge = `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">⏳ Reservado</span>`;
      statusClass = "opacity-60";
    } else if (status === "vendido") {
      statusBadge = `<span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">✓ Vendido</span>`;
      statusClass = "opacity-60";
    }
    
    const itemDiv = document.createElement("div");
    itemDiv.className = `rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md ${statusClass}`;
    
    const itemImages = getImagesForItem(item.id);
    const imageUrl = itemImages.length > 0 ? toAssetUrl(itemImages[0]) : null;
    
    let imageHTML = `
      <div class="w-24 h-24 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
        ${imageUrl ? `<img src="${imageUrl}" alt="${item.nombre}" class="w-full h-full object-cover" onerror="this.style.display='none'" />` : `
          <div class="flex flex-col items-center justify-center text-slate-400 text-xs text-center p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <path d="M21 15l-4.5-4.5L8 19"></path>
            </svg>
            No hay imagen
          </div>
        `}
      </div>
    `;
    
    const description = String(item.descripcion || "").trim();
    
    const isAtMin = fav.cantidad <= 1;
    const isAtMax = fav.cantidad >= item.unidades;
    
    // Mostrar precios con tachado si hay oferta
    let unitPriceHTML = `<p class="font-bold text-green-600">${formatPrice(price)}`;
    if (hasOffer(item)) {
      unitPriceHTML += ` <span class="text-slate-400 line-through text-sm ml-1">${formatPrice(regularPrice)}</span>`;
    }
    unitPriceHTML += `</p>`;
    
    let subtotalHTML = `<p class="font-bold text-sky-600">${formatPrice(itemTotal)}`;
    if (hasOffer(item)) {
      subtotalHTML += ` <span class="text-slate-400 line-through text-sm ml-1">${formatPrice(itemTotalWithoutOffer)}</span>`;
    }
    subtotalHTML += `</p>`;
    
    itemDiv.innerHTML = `
      <div class="flex gap-3 p-3">
        ${imageHTML}
        <div class="flex-1 flex flex-col gap-2 min-w-0">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1">
              <p class="font-bold text-slate-900 text-sm truncate">${item.nombre}</p>
              ${statusBadge}
            </div>
            <p class="text-xs text-slate-500">Ref: <span class="font-mono font-semibold">#${item.id}</span></p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded bg-slate-50 p-1.5">
              <p class="text-slate-600 font-medium">Unit.</p>
              ${unitPriceHTML}
            </div>
            <div class="rounded bg-slate-50 p-1.5">
              <p class="text-slate-600 font-medium">Subtotal</p>
              ${subtotalHTML}
            </div>
          </div>
          
          ${description ? `<p class="text-xs text-slate-600 line-clamp-2">${description}</p>` : ''}
          
          <div class="flex items-center gap-1 mt-auto">
            <button class="favorite-qty-btn decrease rounded border border-slate-300 px-1.5 py-0.5 text-xs font-bold hover:bg-slate-100 ${isAtMin ? 'opacity-40 cursor-not-allowed' : ''}" data-item-id="${item.id}" ${isAtMin ? 'disabled' : ''}>−</button>
            <span class="text-xs font-bold text-blue-600 w-6 text-center">${fav.cantidad}</span>
            <button class="favorite-qty-btn increase rounded border border-slate-300 px-1.5 py-0.5 text-xs font-bold hover:bg-slate-100 ${isAtMax ? 'opacity-40 cursor-not-allowed' : ''}" data-item-id="${item.id}" ${isAtMax ? 'disabled' : ''}>+</button>
            <button class="favorite-remove ml-auto rounded bg-rose-50 border border-rose-300 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100" data-item-id="${item.id}">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
    
    fragment.appendChild(itemDiv);
  }
  
  elements.favoritesList.appendChild(fragment);
  
  // Mostrar total con tachado si hay ofertas
  let totalHTML = formatPrice(total);
  if (total < totalWithoutOffer) {
    totalHTML += ` <span class="text-slate-400 line-through text-sm ml-1">${formatPrice(totalWithoutOffer)}</span>`;
  }
  elements.favoritesTotal.innerHTML = totalHTML;
  document.getElementById("favoritesCount").textContent = `${state.favorites.length} ${state.favorites.length === 1 ? "producto" : "productos"}`;
  
  // Agregar event listeners
  elements.favoritesList.querySelectorAll(".favorite-qty-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const itemId = Number.parseInt(e.target.dataset.itemId, 10);
      const fav = state.favorites.find(f => f.id === itemId);
      if (!fav) return;
      
      if (e.target.classList.contains("increase")) {
        updateFavoriteQuantity(itemId, fav.cantidad + 1);
      } else {
        updateFavoriteQuantity(itemId, fav.cantidad - 1);
      }
    });
  });
  
  elements.favoritesList.querySelectorAll(".favorite-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const itemId = Number.parseInt(e.target.dataset.itemId, 10);
      removeFromFavorites(itemId);
    });
  });
}

function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function itemMatchesFilters(item) {
  const itemNameNormalized = normalizeText(item.nombre);
  const searchNormalized = normalizeText(state.filters.search);
  const bySearch = !state.filters.search || itemNameNormalized.includes(searchNormalized);
  const byArea = !state.filters.area || item.area === state.filters.area;
  const byStatus = !state.filters.status || normalizeEstado(item.estado) === state.filters.status;
  return bySearch && byArea && byStatus;
}

function itemMatchesSearchAndStatus(item) {
  const itemNameNormalized = normalizeText(item.nombre);
  const searchNormalized = normalizeText(state.filters.search);
  const bySearch = !state.filters.search || itemNameNormalized.includes(searchNormalized);
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
    case "discountDesc":
    default:
      sorted.sort((a, b) => {
        const discountA = getDiscountAmount(a);
        const discountB = getDiscountAmount(b);
        if (discountA !== discountB) {
          return discountB - discountA;
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
    const herePrice = node.querySelector(".item-here-price");
    const offerPrice = node.querySelector(".item-offer-price");
    const sizeRow = node.querySelector(".item-size-row");
    const size = node.querySelector(".item-size");
    const link = node.querySelector(".item-link");
    const favoriteBtn = node.querySelector(".item-favorite-btn");

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
    
    // Manejo de precios y ofertas
    const regularPrice = getHerePrice(item);
    const offer = getOfferPrice(item);
    const hasOff = hasOffer(item);
    const unitsRow = node.querySelector(".item-units-row");
    const unitsInfo = node.querySelector(".item-units-info");
    
    if (hasOff) {
      // CON OFERTA: mostrar "Y€ (X€ tachado)" - Y en rojo
      offerPrice.textContent = formatPrice(offer);
      offerPrice.classList.add("text-red-600");
      offerPrice.classList.remove("text-slate-700");
      herePrice.textContent = formatPrice(regularPrice);
      herePrice.classList.remove("hidden");
    } else {
      // SIN OFERTA: mostrar solo el precio web (normal, no rojo)
      offerPrice.textContent = formatPrice(regularPrice);
      offerPrice.classList.remove("text-red-600");
      offerPrice.classList.add("text-slate-700");
      herePrice.classList.add("hidden");
    }
    
    // Mostrar unidades + total si hay más de 1
    if (item.unidades > 1) {
      const finalPrice = hasOff ? offer : regularPrice;
      const totalAmount = finalPrice * item.unidades;
      unitsInfo.textContent = `${item.unidades} unidades × ${formatPrice(finalPrice)} = ${formatPrice(totalAmount)}`;
      unitsRow.classList.remove("hidden");
    } else {
      unitsRow.classList.add("hidden");
    }
    
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

    // Configurar botón de favoritos
    const canFavorite = canAddToFavorites(item);
    
    if (canFavorite) {
      favoriteBtn.disabled = false;
      favoriteBtn.classList.remove("opacity-40", "cursor-not-allowed");
      favoriteBtn.classList.add("cursor-pointer");
      
      // Actualizar estilo inicial
      const isFavorited = state.favorites.some(f => f.id === item.id);
      updateFavoriteBtnStyle(favoriteBtn, isFavorited);
      
      // Toggle dinámico: verifica el estado actual en tiempo real
      favoriteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentlyFavorited = state.favorites.some(f => f.id === item.id);
        if (currentlyFavorited) {
          removeFromFavorites(item.id);
        } else {
          addToFavorites(item.id);
        }
      });
    } else {
      favoriteBtn.disabled = true;
      favoriteBtn.classList.add("opacity-40", "cursor-not-allowed");
      favoriteBtn.classList.remove("cursor-pointer");
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
  
  // Manejo de oferta en la modal
  const offerPrice = getOfferPrice(item);
  const hasOff = hasOffer(item);
  const regularPrice = getHerePrice(item);
  
  if (hasOff) {
    // CON OFERTA: mostrar "Y€ (X€ tachado)"
    elements.modalHerePrice.textContent = formatPrice(offerPrice);
    elements.modalHerePrice.classList.remove("text-green-600");
    elements.modalHerePrice.classList.add("text-red-600");
    elements.modalWallapopPrice.textContent = formatPrice(regularPrice);
    elements.modalWallapopPrice.classList.remove("hidden");
  } else {
    // SIN OFERTA: solo mostrar precio web
    elements.modalHerePrice.textContent = formatPrice(regularPrice);
    elements.modalHerePrice.classList.remove("text-red-600");
    elements.modalHerePrice.classList.add("text-green-600");
    elements.modalWallapopPrice.classList.add("hidden");
  }
  
  // Mostrar cantidad y total si hay más de 1 unidad
  if (item.unidades > 1) {
    const finalPrice = hasOff ? offerPrice : regularPrice;
    const totalAmount = finalPrice * item.unidades;
    elements.modalUnitsInfo.textContent = `${item.unidades} unidades × ${formatPrice(finalPrice)} = ${formatPrice(totalAmount)}`;
    elements.modalUnitsRow.classList.remove("hidden");
  } else {
    elements.modalUnitsRow.classList.add("hidden");
  }
  
  const sizeText = formatSize(item.medidas);
  if (sizeText !== "-") {
    elements.modalSize.textContent = sizeText;
    elements.modalSizeRow.classList.remove("hidden");
  } else {
    elements.modalSize.textContent = "";
    elements.modalSizeRow.classList.add("hidden");
  }
  
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
  
  updateModalFavoriteButton();
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

function setupFavoritesUI() {
  elements.favoritesToggle.addEventListener("click", () => {
    elements.favoritesModal.classList.remove("hidden");
    elements.favoritesModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");
    renderFavorites();
    // Agregar entrada al historial para que el back cierre la modal
    window.history.pushState({ modal: "favorites" }, "", window.location.href);
  });

  elements.favoritesModalClose.addEventListener("click", () => {
    elements.favoritesModal.classList.add("hidden");
    elements.favoritesModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");
  });

  elements.favoritesModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close='true']")) {
      elements.favoritesModal.classList.add("hidden");
      elements.favoritesModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overflow-hidden");
      return;
    }
  });

  elements.shareButton.addEventListener("click", () => {
    const message = generateShareMessage();
    
    // Intentar usar Web Share API (la mejor opción)
    if (navigator.share) {
      navigator.share({
        title: "Mi lista de productos",
        text: message
      }).catch(() => {
        // Si el usuario cancela, no hacer nada
      });
    } else {
      // Fallback: crear link de WhatsApp Web
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      // Intentar abrir en pestaña nueva
      if (typeof window !== "undefined") {
        window.open(whatsappUrl, "_blank");
      }
    }
  });

  elements.modalFavoriteBtn.addEventListener("click", () => {
    if (!state.modal.item) return;
    
    const itemId = state.modal.item.id;
    const isFav = isFavorited(itemId);
    
    if (isFav) {
      removeFromFavorites(itemId);
    } else {
      addToFavorites(itemId, 1);
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
    loadFavorites();
    updateFavoritesBadge();
    setupFilters();
    loadFiltersFromUrl();
    setupCardInteraction();
    setupModalInteraction();
    setupFavoritesUI();
    render();
    
    // Listener para manejar el back button
    window.addEventListener("popstate", (event) => {
      // Cerrar modal de galería si no hay hash de producto
      if (!window.location.hash.startsWith("#product-")) {
        closeModalAndRestoreUrl();
      }
      // Cerrar modal de favoritos si se ejecuta un popstate
      if (!elements.favoritesModal.classList.contains("hidden")) {
        elements.favoritesModal.classList.add("hidden");
        elements.favoritesModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("overflow-hidden");
      }
    });
    
    checkUrlHash();
  } catch (error) {
    elements.grid.innerHTML = `<p class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">${error.message}</p>`;
  }
}

init();
