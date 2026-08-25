// ------------------------------------------------------------
// EDIT THESE VALUES ONLY
// Add the five missing prices and replace the WeChat placeholder.
// Prices are numbers in euros, e.g. price: 13
// ------------------------------------------------------------
const SHOP_CONFIG = {
  wechatName: "XxxxXxxxx-Zzzz",
  products: [
  // {
  //   id: "small-strainer",
  //   image: "strainer.jpg",
  //   price: 3,
  //   name: { en: "Small strainer", zh: "小漏勺" },
  //   description: {
  //     en: "Small strainer, €3 each.",
  //     zh: "小漏勺，3欧1个。"
  //   }
  // },

  // {
  //   id: "large-strainer",
  //   image: "strainer.jpg",
  //   price: 2,
  //   name: { en: "Large strainer", zh: "大漏勺" },
  //   description: {
  //     en: "Large strainer, €2 each.",
  //     zh: "大漏勺，2欧1个。"
  //   }
  // },

  {
    id: "small-baking-tray",
    image: "small_baking_tray.jpg",
    price: 1.5,
    name: { en: "Small baking tray", zh: "小型烤盘" },
    description: {
      en: "Small baking tray, €1.50.",
      zh: "小型烤盘，1.5欧1个。"
    }
  },

  {
    id: "large-storage-box",
    image: "large_storage_box.jpg",
    price: 2,
    name: { en: "Large storage box", zh: "大盒子" },
    description: {
      en: "Large storage box, €2.",
      zh: "大盒子，2欧。"
    }
  },

  {
    id: "medium-lunch-box",
    image: "medium_lunch_box.jpg",
    price: 1.5,
    name: { en: "Medium lunch box", zh: "饭盒（中盒子）" },
    description: {
      en: "Medium-sized lunch/storage box, €1.50.",
      zh: "饭盒（中盒子），1.5欧。"
    }
  },

  {
    id: "small-storage-box",
    image: "small_storage_box.jpg",
    price: 0.3,
    name: { en: "Small storage box", zh: "小盒子" },
    description: {
      en: "Small storage box, €0.30 each. Five available.",
      zh: "小盒子，0.3欧1个，共5个。"
    },
    quantity: 5
  },

  {
    id: "dish-drying-rack",
    image: "dish_drying_rack.jpg",
    price: 1,
    name: { en: "Dish drying rack", zh: "沥水架" },
    description: {
      en: "Practical dish drying rack, €1.",
      zh: "实用沥水架，1欧1个。"
    }
  },

  {
    id: "blue-raincoat",
    image: "blue_raincoat.jpg",
    price: 2,
    name: { en: "Blue raincoat", zh: "蓝色雨衣" },
    description: {
      en: "Blue raincoat, €2.",
      zh: "蓝色雨衣，2欧。"
    }
  },

  {
    id: "seasoning-bottles",
    image: "seasoning_bottles.jpg",
    price: 2,
    name: { en: "10 small seasoning bottles", zh: "小型调味瓶（10个）" },
    description: {
      en: "Set of 10 small seasoning bottles, €2 for all. They can be emptied before pickup upon request.",
      zh: "小型调味瓶10个，共2欧。如有需要，可以在交付之前清空。"
    }
  },

  {
    id: "extra-large-wmf-pot",
    image: "extra_large_wmf_pot.jpg",
    price: 19,
    name: { en: "Extra-large WMF pot", zh: "特大号 WMF 锅" },
    description: {
      en: "Extra-large WMF cooking pot. Originally around €120, now offered for €19.",
      zh: "特大号WMF铁锅，原价约120欧，现在19欧出。"
    }
  },

  {
    id: "heat-resistant-gloves",
    image: "heat_resistant_gloves.jpg",
    price: 1,
    name: { en: "Heat-resistant gloves", zh: "防烫手套" },
    description: {
      en: "A pair of heat-resistant kitchen gloves, €1.",
      zh: "防烫手套一副，1欧。"
    }
  },

  {
    id: "quiet-fan",
    image: "quiet_fan.jpg",
    price: 19,
    name: { en: "Very quiet fan", zh: "静音风扇" },
    description: {
      en: "A very quiet and comfortable fan, suitable for sleeping or working. €19.",
      zh: "非常舒适的静音风扇，19欧出。"
    }
  },
  {
    id: "books",
    image: "books.jpg",
    price: 3,
    name: { en: "Books", zh: "书籍" },
    description: {
      en: "A small selection of books, 3 euro for each book, 7 for all",
      zh: "一些保存良好的全彩二手书籍，3欧一本，多买可以优惠"
    },
    quantity: 3,
  },
  {
    id: "cup-and-others",
    image: "cup_and_others.jpg",
    price: 2,
    name: { en: "Cups & others", zh: "杯子及杂物" },
    description: {
      en: "Cups and a few useful small household objects.",
      zh: "杯子和一些实用的家居小物，买其他物品可送，单买2欧打包"
    }
  },
  {
    id: "electric-grill",
    image: "electric_grill.jpg",
    price: 29,
    name: { en: "Electric grill", zh: "电烤炉" },
    description: {
      en: "Electric grill only used once, ready for a barbecue party.",
      zh: "崭新电烤炉，只用过一次，适合barbecue"
    }
  },
  {
    id: "pot",
    image: "pot.jpg",
    price: 8,
    name: { en: "Pot", zh: "锅" },
    description: {
      en: "A practical cooking pot.",
      zh: "实用的烹饪锅,适合煮泡面"
    }
  },
  // {
  //   id: "rice-cooker",
  //   image: "rice_cooker.jpg",
  //   price: 5,
  //   name: { en: "Rice cooker", zh: "电饭煲" },
  //   description: {
  //     en: "Rice cooker for everyday meals.",
  //     zh: "适合日常使用的电饭煲。"
  //   }
  // },
  {
    id: "umeshu",
    image: "Umeshu.jpg",
    price: 12.5,
    name: { en: "Umeshu", zh: "梅酒" },
    description: {
      en: "Umeshu bottle, offered for 12.5 euros.",
      zh: "梅酒一瓶，价格12.5欧元。"
    }
  },
  {
    id: "thick-cotton-quilt",
    image: "thick_cotton_quilt.jpg",
    price: 35,
    name: { en: "Thick cotton quilt", zh: "厚棉被" },
    description: {
      en: "A very thick, high-quality cotton quilt, newly bought and shipped from China. Never used because the apartment has heating. €35 with the cover, or €29 without the cover.",
      zh: "非常厚、质量很好的棉被，从中国新买寄来，因为家里有暖气所以从未使用。带外套（被套）35欧，不需要外套则29欧。"
    }
  },
  {
    id: "red-sweater",
    image: "red_sweater.jpg",
    price: 2,
    name: { en: "Red sweater", zh: "红色毛衣" },
    description: {
      en: "Red sweater. As far as I remember, it has never been worn.",
      zh: "红色毛衣，印象中没有穿过。"
    }
  },
  {
    id: "padded-trousers-1",
    image: "padded_trousers_1.jpg",
    price: 3,
    name: { en: "Padded winter trousers", zh: "棉裤" },
    description: {
      en: "Warm padded winter trousers.",
      zh: "保暖棉裤。"
    }
  },
  {
    id: "padded-trousers-2",
    image: "padded_trousers_2.jpg",
    price: 3,
    name: { en: "Padded winter trousers", zh: "另一件棉裤" },
    description: {
      en: "Warm padded winter trousers.",
      zh: "保暖棉裤。"
    }
  },
  {
    id: "black-trousers",
    image: "black_trousers.jpg",
    price: 2,
    name: { en: "Black trousers", zh: "黑色长裤" },
    description: {
      en: "Black long trousers.",
      zh: "黑色长裤。"
    }
  },
  {
    id: "grey-trousers",
    image: "grey_trousers.jpg",
    price: 2,
    name: { en: "Grey trousers", zh: "灰色长裤" },
    description: {
      en: "Grey long trousers.",
      zh: "灰色长裤。"
    }
  },
  {
    id: "bosideng-down-jacket",
    image: "bosideng_down_jacket.jpg",
    price: 5,
    name: { en: "Bosideng down jacket", zh: "波司登羽绒服" },
    description: {
      en: "Bosideng down jacket. There is some damage around the zipper, hence the low price.",
      zh: "波司登牌羽绒服，拉链处有些破损，因此低价出售。"
    }
  },
  {
    id: "duvet-cover-pillowcase",
    image: "duvet_cover_pillowcase.jpg",
    price: 2,
    name: { en: "Duvet cover & pillowcase", zh: "被套和枕头套" },
    description: {
      en: "Duvet cover and pillowcase set. €2, or free if your other items total more than €10.",
      zh: "被套和枕头套，2欧。购买其他物品总价超过10欧可免费赠送。"
    }
  },
  {
    id: "pillowcases-pair",
    image: "pillowcases_pair.jpg",
    price: 2,
    name: { en: "Two pillowcases", zh: "枕套（2件）" },
    description: {
      en: "Two pillowcases, €2 for the pair, or free if your other items total more than €8.",
      zh: "枕套2件，共2欧。购买其他物品总价超过8欧可免费赠送。"
    }
  },
  {
    id: "fitted-sheet",
    image: "fitted_sheet.jpg",
    price: 2,
    name: { en: "Fitted sheet", zh: "弹性床单" },
    description: {
      en: "Elasticated fitted sheet. €2, or free if your other items total more than €8.",
      zh: "弹性床单，2欧。购买其他物品总价超过8欧可免费赠送。"
    }
  },
  {
    id: "blanket",
    image: "blanket.jpg",
    price: 2,
    name: { en: "Blanket", zh: "毛毯" },
    description: {
      en: "Blanket, €2, or free if your other items total more than €15.",
      zh: "毛毯，2欧。购买其他物品总价超过15欧可免费赠送。"
    }
  },
  ]
};

const translations = {
  en: {
    eyebrow: "SECOND-HAND COLLECTION",
    siteTitle: "Objects looking for a new home",
    intro: "Most items are one-off. Add what you want to the cart, then send me a screenshot on WeChat.",
    cart: "Cart",
    availableNow: "AVAILABLE NOW",
    catalog: "Second-hand objects",
    mobileHint: "On a narrow screen, tap a card to reveal its photo.",
    contactKicker: "CONTACT",
    contactTitle: "Ready to reserve something?",
    wechat: "WeChat",
    screenshotHint: "Please take a screenshot of your cart and send it to me on WeChat.",
    yourSelection: "YOUR SELECTION",
    cartTitle: "Shopping cart",
    emptyCart: "Your cart is empty.",
    total: "Total",
    cartNote: "Items are reserved only after we confirm on WeChat.",
    clearCart: "Clear cart",
    showContact: "Show contact",
    oneAvailable: "1 available",
    addToCart: "Add to cart",
    added: "Added ✓",
    cancelAddition: "Click again to remove from cart",
    remove: "Remove",
    photoMissing: "Photo not found. Keep this HTML file next to the image named",
    priceNeeded: "price needed",
    addedToast: "Added to cart",
    removedToast: "Removed from cart",
    clearedToast: "Cart cleared",
    pickupNote: "Pickup only in Adlershof (12489 Berlin)",
  },
  zh: {
    eyebrow: "二手物品",
    siteTitle: "给闲置物品找一个新家",
    intro: "大多数物品仅一件。把想要的物品加入购物车，然后截图并通过微信联系我。",
    cart: "购物车",
    availableNow: "现有物品",
    catalog: "二手物品",
    mobileHint: "在单栏窄屏模式下，点击卡片即可展开并查看照片。",
    contactKicker: "联系方式",
    contactTitle: "想预留这些物品？",
    wechat: "微信",
    screenshotHint: "请截图购物车，并把截图通过微信发给我。",
    yourSelection: "你的选择",
    cartTitle: "购物车",
    emptyCart: "购物车还是空的。",
    total: "合计",
    cartNote: "物品需在微信确认后才算预留成功。",
    clearCart: "清空购物车",
    showContact: "查看联系方式",
    oneAvailable: "仅 1 件",
    addToCart: "加入购物车",
    added: "已加入 ✓",
    cancelAddition: "再次点击可取消加入",
    remove: "移除",
    photoMissing: "未找到照片。请确保网页文件与以下图片放在同一文件夹：",
    priceNeeded: "价格待定",
    addedToast: "已加入购物车",
    removedToast: "已从购物车移除",
    clearedToast: "购物车已清空",
    pickupNote: "Adlershof 区域（12489 Berlin）自取",
  }
};

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The site still works if a browser blocks storage for local files.
  }
}

let storedCart = [];
try {
  storedCart = JSON.parse(readStorage("secondhand-cart", "[]"));
  if (!Array.isArray(storedCart)) storedCart = [];
} catch {
  storedCart = [];
}

const state = {
  lang: readStorage("secondhand-lang", "en"),
  cart: storedCart
};

const productGrid = document.getElementById("productGrid");
const cartPanel = document.getElementById("cartPanel");
const cartButton = document.getElementById("cartButton");
const cartItems = document.getElementById("cartItems");
const emptyCart = document.getElementById("emptyCart");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const clearCartButton = document.getElementById("clearCart");
const contactShortcut = document.getElementById("contactShortcut");
const toast = document.getElementById("toast");
const wechatName = document.getElementById("wechatName");

let toastTimeout;

// Mobile edge-swipe cart state.
const MOBILE_CART_BREAKPOINT = 700;
const EDGE_SWIPE_ZONE = 34;
let cartGesture = null;

function t(key) {
  return translations[state.lang][key] || key;
}

function productById(id) {
  return SHOP_CONFIG.products.find((product) => product.id === id);
}

function priceText(product, lang = state.lang) {
  if (typeof product.price !== "number") return translations[lang].priceNeeded;
  return lang === "zh" ? `${product.price} €` : `${product.price} €`;
}

function productTitle(product) {
  return `${product.name[state.lang]} ${priceText(product)}`;
}

function saveCart() {
  writeStorage("secondhand-cart", JSON.stringify(state.cart));
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 1500);
}

function addToCart(id) {
  if (state.cart.includes(id)) return;
  state.cart.push(id);
  saveCart();
  renderProducts();
  renderCart();
  showToast(t("addedToast"));
}

function removeFromCart(id) {
  state.cart = state.cart.filter((itemId) => itemId !== id);
  saveCart();
  renderProducts();
  renderCart();
  showToast(t("removedToast"));
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderProducts();
  renderCart();
  showToast(t("clearedToast"));
}

function setLanguage(lang) {
  state.lang = lang;
  writeStorage("secondhand-lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });

  document.querySelectorAll(".lang-button").forEach((button) => {
    const active = button.dataset.lang === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderProducts();
  renderCart();
  document.getElementById("pickupNote").textContent = t("pickupNote");
}

function renderProducts() {
  productGrid.innerHTML = "";

  SHOP_CONFIG.products.forEach((product, index) => {
    const inCart = state.cart.includes(product.id);
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id;

    const media = document.createElement("div");
    media.className = "product-media";
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name[state.lang];
    image.loading = "lazy";
    image.addEventListener("error", () => {
      media.classList.add("is-missing");
      media.append(document.createTextNode(`${t("photoMissing")} ${product.image}`));
    });
    media.append(image);

    const body = document.createElement("div");
    body.className = "product-body";

    const topLine = document.createElement("div");
    topLine.className = "product-topline";

    const titleWrap = document.createElement("div");
    titleWrap.className = "product-title-wrap";
    titleWrap.innerHTML = `
    <p class="product-index">${String(index + 1).padStart(2, "0")}</p>
    <h3 class="product-title">${productTitle(product)}</h3>
    `;

    const toggle = document.createElement("button");
    toggle.className = "product-toggle";
    toggle.type = "button";
    toggle.textContent = "+";
    toggle.setAttribute("aria-label", state.lang === "zh" ? `展开 ${product.name.zh}` : `Expand ${product.name.en}`);
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const expanded = card.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", String(expanded));
    });

    topLine.append(titleWrap, toggle);

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description[state.lang];

    const actions = document.createElement("div");
    actions.className = "product-actions";
    const stock = document.createElement("span");
    stock.className = "stock-label";
    const quantity = product.quantity ?? 1;
    stock.textContent =
    state.lang === "zh"
    ? `${quantity} 件`
    : `${quantity} available`;

    const addButton = document.createElement("button");
    addButton.className = `add-button${inCart ? " is-added" : ""}`;
    addButton.type = "button";
    addButton.textContent = inCart ? t("added") : t("addToCart");
    addButton.setAttribute("aria-pressed", String(inCart));
    addButton.setAttribute(
      "aria-label",
      inCart
      ? `${product.name[state.lang]} — ${t("cancelAddition")}`
      : `${t("addToCart")} — ${product.name[state.lang]}`
      );
    addButton.title = inCart ? t("cancelAddition") : t("addToCart");
    addButton.addEventListener("click", () => {
      if (state.cart.includes(product.id)) removeFromCart(product.id);
      else addToCart(product.id);
    });

    actions.append(stock, addButton);
    body.append(topLine, description, actions);
    card.append(media, body);
    productGrid.append(card);
  });
}

function renderCart() {
  cartItems.innerHTML = "";
  emptyCart.hidden = state.cart.length > 0;

  let total = 0;
  let hasUnknownPrice = false;

  state.cart.forEach((id) => {
    const product = productById(id);
    if (!product) return;

    if (typeof product.price === "number") total += product.price;
    else hasUnknownPrice = true;

    const item = document.createElement("div");
    item.className = "cart-item";

    const name = document.createElement("p");
    name.className = "cart-item-name";
    name.textContent = product.name[state.lang];

    const price = document.createElement("span");
    price.className = "cart-item-price";
    price.textContent = priceText(product);

    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute(
      "aria-label",
      state.lang === "zh" ? `${t("remove")} ${product.name.zh}` : `${t("remove")} ${product.name.en}`
      );
    remove.addEventListener("click", () => removeFromCart(id));

    item.append(name, price, remove);
    cartItems.append(item);
  });

  cartCount.textContent = state.cart.length;
  cartCount.setAttribute("aria-label", `${state.cart.length} items`);
  cartTotal.textContent = hasUnknownPrice
  ? (state.lang === "zh" ? `€${total} + 待定价格` : `€${total} + pending prices`)
  : `€${total}`;
}

function resetCartDragStyles() {
  cartPanel.classList.remove("is-dragging");
  cartPanel.style.removeProperty("--cart-drag-x");
  cartPanel.style.removeProperty("--cart-backdrop-opacity");
}

function openCart({ focusCloseButton = true } = {}) {
  resetCartDragStyles();
  cartPanel.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
  cartButton.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  if (focusCloseButton) cartPanel.querySelector(".icon-button").focus();
}

function closeCart({ returnFocus = true } = {}) {
  resetCartDragStyles();
  cartPanel.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
  cartButton.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  if (returnFocus) cartButton.focus();
}

function isNarrowScreen() {
  return window.matchMedia(`(max-width: ${MOBILE_CART_BREAKPOINT}px)`).matches;
}

function cartSheetWidth() {
  const sheet = cartPanel.querySelector(".cart-sheet");
  return sheet.getBoundingClientRect().width || window.innerWidth;
}

function startCartEdgeGesture(event) {
  if (!isNarrowScreen() || cartPanel.classList.contains("is-open") || event.touches.length !== 1) return;

  const touch = event.touches[0];
  if (touch.clientX < window.innerWidth - EDGE_SWIPE_ZONE) return;

  cartGesture = {
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    lastTime: performance.now(),
    velocityX: 0,
    active: false
  };
}

function moveCartEdgeGesture(event) {
  if (!cartGesture || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const dx = touch.clientX - cartGesture.startX;
  const dy = touch.clientY - cartGesture.startY;

  // Wait until the gesture is clearly horizontal so regular page scrolling stays natural.
  if (!cartGesture.active) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      cartGesture = null;
      return;
    }
    if (dx > -8) return;
    if (Math.abs(dx) <= Math.abs(dy)) return;

    cartGesture.active = true;
    cartPanel.classList.add("is-dragging");
    cartPanel.setAttribute("aria-hidden", "false");
  }

  event.preventDefault();

  const width = cartSheetWidth();
  const dragDistance = Math.min(width, Math.max(0, -dx));
  const remaining = width - dragDistance;
  const progress = dragDistance / width;
  const now = performance.now();
  const elapsed = Math.max(1, now - cartGesture.lastTime);
  cartGesture.velocityX = (touch.clientX - cartGesture.lastX) / elapsed;
  cartGesture.lastX = touch.clientX;
  cartGesture.lastTime = now;

  cartPanel.style.setProperty("--cart-drag-x", `${remaining}px`);
  cartPanel.style.setProperty("--cart-backdrop-opacity", String(0.34 * progress));
}

function finishCartEdgeGesture() {
  if (!cartGesture) return;

  const wasActive = cartGesture.active;
  const width = cartSheetWidth();
  const rawRemaining = parseFloat(cartPanel.style.getPropertyValue("--cart-drag-x"));
  const remaining = Number.isFinite(rawRemaining) ? rawRemaining : width;
  const progress = 1 - remaining / width;
  const shouldOpen = wasActive && (progress >= 0.32 || cartGesture.velocityX < -0.45);
  cartGesture = null;

  if (shouldOpen) {
    openCart({ focusCloseButton: false });
  } else {
    resetCartDragStyles();
    cartPanel.setAttribute("aria-hidden", "true");
  }
}

cartButton.addEventListener("click", () => openCart());
document.querySelectorAll("[data-close-cart]").forEach((element) => element.addEventListener("click", () => closeCart()));

document.addEventListener("touchstart", startCartEdgeGesture, { passive: true });
document.addEventListener("touchmove", moveCartEdgeGesture, { passive: false });
document.addEventListener("touchend", finishCartEdgeGesture, { passive: true });
document.addEventListener("touchcancel", finishCartEdgeGesture, { passive: true });
clearCartButton.addEventListener("click", clearCart);
contactShortcut.addEventListener("click", () => {
  closeCart({ returnFocus: false });
  document.querySelector(".contact-card").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelectorAll(".lang-button").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartPanel.classList.contains("is-open")) closeCart();
});

wechatName.textContent = SHOP_CONFIG.wechatName;
setLanguage(state.lang);
