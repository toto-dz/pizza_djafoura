// ===== STATE =====
let cart = [];
let currentOrderId = null;
let trackingInterval = null;
let productSyncInterval = null;
let activeCategory = 'all';
let products = [];
let categories = [];
let offers = [];
let isSubmitting = false;
let endVisitOnLoyaltyClose = false;
let tableActiveOrderDetected = false;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
   applyRestaurantBranding();
   try {
     products = await getProductsFromServer();
   } catch (e) {
     console.error('Failed to load products:', e);
     products = loadProducts();
   }
   categories = loadCategories();
   offers = await getOffersFromServer() || [];

   const params = new URLSearchParams(window.location.search);
   const table = params.get('table') || localStorage.getItem('tableNumber') || '1';
   localStorage.setItem('tableNumber', table);

   document.getElementById('tableLabel').innerHTML = `طاولة رقم <strong>${table}</strong>`;
   document.getElementById('headerName').textContent = RESTAURANT_NAME;
   document.title = `${RESTAURANT_NAME} - طاولة ${table}`;

   const savedOrderId = localStorage.getItem('currentOrderId');
   if (savedOrderId) {
     currentOrderId = savedOrderId;
     document.getElementById('trackBtn').style.display = 'flex';
     document.getElementById('trackNav').querySelector('span').textContent = 'طلبي 🔴';
     startTracking();
   }

   // Hide points badge initially - only show when customer enters phone
   document.getElementById('pointsBadge').style.display = 'none';

   renderCategories();
   renderProducts(products);
   renderOffers();
   startProductSync();

   await checkTableActiveOrder(table);
 });

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = categories.map(cat => `
    <button class="cat-btn ${cat.id === activeCategory ? 'active' : ''}"
      onclick="selectCategory('${cat.id}')">
      <i class="${cat.icon}"></i>
      <span>${cat.name}</span>
    </button>
  `).join('');
}

function selectCategory(id) {
  activeCategory = id;
  renderCategories();
  filterProducts();
}

// ===== RENDER PRODUCTS =====
function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  const filtered = activeCategory === 'all' ? list : list.filter(p => p.category === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="emoji">🔍</span>
      <h3>لا توجد منتجات</h3>
      <p>جرب تصنيفاً آخر</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card ${!p.available ? 'unavailable' : ''}">
      <div class="product-img">
        ${productImageHtml(p.image, p.name)}
        ${!p.available ? '<div class="product-badge">غير متوفر</div>' : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-price">${p.price.toLocaleString()} <span>دج</span></div>
        <button class="add-btn" onclick="addToCart(${p.id})">
          <i class="fas fa-plus"></i> أضف للطاولة
        </button>
      </div>
    </div>
  `).join('');
}

function filterProducts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  const filtered = q
    ? products.filter(p => p.name.toLowerCase().includes(q))
    : products;
  const byCat = activeCategory === 'all' ? filtered : filtered.filter(p => p.category === activeCategory);
  renderProducts(byCat);
}

function clearSearchBar() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  filterProducts();
}

// ===== OFFERS =====
function renderOffers() {
  const active = offers.filter(o => o.active);
  const banner = document.getElementById('offersBanner');
  const scroll = document.getElementById('offersScroll');

  if (active.length === 0) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';

  const items = active.map(o => `
    <span class="offer-item">🎉 ${o.title} (حد أدنى ${o.minOrder} دج)</span>
  `).join('');
  scroll.innerHTML = items + items;
}

// ===== CART =====
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.available) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: productId, name: product.name, price: product.price, image: product.image || DEFAULT_PRODUCT_IMAGE, qty: 1, note: '' });
  }

  updateCartUI();
  showToast(`✅ تم إضافة ${product.name}`, 'success');
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const btn = document.getElementById('cartBtn');

  if (count === 0) {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = total.toLocaleString() + ' دج';
}

function openCart() {
  renderCartModal();
  openModal('cartModal');
}

function renderCartModal() {
  const itemsEl = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummaryWrap');

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="empty-state"><span class="emoji">🛒</span><h3>لا توجد طلبات للطاولة</h3></div>`;
    summaryEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-image-wrap">${productImageHtml(item.image, item.name, 'cart-item-image')}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} دج</div>
        <input class="cart-note-input" placeholder="ملاحظة (اختياري)..."
          value="${item.note || ''}" oninput="cart[${i}].note=this.value">
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = getDiscount(subtotal);
  const total = subtotal - discount;

  summaryEl.innerHTML = `
    <div class="cart-summary">
      <div class="summary-row"><span>المجموع الفرعي</span><span>${subtotal.toLocaleString()} دج</span></div>
      ${discount > 0 ? `<div class="summary-row"><span>الخصم 🎉</span><span class="discount-badge">-${discount.toLocaleString()} دج</span></div>` : ''}
      <div class="summary-row total"><span>الإجمالي</span><span>${total.toLocaleString()} دج</span></div>
    </div>
    <div style="margin-top:10px; text-align:center; font-size:12px; color:var(--text-muted)">
      🌟 ستكسب <strong style="color:var(--accent)">${calcPoints(total)} نقطة</strong> من هذا الطلب
    </div>
  `;
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCartUI();
  renderCartModal();
}

function getDiscount(subtotal) {
  const activeOffer = offers.filter(o => o.active && subtotal >= o.minOrder)
    .sort((a, b) => b.value - a.value)[0];
  if (!activeOffer) return 0;
  if (activeOffer.type === 'percent') return Math.round(subtotal * activeOffer.value / 100);
  return activeOffer.value;
}

// ===== CHECKOUT =====
function startCheckout() {
  if (cart.length === 0) return;
  closeModal('cartModal');

  const phone = localStorage.getItem('customerPhone');
  if (phone) {
    placeOrder();
  } else {
    openModal('registerModal');
  }
}

async function submitRegister() {
  const name = document.getElementById('regName').value.trim();
  const phone = normalizePhone(document.getElementById('regPhone').value);

  if (!name || !phone) { showToast('⚠️ يرجى إدخال الاسم والهاتف', 'error'); return; }
  if (!isValidAlgerianPhone(phone)) { showToast('⚠️ رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 أو 06 أو 07 ويحتوي على 10 أرقام', 'error'); return; }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader"></div> جارٍ التسجيل...';

  try {
    const res = await callAPI('registerCustomer', { name, phone });
    if (res.success) {
      localStorage.setItem('customerName', name);
      localStorage.setItem('customerPhone', phone);
      closeModal('registerModal');
      placeOrder();
    } else if (res.error === 'DUPLICATE_PHONE') {
      showToast(`⚠️ رقم الهاتف مسجل مسبقاً باسم "${res.existing?.name}"`, 'error');
      document.getElementById('regPhone').value = '';
      document.getElementById('regPhone').focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> تسجيل وإرسال الطلب';
    } else {
      showToast('❌ ' + (res.error || 'خطأ في التسجيل'), 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> تسجيل وإرسال الطلب';
    }
  } catch {
    localStorage.setItem('customerName', name);
    localStorage.setItem('customerPhone', phone);
    closeModal('registerModal');
    await placeOrder();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> تسجيل وإرسال الطلب';
  }
}

function showGlobalLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
  document.body.style.overflow = 'hidden';
  document.querySelectorAll(
    'button, .btn, .nav-item, .cat-btn, .add-btn, .qty-btn, .btn-icon, .filter-btn, input, textarea, select'
  ).forEach(el => el.disabled = true);
}

function hideGlobalLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.removeAttribute('aria-hidden');
  }
  document.body.style.overflow = '';
  document.querySelectorAll(
    'button, .btn, .nav-item, .cat-btn, .add-btn, .qty-btn, .btn-icon, .filter-btn, input, textarea, select'
  ).forEach(el => el.disabled = false);
}

async function placeOrder() {
  if (isSubmitting) return;
  isSubmitting = true;
  showGlobalLoading();

  const phone = normalizePhone(localStorage.getItem('customerPhone'));
  const name = localStorage.getItem('customerName') || 'عميل';
  const table = localStorage.getItem('tableNumber') || '1';
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = getDiscount(subtotal);
  const total = subtotal - discount;

  const existingOrder = tableActiveOrderDetected ? await getActiveOrderByTableFromServer(table) : null;

  if (existingOrder) {
    const updatedItems = (existingOrder.items || []).map(it => ({ name: it.name, qty: it.qty, price: it.price, note: it.note || '' }));
    cart.forEach(item => updatedItems.push({ name: item.name, qty: item.qty, price: item.price, note: item.note || '' }));
    const newTotal = (existingOrder.total || 0) + total;

    try {
      const result = await callAPI('addToOrderItems', {
        orderId: existingOrder.id,
        items: updatedItems,
        total: newTotal
      });

      if (!result.success) throw new Error(result.error || 'تعذر إضافة القطع للطلب');

      currentOrderId = String(existingOrder.id);
      localStorage.setItem('currentOrderId', currentOrderId);
      document.getElementById('trackBtn').style.display = 'flex';
      document.getElementById('trackNav').querySelector('span').textContent = 'طلبي 🔴';
      startTracking();

      cart = [];
      updateCartUI();

      hideGlobalLoading();
      const orderNumber = String(existingOrder.id);
      document.getElementById('orderIdDisplay').textContent = '#' + orderNumber.slice(-4);
      document.getElementById('tableDisplay').textContent = 'طاولة رقم ' + table;
      document.getElementById('successMsg').textContent = '✅ تمت إضافة القطع للطلب الحالي';
      document.getElementById('pointsBadge').style.display = 'none';

      openModal('successModal');
      setTimeout(() => {
        closeModal('successModal');
        openOrderTrack();
      }, 1800);

    } catch (e) {
      hideGlobalLoading();
      showToast('❌ تعذر إضافة القطع للطلب\nيرجى المحاولة مرة أخرى.', 'error');
    } finally {
      isSubmitting = false;
    }
    return;
  }

  const orderData = {
    id: Date.now(),
    tableNumber: table,
    customerName: name,
    customerPhone: phone,
    items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, note: i.note || '' })),
    subtotal, discount, total,
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await callAPI('createOrder', {
      id: orderData.id,
      customer: { name, phone },
      items: orderData.items,
      total,
      table
    });

    if (!result.success) throw new Error(result.error || 'تعذر إنشاء الطلب');

    const savedOrder = result.order || orderData;
    const orders = loadOrders().filter(o => String(o.id) !== String(savedOrder.id));
    orders.push(savedOrder);
    saveOrders(orders);
    logOrderAction("CreateOrder", savedOrder.id, name);

    currentOrderId = savedOrder.id;
    localStorage.setItem('currentOrderId', currentOrderId);
    
    if (result.loyalty) {
      showToast(`🌟 كسبت ${result.loyalty.earned} نقطة. مجموع النقاط الآن: ${result.loyalty.newTotal}`, 'success');
    }
    
    // Reset cart
    cart = [];
    updateCartUI();

    hideGlobalLoading();
    const pts = calcPoints(total);
    const orderNumber = String(savedOrder.id ?? orderData.id);
    const finalTable = savedOrder.tableNumber || table;
    document.getElementById('orderIdDisplay').textContent = '#' + orderNumber.slice(-4);
    document.getElementById('tableDisplay').textContent = 'طاولة رقم ' + finalTable;
    document.getElementById('successMsg').textContent = '✅ تم إرسال طلبك بنجاح';
    document.getElementById('trackBtn').style.display = 'flex';
    document.getElementById('trackNav').querySelector('span').textContent = 'طلبي 🔴';
    document.getElementById('pointsBadge').style.display = 'none';

    openModal('successModal');
    startTracking();
    setTimeout(() => {
      closeModal('successModal');
      openOrderTrack();
    }, 1800);
    
  } catch (e) {
    hideGlobalLoading();
    showToast('❌ تعذر إرسال الطلب\nيرجى المحاولة مرة أخرى.', 'error');
  } finally {
    isSubmitting = false;
  }
}

// ===== TRACKING =====
function startTracking() {
  if (trackingInterval) clearInterval(trackingInterval);
  trackingInterval = setInterval(checkOrderStatus, 5000);
}

async function checkOrderStatus() {
  if (!currentOrderId) return;
  try {
    const res = await callAPI('getOrder', { orderId: currentOrderId });
    if (res.success && res.order) {
      const order = res.order;
      const orders = loadOrders();
      const idx = orders.findIndex(o => String(o.id) === String(currentOrderId));
      const previousStatus = idx >= 0 ? orders[idx].status : null;

if (idx >= 0) {
        if (orders[idx].status !== order.status) {
          orders[idx].status = order.status;
          saveOrders(orders);
        }
      } else {
        orders.push(order);
        saveOrders(orders);
      }

      if (document.getElementById('trackModal').classList.contains('open')) {
        renderOrderTrackContent(order);
      }

      if (order.status === 'delivered') {
        clearInterval(trackingInterval);
        localStorage.removeItem('currentOrderId');
        currentOrderId = null;
        cart = [];
        updateCartUI();
        document.getElementById('trackNav').querySelector('span').textContent = 'طلبي';
        document.getElementById('trackBtn').style.display = 'none';
        if (previousStatus !== 'delivered' && localStorage.getItem('customerPhone')) {
          refreshLoyaltyPoints();
          closeModal('trackModal');
          showDeliveredModal(order);
        }
      }
    }
  } catch (e) {
    // fallback or offline
  }
}

async function openOrderTrack() {
  const content = document.getElementById('trackContent');
  if (!currentOrderId) {
    content.innerHTML = `<div class="empty-state"><span class="emoji">📋</span><h3>لا يوجد طلب نشط</h3><p>أضف طلبًا جديداً أولاً</p></div>`;
    openModal('trackModal');
    return;
  }

  content.innerHTML = `<div style="text-align:center; padding:40px"><div class="loader"></div><div style="margin-top:10px; color:var(--text-muted)">جارٍ جلب حالة الطلب...</div></div>`;
  openModal('trackModal');

  try {
    const res = await callAPI('getOrder', { orderId: currentOrderId });
    if (res.success && res.order) {
      const order = res.order;
      const orders = loadOrders();
      const idx = orders.findIndex(o => String(o.id) === String(currentOrderId));
      if (idx >= 0) {
        orders[idx] = order;
      } else {
        orders.push(order);
      }
      saveOrders(orders);
      renderOrderTrackContent(order);
    } else {
      fallbackTrack();
    }
  } catch (e) {
    fallbackTrack();
  }
}

function fallbackTrack() {
  const content = document.getElementById('trackContent');
  const orders = loadOrders();
  const order = orders.find(o => String(o.id) === String(currentOrderId));
  if (order) {
    renderOrderTrackContent(order);
  } else {
    content.innerHTML = `
      <div class="empty-state">
        <span class="emoji">❓</span>
        <h3>لم يُعثر على الطلب</h3>
        <p style="margin-bottom:15px">يبدو أن الطلب غير موجود في النظام.</p>
        <button class="btn btn-secondary" onclick="clearStuckOrder()">مسح والبدء من جديد</button>
      </div>`;
  }
}

function clearStuckOrder() {
  localStorage.removeItem('currentOrderId');
  currentOrderId = null;
  document.getElementById('trackNav').querySelector('span').textContent = 'طلبي';
  document.getElementById('trackBtn').style.display = 'none';
  closeModal('trackModal');
  showToast('تم مسح الطلب العالق', 'success');
}

async function checkTableActiveOrder(table) {
  if (tableActiveOrderDetected) return;
  try {
    const activeOrder = await getActiveOrderByTableFromServer(table);
    if (!activeOrder) return;
    tableActiveOrderDetected = true;
    currentOrderId = String(activeOrder.id);
    localStorage.setItem('currentOrderId', currentOrderId);
    document.getElementById('trackBtn').style.display = 'flex';
    document.getElementById('trackNav').querySelector('span').textContent = 'طلبي 🔴';

    const content = document.getElementById('tableActiveOrderContent');
    content.innerHTML = `
      <div class="empty-state">
        <span class="emoji">⚠️</span>
        <h3>هذه الطاولة لديها طلب نشط</h3>
        <p style="margin-bottom:15px; color:var(--text-muted); font-size:14px;">
          يوجد طلب حالياً في هذه الطاولة رقم <strong>#${String(activeOrder.id).slice(-4)}</strong>
          <br>حالته: <strong>${STATUS_LABELS[activeOrder.status]?.label || activeOrder.status}</strong>
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn btn-primary" onclick="closeModal('tableActiveOrderModal'); openOrderTrack();">
            <i class="fas fa-eye"></i> تتبع الطلب الحالي
          </button>
          <button class="btn btn-secondary" onclick="closeModal('tableActiveOrderModal'); resetTableOrder();">
            <i class="fas fa-plus"></i> إضافة قطع جديدة
          </button>
          <button class="btn btn-secondary" style="color:var(--text-muted);" onclick="closeModal('tableActiveOrderModal');">
            <i class="fas fa-times"></i> سأقوم بذلك لاحقاً
          </button>
        </div>
      </div>
    `;
    openModal('tableActiveOrderModal');
  } catch (e) {
    console.error('Error checking active table order:', e);
  }
}

function resetTableOrder() {
  localStorage.removeItem('currentOrderId');
  currentOrderId = null;
  tableActiveOrderDetected = false;
  document.getElementById('trackNav').querySelector('span').textContent = 'طلبي';
  document.getElementById('trackBtn').style.display = 'none';
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  cart = [];
  updateCartUI();
}

function renderOrderTrackContent(order) {
  const content = document.getElementById('trackContent');
  const statuses = ['new', 'preparing', 'ready', 'delivered'];
  const currentIdx = statuses.indexOf(order.status);
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS['new'];

  content.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-size:40px">${statusInfo.icon}</div>
      <div style="font-size:18px; font-weight:700; margin-top:8px;">${statusInfo.label}</div>
      <div class="table-badge" style="margin-top:8px">طاولة ${order.tableNumber}</div>
    </div>
    <div class="status-tracker">
      <div class="status-steps">
        ${statuses.map((s, i) => `
          <div class="status-step ${i < currentIdx ? 'done' : (i === currentIdx ? 'active' : '')}">
            <div class="step-icon">${STATUS_LABELS[s].icon}</div>
            <div class="step-label">${STATUS_LABELS[s].label}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="cart-summary" style="margin-top:16px">
      ${(order.items || []).map(i => `
        <div class="summary-row">
          <span>${i.name} × ${i.qty}</span>
          <span>${(i.price * i.qty).toLocaleString()} دج</span>
        </div>
      `).join('')}
      <div class="summary-row total">
        <span>الإجمالي</span>
        <span>${(order.total || 0).toLocaleString()} دج</span>
      </div>
    </div>
    <div style="text-align:center; margin-top:12px; font-size:12px; color:var(--text-muted)">
      🔄 يتجدد التتبع تلقائياً كل 5 ثوانٍ
    </div>
  `;
}

// ===== DELIVERED MODAL =====
async function showDeliveredModal(order) {
  const content = document.getElementById('deliveredContent');
  content.innerHTML = `
    <div class="success-anim">
      <span class="success-icon">🎉</span>
      <h2 style="font-size:22px; margin:12px 0 8px; font-weight:900;">تم تسليم طلبك!</h2>
      <p style="color:var(--text-muted); font-size:14px;">شكراً لزيارتك، نتمنى لك يوماً سعيداً!</p>
      <div style="background:var(--card); border-radius:14px; padding:16px; margin:16px 0; display:inline-block; min-width:200px;">
        <div style="font-size:13px; color:var(--text-muted);">رقم الطلب</div>
        <div style="font-size:28px; font-weight:900; color:var(--accent);">#${String(order.id).slice(-4)}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">طاولة ${order.tableNumber}</div>
      </div>
    </div>
    <button class="btn btn-primary" onclick="closeDeliveredModal()">
      <i class="fas fa-star"></i> متابعة
    </button>
  `;
  openModal('deliveredModal');
}

// ===== LOYALTY =====
async function openLoyalty() {
  const sessionPhone = normalizePhone(localStorage.getItem('customerPhone'));
  if (!sessionPhone) return;
  endVisitOnLoyaltyClose = false;
  const content = document.getElementById('loyaltyContent');

  content.innerHTML = `<div style="text-align:center; padding:35px"><div class="loader"></div><div style="margin-top:10px">جارٍ عرض نقاطك...</div></div>`;
  openModal('loyaltyModal');

  await fetchLoyaltyForPhone(sessionPhone);
}

async function fetchLoyaltyForPhone(phoneOverride) {
  const sessionPhone = normalizePhone(localStorage.getItem('customerPhone'));
  if (!sessionPhone) {
    showToast('⚠️ يرجى تسجيل بياناتك أولاً', 'error');
    return;
  }

  const phoneInput = document.getElementById('loyaltyPhoneInput');
  const phone = phoneOverride ? normalizePhone(phoneOverride) : (phoneInput ? normalizePhone(phoneInput.value) : null);
  if (!phoneOverride && !isValidAlgerianPhone(phone)) {
    showToast('⚠️ أدخل رقم هاتف صحيح', 'error');
    return;
  }

  if (phone !== sessionPhone) {
    showToast('⚠️ لا يمكنك عرض نقاط شخص آخر', 'error');
    return;
  }

  const content = document.getElementById('loyaltyContent');
  content.innerHTML = `<div style="text-align:center; padding:35px"><div class="loader"></div><div style="margin-top:10px">جارٍ البحث...</div></div>`;

  try {
    const res = await callAPI('getCustomer', { phone });
    if (res.success && res.customer) {
      const customer = res.customer;
      const points = customer.points || 0;
      const ordersCount = customer.ordersCount || 0;
      const totalSpent = customer.totalSpent || 0;
      renderLoyaltyContent(content, customer.name || 'العميل', phone, points, ordersCount, totalSpent);
      updatePointsBadge(points);
    } else {
      content.innerHTML = `
        <div class="empty-state">
          <span class="emoji">❓</span>
          <h3>لا يوجد حساب</h3>
          <p>العميل غير مسجل. أضف طلباً أولاً للحصول على النقاط</p>
        </div>
      `;
      document.getElementById('pointsBadge').style.display = 'none';
    }
  } catch (e) {
    content.innerHTML = `
      <div class="empty-state">
        <span class="emoji">⚠️</span>
        <h3>لا يوجد اتصال</h3>
        <p>تأكد من اتصال الإنترنت</p>
      </div>
    `;
    document.getElementById('pointsBadge').style.display = 'none';
  }
}

async function showDeliveredLoyalty(order) {
  const phone = normalizePhone(order.customerPhone || localStorage.getItem('customerPhone'));

  if (!phone || !isValidAlgerianPhone(phone)) {
    return;
  }

  endVisitOnLoyaltyClose = true;
  const name = order.customerName || localStorage.getItem('customerName') || 'العميل';
  const content = document.getElementById('loyaltyContent');

  content.innerHTML = `<div style="text-align:center; padding:35px"><div class="loader"></div><div style="margin-top:10px">جارٍ عرض نقاطك...</div></div>`;
  openModal('loyaltyModal');

  try {
    const res = await callAPI('getCustomer', { phone });
    if (res.success && res.customer) {
      const customer = res.customer;
      renderLoyaltyContent(
        content,
        customer.name || name,
        phone,
        customer.points || 0,
        customer.ordersCount || 0,
        customer.totalSpent || 0,
        { refreshAction: `showDeliveredLoyalty({ customerPhone: '${escapeJs(phone)}', customerName: '${escapeJs(customer.name || name)}' })` }
      );
      appendDeliveredEndButton(content);
      updatePointsBadge(customer.points || 0);
    } else {
      renderDeliveredLoyaltyEnd(content, `
        <div class="empty-state">
          <span class="emoji">✅</span>
          <h3>تم التسليم</h3>
          <p>شكراً لزيارتك. لم يتم العثور على حساب نقاط لهذا الرقم.</p>
        </div>
      `);
    }
  } catch (e) {
    renderDeliveredLoyaltyEnd(content, `
      <div class="empty-state">
        <span class="emoji">✅</span>
        <h3>تم التسليم</h3>
        <p>شكراً لزيارتك. يمكنك إنهاء الجلسة الآن.</p>
      </div>
    `);
  }
}

function renderDeliveredLoyaltyEnd(content, html) {
  content.innerHTML = html;
  appendDeliveredEndButton(content);
}

function appendDeliveredEndButton(content) {
  content.insertAdjacentHTML('beforeend', `
    <button class="btn btn-primary" style="margin-top:16px" onclick="endVisit()">
      <i class="fas fa-check"></i> إنهاء
    </button>
  `);
}

function closeLoyaltyModal() {
  const shouldEnd = endVisitOnLoyaltyClose;
  closeModal('loyaltyModal');
  if (shouldEnd) {
    endVisit();
  }
}

function endVisit() {
  const table = localStorage.getItem('tableNumber') || '1';

  localStorage.removeItem('customerName');
  localStorage.removeItem('customerPhone');
  localStorage.removeItem('currentOrderId');
  localStorage.removeItem('localPoints');
  cart = [];
  currentOrderId = null;

  const target = `${window.location.pathname}?table=${encodeURIComponent(table)}`;
  window.location.href = target;
}

function renderLoyaltyContent(el, name, phone, points, ordersCount = 0, totalSpent = 0, options = {}) {
  const level = getLevel(points);
  const nextLevel = LOYALTY_LEVELS.find(l => l.min > points);
  const progress = nextLevel
    ? Math.min(100, ((points - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;
  const refreshAction = options.refreshAction || 'openLoyalty()';

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
      <h3 style="font-size:16px; font-weight:700; margin:0">نقاط الولاء</h3>
      <button class="btn-icon" onclick="${refreshAction}" title="تحديث" style="width:32px;height:32px">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>

    <div class="customer-info-grid">
      <div class="info-box">
        <div class="info-box-value">${ordersCount}</div>
        <div class="info-box-label">عدد الطلبات</div>
      </div>
      <div class="info-box">
        <div class="info-box-value">${totalSpent.toLocaleString()}</div>
        <div class="info-box-label">إجمالي الإنفاق (دج)</div>
      </div>
    </div>

    <div class="loyalty-card" data-phone="${phone}">
      <div style="font-size:14px; color:var(--text-muted); margin-bottom:6px">مرحباً، ${escapeHtml(name)}</div>
      <div class="loyalty-points">${points.toLocaleString()}</div>
      <div style="font-size:13px; color:var(--text-muted)">نقطة مكتسبة</div>
      <div class="loyalty-level-badge">
        ${level.badge} <span>مستوى ${level.name}</span>
      </div>
      ${nextLevel ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="progress-label">
          <span>${points} نقطة</span>
          <span>${nextLevel.min} للمستوى التالي</span>
        </div>
      ` : '<div style="margin-top:10px; color:var(--accent); font-size:13px; font-weight:700">🎉 أعلى مستوى! أنت عميلنا المميز</div>'}
    </div>

    <h3 style="font-size:15px; font-weight:700; margin-bottom:12px">🎁 المكافآت المتاحة</h3>
    <div class="rewards-grid">
      ${LOYALTY_REWARDS.map(r => `
        <div class="reward-item ${points >= r.points ? 'unlocked' : ''}">
          <span class="reward-icon">${r.icon}</span>
          <div class="reward-pts">${r.points} نقطة</div>
          <div class="reward-name">${r.reward}</div>
          ${points >= r.points ? `
            <button class="btn btn-primary" style="margin-top:8px; padding:8px 12px; font-size:12px;"
              onclick="redeemReward('${r.id}', '${r.reward}')">
              <i class="fas fa-gift"></i> طلب المكافأة
            </button>
          ` : `
            <div style="color:var(--text-muted); font-size:11px; margin-top:8px;">
              تحتاج ${r.points - points} نقطة
            </div>
          `}
        </div>
      `).join('')}
    </div>
    <div style="text-align:center; margin-top:16px; font-size:12px; color:var(--text-muted)">
      كل 100 دج = نقطة واحدة 💡
    </div>
  `;
}

function updatePointsBadge(points) {
  const badge = document.getElementById('pointsBadge');
  if (!badge) return;
  const total = Math.max(0, parseInt(points, 10) || 0);
  badge.textContent = total;
  badge.style.display = 'flex';
}

async function redeemReward(rewardId, rewardName) {
   const phoneInput = document.getElementById('loyaltyPhoneInput');
   const phone = phoneInput ? normalizePhone(phoneInput.value) : null;
   const phoneDisplay = document.querySelector('#loyaltyContent [data-phone]');
   const actualPhone = phone || (phoneDisplay ? phoneDisplay.getAttribute('data-phone') : null);
   const pointsDisplay = document.querySelector('#loyaltyContent .loyalty-points');
   const points = pointsDisplay ? parseInt(pointsDisplay.textContent.replace(/,/g, '')) : 0;

   // Find and disable the clicked button
   const clickedBtn = event?.target?.closest('button') || document.querySelector(`button[onclick*="redeemReward('${rewardId}'"]`);
   if (clickedBtn) {
     clickedBtn.disabled = true;
     clickedBtn.innerHTML = '<div class="loader" style="width:18px;height:18px;margin:auto;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div> جاري الإرسال...';
   }

   if (!actualPhone) {
     showToast('⚠️ يرجى إدخال رقم هاتفك أولاً', 'error');
     if (clickedBtn) clickedBtn.disabled = false;
     return;
   }

   if (points < getCurrentRewardPoints(rewardId)) {
     showToast('⚠️ ليس لديك نقاط كافية لهذه المكافأة', 'error');
     if (clickedBtn) clickedBtn.disabled = false;
     return;
   }

   if (!confirm(`هل أنت متأكد أنك تريد استبدال ${getCurrentRewardPoints(rewardId)} نقطة مقابل ${rewardName}؟`)) {
     if (clickedBtn) clickedBtn.disabled = false;
     return;
   }
   try {
     const res = await requestRewardOnServer(actualPhone, rewardId);
     if (res.success) {
       if (clickedBtn) {
         clickedBtn.className = 'btn btn-success';
         clickedBtn.disabled = true;
         clickedBtn.innerHTML = '<i class="fas fa-check"></i> تم الإرسال';
       }
       showToast(`✅ تم إرسال طلب الاستبدال لـ ${rewardName}. في انتظار موافقة المسؤول.`, 'success');
       setTimeout(() => fetchLoyaltyForPhone(), 1000);
     } else {
       showToast(`❌ ${res.error || 'فشل إرسال طلب المكافأة'}`, 'error');
       if (clickedBtn) clickedBtn.disabled = false;
     }
   } catch (e) {
     showToast('⚠️ لا يوجد اتصال بالسيرفر', 'error');
     if (clickedBtn) clickedBtn.disabled = false;
   }
 }

function getCurrentRewardPoints(rewardId) {
  const r = LOYALTY_REWARDS.find(r => r.id === rewardId);
  return r ? r.points : 0;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeJs(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function closeDeliveredModal() {
  closeModal('deliveredModal');
  setTimeout(() => {
    if (localStorage.getItem('customerPhone')) {
      showDeliveredLoyalty({ customerPhone: localStorage.getItem('customerPhone'), customerName: localStorage.getItem('customerName') });
    }
  }, 350);
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
   overlay.addEventListener('click', e => {
     if (e.target !== overlay) return;
     if (overlay.id === 'loyaltyModal') {
       closeLoyaltyModal();
       return;
     }
     if (overlay.id === 'deliveredModal') {
       closeDeliveredModal();
       return;
     }
     closeModal(overlay.id);
   });
 });

// ===== TOAST =====
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== LISTEN FOR STORAGE EVENTS (Cross-tab sync) =====
window.addEventListener('storage', async () => {
  products = await getProductsFromServer();
  categories = loadCategories();
  offers = await getOffersFromServer() || [];
  renderProducts(products);
  renderCategories();
  renderOffers();
});

// ===== PERIODIC PRODUCT SYNC =====
function startProductSync() {
  if (productSyncInterval) clearInterval(productSyncInterval);
  productSyncInterval = setInterval(async () => {
    const newProducts = await getProductsFromServer();
    if (JSON.stringify(newProducts) !== JSON.stringify(products)) {
      products = newProducts;
      renderProducts(products);
      showToast('🔄 تم تحديث القائمة', 'success');
    }
  }, 60000);
}

// ===== REFRESH LOYALTY POINTS =====
async function refreshLoyaltyPoints() {
  const phone = normalizePhone(localStorage.getItem('customerPhone'));
  if (!phone) return;
  try {
    const res = await callAPI('getCustomer', { phone });
    if (res.success && res.customer) {
      updatePointsBadge(res.customer.points || 0);
    }
  } catch {}
}

// ===== SHOW TAB FUNCTION =====
function showTab(tab) {
  if (tab === 'menu') {
    closeModal('cartModal');
    closeModal('trackModal');
    closeLoyaltyModal();
  }
}
