// =====================================================
// config.js - إعدادات نظام المطعم (نسخة Google Sheets فقط)
// =====================================================

// 🌐 رابط QR للقائمة العامة (GitHub Pages)
const PUBLIC_MENU_URL = "https://toto-dz.github.io/pizza_djafoura/menudj.html";

// 🔗 رابط Google Apps Script
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhdsrYb8c5clZtSb7E_ReewG1XQZJHz0MYEGsOmlqnRgMKxkQwTtJyAf5XZWEAVdprqg/exec";

// ⚙️ إعدادات نظام النقاط
const POINTS_PER_100_DZD = 1;

// 🏆 المستويات
const LOYALTY_LEVELS = [
  { name: "برونزي", min: 0, max: 99, color: "#CD7F32", badge: "🥉", class: "level-bronze" },
  { name: "فضي", min: 100, max: 299, color: "#C0C0C0", badge: "🥈", class: "level-silver" },
  { name: "ذهبي", min: 300, max: Infinity, color: "#FFD700", badge: "🥇", class: "level-gold" },
];

// 🎁 المكافآت
const LOYALTY_REWARDS = [
  { id: "مشروب مجاني", points: 50, reward: "مشروب مجاني", icon: "🥤" },
  { id: "ميني بيتزا مجانية", points: 100, reward: "ميني بيتزا مجانية", icon: "🍕" },
  { id: "خصم 300 دج", points: 200, reward: "خصم 300 دج", icon: "💰" },
  { id: "وجبة مجانية", points: 300, reward: "وجبة مجانية", icon: "🍽️" },
];

// 📊 حالات الطلب
const STATUS_LABELS = {
  new: { label: "طلب جديد", color: "#3b82f6", icon: "🆕" },
  preparing: { label: "قيد التحضير", color: "#f59e0b", icon: "👨‍🍳" },
  ready: { label: "جاهز للتسليم", color: "#10b981", icon: "✅" },
  delivered: { label: "تم التسليم", color: "#6b7280", icon: "🎉" },
  cancelled: { label: "ملغى", color: "#ef4444", icon: "❌" },
};

// 🍽️ المنتجات الافتراضية
const MENU_DATA_VERSION = "djafoura-menu-images-2026-06-05";

const DEFAULT_PRODUCTS = [
  { id: 1, name: "بيتزا مارغريتا", price: 300, category: "pizza", image: "assets/menu/pizza.svg", available: true },
  { id: 2, name: "بيتزا تونة", price: 400, category: "pizza", image: "assets/menu/pizza.svg", available: true },
  { id: 3, name: "بيتزا لحم مفروم", price: 500, category: "pizza", image: "assets/menu/pizza.svg", available: true },
  { id: 4, name: "بيتزا دجاج", price: 700, category: "pizza", image: "assets/menu/pizza.svg", available: true },
  { id: 5, name: "بيتزا 4 فصول", price: 500, category: "pizza", image: "assets/menu/pizza.svg", available: true },
  { id: 6, name: "ميني دجاج", price: 500, category: "mini", image: "assets/menu/mini.svg", available: true },
  { id: 7, name: "ميني لحم مفروم", price: 500, category: "mini", image: "assets/menu/mini.svg", available: true },
  { id: 8, name: "ميني تونة", price: 500, category: "mini", image: "assets/menu/mini.svg", available: true },
  { id: 9, name: "تاكوس", price: 500, category: "tacos", image: "assets/menu/tacos.svg", available: true },
  { id: 10, name: "تاكوس غراتيني", price: 600, category: "tacos", image: "assets/menu/tacos.svg", available: true },
  { id: 11, name: "بانيني لحم مفروم", price: 250, category: "panini", image: "assets/menu/panini.svg", available: true },
  { id: 12, name: "بانيني تونة", price: 250, category: "panini", image: "assets/menu/panini.svg", available: true },
  { id: 13, name: "بانيني دجاج", price: 300, category: "panini", image: "assets/menu/panini.svg", available: true },
  { id: 14, name: "بانيني 3 أجبان", price: 300, category: "panini", image: "assets/menu/panini.svg", available: true },
  { id: 15, name: "سندويتش برغر مشكل", price: 300, category: "sandwiches", image: "assets/menu/burger.svg", available: true },
  { id: 16, name: "سندويتش شاورما", price: 200, category: "sandwiches", image: "assets/menu/shawarma.svg", available: true },
  { id: 17, name: "سندويتش لحم مفروم", price: 250, category: "sandwiches", image: "assets/menu/shawarma.svg", available: true },
  { id: 18, name: "برغر عادي", price: 300, category: "burger", image: "assets/menu/burger.svg", available: true },
  { id: 19, name: "برغر بلس", price: 350, category: "burger", image: "assets/menu/burger.svg", available: true },
  { id: 20, name: "برغر دبل", price: 400, category: "burger", image: "assets/menu/burger.svg", available: true },
  { id: 21, name: "برغر مع غراتيني", price: 500, category: "burger", image: "assets/menu/burger.svg", available: true },
  { id: 22, name: "بيتزا ميغا 1", price: 1300, category: "family_pizza", image: "assets/menu/family-pizza.svg", available: true },
  { id: 23, name: "بيتزا ميغا 2", price: 1500, category: "family_pizza", image: "assets/menu/family-pizza.svg", available: true },
  { id: 24, name: "بيتزا ميغا 3", price: 1800, category: "family_pizza", image: "assets/menu/family-pizza.svg", available: true },
  { id: 25, name: "بيتزا ميغا 4", price: 2000, category: "family_pizza", image: "assets/menu/family-pizza.svg", available: true },
  { id: 26, name: "بيتزا ميغا جعفورة", price: 2500, category: "family_pizza", image: "assets/menu/family-pizza.svg", available: true },
];

// 📂 التصنيفات الافتراضية
const DEFAULT_CATEGORIES = [
  { id: "all", name: "الكل", icon: "fas fa-th-large" },
  { id: "pizza", name: "البيتزا", icon: "fas fa-pizza-slice" },
  { id: "mini", name: "الميني", icon: "fas fa-bread-slice" },
  { id: "tacos", name: "التاكوس", icon: "fas fa-pepper-hot" },
  { id: "panini", name: "البانيني", icon: "fas fa-hotdog" },
  { id: "sandwiches", name: "السندويتشات", icon: "fas fa-burger" },
  { id: "burger", name: "البرغر", icon: "fas fa-hamburger" },
  { id: "family_pizza", name: "عروض البيتزا العائلية", icon: "fas fa-pizza-slice" },
];

// 🏪 اسم المطعم
const RESTAURANT_NAME = "pizza_Djafoura";
const RESTAURANT_TAGLINE = "أشهى المأكولات بأفضل الأسعار";

// ===== دوال مساعدة =====

function getLevel(points) {
  return LOYALTY_LEVELS.find(l => points >= l.min && points <= l.max) || LOYALTY_LEVELS[0];
}

function calcPoints(total) {
  return Math.floor(total / 100) * POINTS_PER_100_DZD;
}

function normalizePhone(phone) {
  let value = String(phone || "").replace(/\D/g, "");
  if (value.indexOf("00213") === 0) value = value.slice(5);
  else if (value.indexOf("213") === 0) value = value.slice(3);
  if (value.length === 9) value = "0" + value;
  return value;
}

function callAPI(action, data = {}) {
  return fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...data }),
  })
    .then(r => r.json())
    .catch(() => ({ success: false, error: "خطأ في الاتصال" }));
}

// ===== دوال الطلبات من Google Sheets =====

async function getOrdersFromServer(phone = null) {
  const result = phone
    ? await callAPI('getOrders', { phone: normalizePhone(phone) })
    : await callAPI('getAllOrders');
  if (result.success && result.orders) {
    return result.orders;
  }
  return [];
}

async function getAllOrdersFromServer() {
  const result = await callAPI("getAllOrders");
  if (result.success && result.orders) {
    return result.orders;
  }
  return [];
}

async function getActiveOrderByTableFromServer(tableNumber) {
  const result = await callAPI("getActiveOrderByTable", { tableNumber });
  if (result.success && result.order) {
    return result.order;
  }
  return null;
}

async function getOrderFromServer(orderId) {
  const result = await callAPI('getOrder', { orderId });
  if (result.success && result.order) {
    return result.order;
  }
  return null;
}

async function createOrderOnServer(orderData) {
  return await callAPI('createOrder', orderData);
}

async function updateOrderStatusOnServer(orderId, status) {
  return await callAPI('updateOrderStatus', { orderId, status });
}

async function deleteOrderFromServer(orderId) {
  return await callAPI('deleteOrder', { orderId });
}

// ===== دوال العملاء من Google Sheets =====

async function getCustomersFromServer() {
  const result = await callAPI('getAllCustomers');
  if (result.success && result.customers) {
    return result.customers;
  }
  return [];
}

async function getCustomerFromServer(phone) {
  const result = await callAPI('getCustomer', { phone: normalizePhone(phone) });
  if (result.success && result.customer) {
    return result.customer;
  }
  return null;
}

async function registerCustomerOnServer(customerData) {
  return await callAPI('registerCustomer', {
    name: customerData.name,
    phone: normalizePhone(customerData.phone)
  });
}

async function updateCustomerOnServer(phone, name) {
  return await callAPI('updateCustomer', { phone: normalizePhone(phone), name });
}

async function updateCustomerPointsOnServer(phone, points) {
  return await callAPI('updatePoints', { phone: normalizePhone(phone), points });
}

async function deleteCustomerFromServer(phone) {
  return await callAPI('deleteCustomer', { phone: normalizePhone(phone) });
}

// ===== دوال النقاط =====

async function earnPointsOnServer(phone, orderTotal) {
  return await callAPI('earnPoints', { phone: normalizePhone(phone), orderTotal });
}

// ===== دوال الإحصائيات من Google Sheets =====

async function getStatsFromServer() {
  const result = await callAPI('getStats');
  if (result.success && result.stats) {
    return result.stats;
  }
  return {
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    popularItems: []
  };
}

// ===== دوال المكافآت =====

async function requestRewardOnServer(phone, rewardId) {
  return await callAPI('requestReward', { phone: normalizePhone(phone), rewardId });
}

async function getPendingRewardsFromServer() {
  const result = await callAPI('getPendingRewards');
  if (result.success && result.pendingRewards) {
    return result.pendingRewards;
  }
  return [];
}

async function approveRewardOnServer(requestId) {
  return await callAPI('approveReward', { requestId });
}

async function rejectRewardOnServer(requestId) {
  return await callAPI('rejectReward', { requestId });
}

// ===== OrderHistory =====

const ORDER_HISTORY_KEY = "dj_order_history";

function loadOrderHistory() {
  const saved = localStorage.getItem(ORDER_HISTORY_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveOrderHistory(history) {
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
}

function logOrderAction(action, orderId = null, user = null, details = null) {
  const history = loadOrderHistory();
  history.push({
    action: action,
    orderId: orderId,
    user: user || localStorage.getItem("adminUser") || "نظام",
    timestamp: new Date().toISOString(),
    details: details || {}
  });
  saveOrderHistory(history);
}

// ===== حفظ الجلسة المحلية فقط (بدون طلبات) =====

function saveCustomerSession(name, phone, tableNumber = null) {
  if (name) localStorage.setItem("customerName", name);
  if (phone) localStorage.setItem("customerPhone", phone);
  if (tableNumber) localStorage.setItem("tableNumber", tableNumber);
}

function getCustomerSession() {
  return {
    name: localStorage.getItem("customerName"),
    phone: localStorage.getItem("customerPhone"),
    tableNumber: localStorage.getItem("tableNumber")
  };
}

function clearCustomerSession() {
  localStorage.removeItem("customerName");
  localStorage.removeItem("customerPhone");
  localStorage.removeItem("tableNumber");
}

// ===== نسخة محلية احتياطية للطلبات =====

function loadOrders() {
  const saved = localStorage.getItem("dj_orders");
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem("dj_orders", JSON.stringify(orders));
}

// ===== دوال المنتجات (تبقى محلية) =====

function loadProducts() {
  if (localStorage.getItem("dj_menu_data_version") !== MENU_DATA_VERSION) {
    saveProducts(DEFAULT_PRODUCTS);
    saveCategories(DEFAULT_CATEGORIES);
    localStorage.setItem("dj_menu_data_version", MENU_DATA_VERSION);
    return DEFAULT_PRODUCTS;
  }

  const saved = localStorage.getItem("dj_products");
  if (!saved) return DEFAULT_PRODUCTS;
  try {
    return JSON.parse(saved);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

function saveProducts(p) { 
  localStorage.setItem("dj_products", JSON.stringify(p)); 
  localStorage.setItem("dj_menu_data_version", MENU_DATA_VERSION);
}

async function getProductsFromServer() {
  const result = await callAPI("getProducts");
  if (result.success && Array.isArray(result.products) && result.products.length > 0) {
    saveProducts(result.products);
    return result.products;
  }
  return loadProducts();
}

async function saveProductOnServer(product) {
  const result = await callAPI("saveProduct", { product });
  if (result.success && Array.isArray(result.products)) {
    saveProducts(result.products);
  }
  return result;
}

async function deleteProductFromServer(productId) {
  const result = await callAPI("deleteProduct", { productId });
  if (result.success && Array.isArray(result.products)) {
    saveProducts(result.products);
  }
  return result;
}

async function updateProductAvailabilityOnServer(productId, available) {
  const result = await callAPI("updateProductAvailability", { productId, available });
  if (result.success && Array.isArray(result.products)) {
    saveProducts(result.products);
  }
  return result;
}

function loadCategories() {
  if (localStorage.getItem("dj_menu_data_version") !== MENU_DATA_VERSION) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  const saved = localStorage.getItem("dj_categories");
  return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
}

function saveCategories(c) { 
  localStorage.setItem("dj_categories", JSON.stringify(c)); 
  localStorage.setItem("dj_menu_data_version", MENU_DATA_VERSION);
}

async function getOffersFromServer() {
  const result = await callAPI("getOffers");
  if (result.success && Array.isArray(result.offers) && result.offers.length > 0) {
    return result.offers;
  }
  return null;
}

async function saveOfferOnServer(offer) {
  const result = await callAPI("saveOffer", { offer });
  if (result.success && Array.isArray(result.offers)) {
    return result.offers;
  }
  return result;
}

async function updateOfferOnServer(offerId, offer) {
  const result = await callAPI("updateOffer", { offerId, offer });
  if (result.success && Array.isArray(result.offers)) {
    return result.offers;
  }
  return result;
}

async function deleteOfferOnServer(offerId) {
  const result = await callAPI("deleteOffer", { offerId });
  if (result.success && Array.isArray(result.offers)) {
    return result.offers;
  }
  return result;
}

// ===== تخصيص هوية المطعم =====

const ADMIN_PASSWORD = "admin123";
const RESTAURANT_LOGO_URL = "";

// تطبيق اسم وشعار المطعم
function applyRestaurantBranding() {
  const headerName = document.getElementById("headerName");
  if (headerName) {
    headerName.textContent = RESTAURANT_NAME;
  }

  const logoElements = document.querySelectorAll(".brand-logo, .logo-icon");

  logoElements.forEach(el => {
    if (!RESTAURANT_LOGO_URL) return;

    el.innerHTML = `
      <img
        src="${RESTAURANT_LOGO_URL}"
        alt="${RESTAURANT_NAME}"
        style="width:100%;height:100%;object-fit:cover"
      >
    `;
  });
}

// ===== الصور =====

const DEFAULT_PRODUCT_IMAGE = "🍕";

function isImageUrl(value) {
  return (
    typeof value === "string" &&
    (/^https?:\/\//i.test(value) || /\.(svg|png|jpe?g|webp|gif)$/i.test(value))
  );
}

function productImageHtml(
  image,
  alt = "",
  className = "product-image"
) {
  if (isImageUrl(image)) {
    return `
      <img
        src="${image}"
        alt="${alt}"
        class="${className}"
        loading="lazy"
        onerror="this.outerHTML='<div class=&quot;${className}&quot; style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:48px&quot;>🍕</div>'"
      >
    `;
  }

  return `
    <div
      class="${className}"
      style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        font-size:48px;
      "
    >
      ${image || DEFAULT_PRODUCT_IMAGE}
    </div>
  `;
}
