// ===== STATE =====
let products = [];
let categories = [];
let offers = [];
let orders = [];
let customers = [];
let rewards = []; // New state variable for reward requests
let currentPage = 'dashboard';
let ordersFilter = 'all';
let orderPollInterval = null;
let pendingReopenOrderId = null;
let pendingAddProductsOrderId = null;

// ===== AUTH =====
document.addEventListener('DOMContentLoaded', applyRestaurantBranding);

function doLogin() {
  const pass = document.getElementById('passInput').value;
  if (pass === ADMIN_PASSWORD) {
    localStorage.setItem('adminAuth', '1');
    document.getElementById('loginScreen').style.display = 'none';
    initAdmin();
  } else {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('passInput').value = '';
  }
}

if (localStorage.getItem('adminAuth') === '1') {
  document.getElementById('loginScreen').style.display = 'none';
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  document.addEventListener('DOMContentLoaded', () => { });
}

function initAdmin() {
  products = loadProducts();
  categories = loadCategories();
  orders = loadOrders();
  document.getElementById('menuUrl').value = PUBLIC_MENU_URL;

  getOffersFromServer().then(res => {
    if (res && Array.isArray(res)) {
      offers = res;
    }
    renderOffers();
  });

  renderDashboard();
  renderOrders();
  renderProducts();
  renderCategories();
  refreshProductsFromServer();
  // Load from server initially
  callAPI('getAllOrders').then(res => {
      if (res.success && res.orders) {
        orders = res.orders;
        saveOrders(orders);
        renderDashboard();
        if (currentPage === 'orders') renderOrders();
        updateNewOrdersBadge();
      }
    });

  // Poll for new orders every 5s
  orderPollInterval = setInterval(async () => {
    try {
      const res = await callAPI('getAllOrders');
      if (res.success && res.orders) {
        orders = res.orders;
        saveOrders(orders);
        renderDashboard();
        if (currentPage === 'orders') renderOrders();
        updateNewOrdersBadge();
      }
    } catch (e) {
      orders = loadOrders();
      renderDashboard();
      if (currentPage === 'orders') renderOrders();
      updateNewOrdersBadge();
    }

    const rewardsRes = await callAPI('getPendingRewards');
    if (rewardsRes.success && Array.isArray(rewardsRes.pendingRewards)) {
      rewards = rewardsRes.pendingRewards;
      if (currentPage === 'pendingRewards') renderPendingRewards(rewards);
      updateNewRewardRequestsBadge();
    }

  }, 10000);

  // Listen for storage events (cross-tab)
  window.addEventListener('storage', () => {
    orders = loadOrders();
    renderDashboard();
    if (currentPage === 'orders') renderOrders();
    updateNewOrdersBadge();

  });
}

async function refreshProductsFromServer() {
  try {
    products = await getProductsFromServer();
    renderProducts();
  } catch (e) {
    products = loadProducts();
    renderProducts();
  }
}

function updateNewOrdersBadge() {
  const newCount = orders.filter(o => o.status === 'new').length;
  const badge = document.getElementById('newOrdersBadge');
  if (newCount > 0) {
    badge.textContent = newCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function updateNewRewardRequestsBadge() {
  const newCount = rewards.filter(r => r.Status === 'Pending').length;
  const badge = document.getElementById('newRewardsBadge');
  if (newCount > 0) {
    badge.textContent = newCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ===== NAVIGATION =====
function showPage(page, clickedElement = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (clickedElement) {
    clickedElement.classList.add('active');
  } else {
    const navItem = document.querySelector(`.nav-item[onclick*="'${page}'"]`);
    if (navItem) navItem.classList.add('active');
  }

  const titles = {
    dashboard: 'نظرة عامة',
    orders: 'الطلبات',
    products: 'المنتجات',
    categories: 'التصنيفات',
    offers: 'العروض',
    customers: 'العملاء',
    loyalty: 'نقاط الولاء',
    rewards: 'المكافآت',
    qr: 'رموز QR',
    pendingRewards: 'طلبات المكافآت'
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  currentPage = page;

  if (page === 'customers') loadCustomers();
  if (page === 'loyalty') loadLoyaltyStats();
  if (page === 'pendingRewards') loadPendingRewards();
  if (document.getElementById('sidebar').classList.contains('open')) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const totalRevenue = orders.filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);
  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const newOrders = orders.filter(o => o.status === 'new').length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon">📋</div>
      <div class="stat-value">${orders.length}</div>
      <div class="stat-label">إجمالي الطلبات</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-icon">💰</div>
      <div class="stat-value">${totalRevenue.toLocaleString()}</div>
      <div class="stat-label">إجمالي الإيرادات (دج)</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon">🛒</div>
      <div class="stat-value">${todayOrders.length}</div>
      <div class="stat-label">طلبات اليوم</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon">🆕</div>
      <div class="stat-value">${newOrders}</div>
      <div class="stat-label">طلبات جديدة</div>
    </div>
  `;

  const recent = [...orders].reverse().slice(0, 5);
  document.getElementById('dashOrdersTable').innerHTML = buildOrdersTable(recent);
  updateNewOrdersBadge();
}

async function updateDashLoyalty() {
  try {
    const res = await callAPI('getAllCustomers');
    if (res.success && res.customers) {
      // Optional: add loyalty widget to dashboard
    }
  } catch { }
}

// ===== ORDERS =====
function renderOrders() {
  const filtered = ordersFilter === 'all' ? orders : orders.filter(o => o.status === ordersFilter);
  document.getElementById('ordersTable').innerHTML = buildOrdersTable([...filtered].reverse());
}

function filterOrders(status, btn) {
  ordersFilter = status;
  document.querySelectorAll('#ordersFilter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders();
}

function buildOrdersTable(list) {
  if (list.length === 0) return `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted)">لا توجد طلبات</td></tr>`;

  return `<thead><tr>
    <th>رقم الطلب</th><th>الطاولة</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التوقيت</th><th>إجراءات</th>
   </tr></thead><tbody>
  ${list.map(o => `
     <tr>
      <td><strong style="color:var(--accent)">#${String(o.id).slice(-4)}</strong></td>
      <td>🪑 ${o.tableNumber}</td>
      <td>${o.customerName || '-'}</td>
      <td style="font-weight:700">${(o.total || 0).toLocaleString()} دج</td>
<td>
         <select class="status-select" onchange="updateOrderStatus(${o.id}, this.value)" ${o.status === 'delivered' ? 'disabled' : ''}>
           ${['new', 'preparing', 'ready', 'delivered'].map(s =>
         `<option value="${s}" ${o.status === s ? 'selected' : ''}>${STATUS_LABELS[s].icon} ${STATUS_LABELS[s].label}</option>`
       ).join('')}
         </select>
       </td>
       <td style="color:var(--text-muted); font-size:12px">${formatTime(o.createdAt)}</td>
       <td>
         <button class="action-btn btn-info" onclick="viewOrderDetail(${o.id})"><i class="fas fa-eye"></i></button>
         <button class="action-btn btn-danger" onclick="deleteOrder(${o.id})" style="margin-right:4px"><i class="fas fa-trash"></i></button>
${o.status === 'delivered' ? `
            <span class="status-badge status-delivered" style="margin-right:8px">تم التسليم</span>
            <button class="action-btn btn-success" onclick="reopenOrder(${o.id})" style="margin-right:8px"><i class="fas fa-unlock"></i> إعادة فتح الطلب</button>
            <button class="action-btn btn-primary" onclick="addProductsToOrder(${o.id})" style="margin-right:8px"><i class="fas fa-plus"></i> إضافة منتجات</button>
          ` : ''}
       </td>
      </tr>
  `).join('')}
  </tbody>`;
}

async function updateOrderStatus(orderId, status) {
   const idx = orders.findIndex(o => o.id == orderId);
   if (idx < 0) return;
   if (orders[idx].status === 'delivered') return;
   const previousStatus = orders[idx].status;
  const res = await callAPI('updateOrderStatus', { orderId, status });
  if (!res.success) {
    showToast(`❌ ${res.error || 'تعذر تحديث حالة الطلب'}`, 'error');
    orders[idx].status = previousStatus;
    renderOrders();
    return;
  }
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);
  if (status === 'delivered') loadLoyaltyStats();
  showToast(`✅ تم تحديث حالة الطلب إلى: ${STATUS_LABELS[status].label}`, 'success');
  renderDashboard();
}

async function deleteOrder(orderId) {
  if (!confirm('هل تريد حذف هذا الطلب؟')) return;
  const res = await callAPI('deleteOrder', { orderId });
  if (!res.success) {
    showToast(`❌ ${res.error || 'تعذر حذف الطلب'}`, 'error');
    return;
  }
  orders = orders.filter(o => o.id != orderId);
  saveOrders(orders);
  renderOrders();
  renderDashboard();
showToast('🗑️ تم حذف الطلب', 'success');
  }

function reopenOrder(orderId) {
  pendingReopenOrderId = orderId;
  openModal('reopenConfirmModal');
}

function confirmReopen() {
  if (pendingReopenOrderId === null) return;
  closeModal('reopenConfirmModal');
  performReopen(pendingReopenOrderId);
  pendingReopenOrderId = null;
}

async function performReopen(orderId) {
  const idx = orders.findIndex(o => o.id == orderId);
  if (idx < 0) return;
  const res = await callAPI('updateOrderStatus', { orderId, status: 'ready' });
  if (!res.success) {
    showToast(`❌ ${res.error || 'تعذر إعادة فتح الطلب'}`, 'error');
    return;
  }
  orders[idx].status = 'ready';
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);
  showToast('✅ تم إعادة فتح الطلب', 'success');
  renderOrders();
  renderDashboard();
}

function addProductsToOrder(orderId) {
  pendingAddProductsOrderId = orderId;
  renderProductsForAdd();
  openModal('addProductsModal');
}

function renderProductsForAdd() {
  const content = document.getElementById('addProductsContent');
  const availableProducts = products.filter(p => p.available);

  if (availableProducts.length === 0) {
    content.innerHTML = `<div class="empty-state"><span class="emoji">📦</span><h3>لا توجد منتجات متاحة</h3></div>`;
    return;
  }

  content.innerHTML = availableProducts.map(p => `
    <div class="cart-item" style="margin-bottom:12px; padding:12px; border:1px solid var(--border); border-radius:10px">
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${p.price.toLocaleString()} دج</div>
      </div>
      <div class="qty-ctrl">
        <input type="number" min="1" value="0" id="addQty-${p.id}" style="width:50px; padding:4px; border-radius:6px; border:1px solid var(--border); background:var(--surface); color:var(--text); text-align:center">
      </div>
    </div>
  `).join('');
}

async function confirmAddProducts() {
  if (pendingAddProductsOrderId === null) return;
  const order = orders.find(o => o.id == pendingAddProductsOrderId);
  if (!order) return;

  const selectedItems = [];
  products.filter(p => p.available).forEach(p => {
    const qtyInput = document.getElementById(`addQty-${p.id}`);
    const qty = parseInt(qtyInput?.value) || 0;
    if (qty > 0) {
      selectedItems.push({ name: p.name, qty: qty, price: p.price });
    }
  });

  if (selectedItems.length === 0) {
    closeModal('addProductsModal');
    pendingAddProductsOrderId = null;
    return;
  }

  const addedTotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const existingTotal = order.total || 0;
  const newTotal = existingTotal + addedTotal;

  const newItems = [...(order.items || []), ...selectedItems];

  try {
    const res = await callAPI('addToOrderItems', {
      orderId: pendingAddProductsOrderId,
      items: newItems,
      total: newTotal
    });
    if (res.success) {
      order.items = newItems;
      order.total = newTotal;
      order.updatedAt = new Date().toISOString();
      saveOrders(orders);
      showToast('✅ تم إضافة المنتجات للطلب', 'success');
    } else {
      showToast(`❌ ${res.error || 'تعذر إضافة المنتجات'}`, 'error');
    }
  } catch (e) {
    showToast('⚠️ لا يوجد اتصال بالسيرفر', 'error');
  }

  closeModal('addProductsModal');
  pendingAddProductsOrderId = null;
  renderOrders();
}

function viewOrderDetail(orderId) {
  const order = orders.find(o => o.id == orderId);
  if (!order) return;
  document.getElementById('orderDetailContent').innerHTML = `
    <div style="margin-bottom:16px">
      <strong>رقم الطلب:</strong> #${String(order.id).slice(-4)}<br>
      <strong>الطاولة:</strong> ${order.tableNumber}<br>
      <strong>العميل:</strong> ${order.customerName || '-'}<br>
      <strong>الهاتف:</strong> ${order.customerPhone || '-'}<br>
      <strong>الحالة:</strong> ${STATUS_LABELS[order.status]?.label}
    </div>
    <table style="width:100%; border-collapse:collapse">
      <thead><tr>
        <th style="text-align:right; padding:8px; background:var(--card); font-size:13px">المنتج</th>
        <th style="text-align:center; padding:8px; background:var(--card); font-size:13px">الكمية</th>
        <th style="text-align:left; padding:8px; background:var(--card); font-size:13px">السعر</th>
      </tr></thead>
      <tbody>
        ${(order.items || []).map(i => `
          <tr>
            <td style="padding:8px; border-top:1px solid var(--border)">${i.name}${i.note ? ` <span style="color:var(--text-muted); font-size:11px">(${i.note})</span>` : ''}</td>
            <td style="padding:8px; border-top:1px solid var(--border); text-align:center">${i.qty}</td>
            <td style="padding:8px; border-top:1px solid var(--border); text-align:left; color:var(--accent)">${(i.price * i.qty).toLocaleString()} دج</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${order.discount > 0 ? `<div style="margin-top:12px; color:var(--success)">الخصم: -${order.discount.toLocaleString()} دج</div>` : ''}
    <div style="margin-top:12px; font-size:18px; font-weight:900; color:var(--accent)">
      الإجمالي: ${(order.total || 0).toLocaleString()} دج
    </div>
  `;
  openModal('orderDetailModal');
}

// ===== PRODUCTS =====
function renderProducts() {
  const cats = categories.filter(c => c.id !== 'all');
  document.getElementById('pCategory').innerHTML = cats.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  document.getElementById('productsGrid').innerHTML = products.map(p => `
    <div class="item-card ${!p.available ? 'unavailable' : ''}">
      <div class="admin-product-image-wrap">
        ${productImageHtml(p.image, p.name, 'admin-product-image')}
      </div>
      <div class="item-body">
        <div class="item-name">${p.name}</div>
        <div class="item-price">${p.price.toLocaleString()} دج</div>
        <span class="item-cat">${getCatName(p.category)}</span>
      </div>
      <div class="item-footer">
        <label class="toggle-switch">
          <input type="checkbox" ${p.available ? 'checked' : ''} onchange="toggleProduct(${p.id})">
          <span class="toggle-track"></span>
          <span>${p.available ? 'متوفر' : 'غير متوفر'}</span>
        </label>
        <div class="item-actions">
          <button class="action-btn btn-info" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="action-btn btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function getCatName(id) {
  return categories.find(c => c.id === id)?.name || id;
}

async function saveProduct() {
  const name = document.getElementById('pName').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  const category = document.getElementById('pCategory').value;
  const image = document.getElementById('pImage').value.trim();
  const editId = document.getElementById('pEditId').value;

  if (!name || !price) { showToast('⚠️ يرجى ملء الحقول المطلوبة', 'error'); return; }
  if (!isImageUrl(image)) { showToast('⚠️ أدخل رابط صورة أو مسار صورة صحيح', 'error'); return; }

  let product;
  if (editId) {
    const idx = products.findIndex(p => p.id == editId);
    product = { ...products[idx], name, price, category, image };
    products[idx] = product;
  } else {
    product = { id: Date.now(), name, price, category, image, available: true };
    products.push(product);
  }

  saveProducts(products);
  try {
    const res = await saveProductOnServer(product);
    if (res.success && Array.isArray(res.products)) {
      products = res.products;
      saveProducts(products);
    } else if (!res.success) {
      showToast(res.error || '⚠️ تم الحفظ محلياً فقط', 'warning');
    }
  } catch {
    showToast('⚠️ تم الحفظ محلياً فقط', 'warning');
  }
  renderProducts();
  cancelProductEdit();
  showToast('✅ تم حفظ المنتج', 'success');
}

function editProduct(id) {
  const p = products.find(p => p.id == id);
  if (!p) return;
  document.getElementById('pName').value = p.name;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pImage').value = p.image || '';
  document.getElementById('pEditId').value = p.id;
  document.getElementById('pCancelBtn').style.display = 'inline-flex';
  document.getElementById('pName').focus();
  document.getElementById('productFormWrap').scrollIntoView({ behavior: 'smooth' });
}

function cancelProductEdit() {
  ['pName', 'pPrice', 'pImage'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pEditId').value = '';
  document.getElementById('pCancelBtn').style.display = 'none';
}

async function deleteProduct(id) {
  if (!confirm('حذف هذا المنتج؟')) return;
  products = products.filter(p => p.id != id);
  saveProducts(products);
  try {
    const res = await deleteProductFromServer(id);
    if (res.success && Array.isArray(res.products)) {
      products = res.products;
      saveProducts(products);
    }
  } catch {}
  renderProducts();
  showToast('🗑️ تم الحذف', 'success');
}

async function toggleProduct(id) {
  const p = products.find(p => p.id == id);
  if (p) {
    p.available = !p.available;
    saveProducts(products);
    renderProducts();
    try {
      const res = await updateProductAvailabilityOnServer(id, p.available);
      if (res.success && Array.isArray(res.products)) {
        products = res.products;
        saveProducts(products);
        renderProducts();
      }
    } catch {}
  }
}

// ===== CATEGORIES =====
function renderCategories() {
  document.getElementById('categoriesGrid').innerHTML = categories.map(c => `
    <div class="item-card" style="text-align:center">
      <div style="font-size:36px; margin-bottom:10px"><i class="${c.icon}"></i></div>
      <div class="item-name">${c.name}</div>
      <div style="font-size:12px; color:var(--text-muted); margin:4px 0 12px">${c.id}</div>
      ${c.id !== 'all' ? `<button class="action-btn btn-danger" onclick="deleteCategory('${c.id}')"><i class="fas fa-trash"></i> حذف</button>` : ''}
    </div>
  `).join('');
}

function addCategory() {
  const name = document.getElementById('catName').value.trim();
  const icon = document.getElementById('catIcon').value.trim();
  const id = document.getElementById('catId').value.trim();

  if (!name || !icon || !id) { showToast('⚠️ يرجى ملء جميع الحقول', 'error'); return; }
  if (categories.find(c => c.id === id)) { showToast('⚠️ المعرف موجود بالفعل', 'error'); return; }

  categories.push({ id, name, icon });
  saveCategories(categories);
  renderCategories();
  ['catName', 'catIcon', 'catId'].forEach(i => document.getElementById(i).value = '');
  showToast('✅ تم إضافة التصنيف', 'success');
}

function deleteCategory(id) {
  if (!confirm('حذف هذا التصنيف؟')) return;
  categories = categories.filter(c => c.id !== id);
  saveCategories(categories);
  renderCategories();
  showToast('🗑️ تم الحذف', 'success');
}

// ===== OFFERS =====
function renderOffers() {
  document.getElementById('offersGrid').innerHTML = offers.map(o => `
    <div class="offer-card">
      <div class="offer-info">
        <div class="offer-title">${o.title}</div>
        <div class="offer-details">
          خصم ${o.type === 'percent' ? o.value + '%' : o.value + ' دج'} | حد أدنى: ${o.minOrder} دج
        </div>
      </div>
      <div class="offer-actions">
        <label class="toggle-switch" style="margin:0">
          <input type="checkbox" ${o.active ? 'checked' : ''} onchange="toggleOffer(${o.id})">
          <span class="toggle-track"></span>
          <span>${o.active ? 'مفعّل' : 'معطّل'}</span>
        </label>
        <button class="action-btn btn-info" onclick="editOffer(${o.id})"><i class="fas fa-edit"></i></button>
        <button class="action-btn btn-danger" onclick="deleteOffer(${o.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

async function saveOffer() {
  const title = document.getElementById('ofTitle').value.trim();
  const type = document.getElementById('ofType').value;
  const value = parseFloat(document.getElementById('ofValue').value);
  const minOrder = parseFloat(document.getElementById('ofMin').value) || 0;
  const editId = document.getElementById('ofEditId').value;

  if (!title || !value) { showToast('⚠️ يرجى ملء الحقول المطلوبة', 'error'); return; }

  let offer;
  if (editId) {
    const existing = offers.find(o => o.id == editId);
    const active = existing ? existing.active : true;
    offer = { id: Number(editId), title, type, value, minOrder, active };
  } else {
    offer = { title, type, value, minOrder, active: true };
  }

  const res = await saveOfferOnServer(offer);
  if (res.success && Array.isArray(res.offers)) {
    offers = res.offers;
  }
  renderOffers();
  cancelOfferEdit();
  showToast('✅ تم حفظ العرض', 'success');
}

function editOffer(id) {
  const o = offers.find(o => o.id == id);
  if (!o) return;
  document.getElementById('ofTitle').value = o.title;
  document.getElementById('ofType').value = o.type;
  document.getElementById('ofValue').value = o.value;
  document.getElementById('ofMin').value = o.minOrder;
  document.getElementById('ofEditId').value = o.id;
  document.getElementById('ofCancelBtn').style.display = 'inline-flex';
}

function cancelOfferEdit() {
  ['ofTitle', 'ofValue', 'ofMin'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ofEditId').value = '';
  document.getElementById('ofCancelBtn').style.display = 'none';
}

async function deleteOffer(id) {
  if (!confirm('حذف هذا العرض؟')) return;
  const res = await deleteOfferOnServer(id);
  if (res.success && Array.isArray(res.offers)) {
    offers = res.offers;
  }
  renderOffers();
  showToast('🗑️ تم الحذف', 'success');
}

async function toggleOffer(id) {
  const o = offers.find(o => o.id == id);
  if (!o) return;
  o.active = !o.active;
  const res = await updateOfferOnServer(Number(id), { active: o.active });
  if (res.success && Array.isArray(res.offers)) {
    offers = res.offers;
  }
  renderOffers();
}

// ===== CUSTOMERS =====
async function loadCustomers() {
  const table = document.getElementById('customersTable');
  table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted)">
    <div class="loading" style="margin:auto"></div> جارٍ التحميل...
   </td></tr>`;

  try {
    const res = await callAPI('getAllCustomers');
    if (res.success) {
      customers = res.customers;
      renderCustomers();
    } else {
      table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted)">
        ❌ تعذّر تحميل البيانات. تأكد من إعداد Google Apps Script
       </td></tr>`;
    }
  } catch {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted)">
      ⚠️ لا يوجد اتصال بالسيرفر
     </td></tr>`;
  }
}

function renderCustomers() {
  if (customers.length === 0) {
    document.getElementById('customersTable').innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted)">لا يوجد عملاء مسجلون</td></tr>`;
    return;
  }

document.getElementById('customersTable').innerHTML = `
     <thead><tr>
       <th>#</th><th>الاسم</th><th>الهاتف</th><th>النقاط</th><th>المستوى</th><th>الطلبات</th><th>إجراءات</th>
      </tr></thead>
     <tbody>
     ${customers.map((c, i) => {
         const lvl = getLevel(c.points || 0);
         return `<tr>
         <td>${i + 1}</td>
         <td><strong>${c.name}</strong></td>
         <td style="direction:ltr; text-align:right">${c.phone}</td>
         <td><strong style="color:var(--accent)">${c.points || 0}</strong></td>
         <td><span class="status-badge ${lvl.class}">${lvl.badge} ${lvl.name}</span></td>
         <td>${c.ordersCount || 0}</td>
         <td>
           <button class="action-btn btn-info" onclick="openEditCustomer('${c.phone}', '${c.name}', ${c.points || 0})"><i class="fas fa-edit"></i></button>
           <button class="action-btn btn-danger" onclick="deleteCustomer('${c.phone}')" style="margin-right:4px"><i class="fas fa-trash"></i></button>
         </td>
       </tr>`;
       }).join('')}
     </tbody>
   `;
 }

 function searchCustomers() {
   const term = document.getElementById('customersSearch').value.trim().toLowerCase();
   const rows = document.querySelectorAll('#customersTable tbody tr');
   rows.forEach(row => {
     const name = row.cells[1].textContent.toLowerCase();
     const phone = row.cells[2].textContent.toLowerCase();
     const match = name.includes(term) || phone.includes(term);
     row.style.display = match ? '' : 'none';
   });
 }

 function openEditCustomer(phone, name, points) {
  document.getElementById('editCustPhone').value = phone;
  document.getElementById('editCustName').value = name;
  document.getElementById('editCustPoints').value = points;
  openModal('editCustomerModal');
}

async function saveCustomerEdit() {
  const phone = document.getElementById('editCustPhone').value;
  const name = document.getElementById('editCustName').value.trim();
  const points = parseInt(document.getElementById('editCustPoints').value) || 0;

  try {
    const res = await callAPI('updatePoints', { phone, points, name });
    if (res.success) {
      showToast('✅ تم تحديث بيانات العميل', 'success');
      closeModal('editCustomerModal');
      loadCustomers();
    } else {
      showToast('❌ خطأ في التحديث', 'error');
    }
  } catch {
    showToast('⚠️ لا يوجد اتصال', 'error');
  }
}

async function deleteCustomer(phone) {
  if (!confirm('حذف هذا العميل نهائياً؟')) return;
  try {
    const res = await callAPI('deleteCustomer', { phone });
    if (res.success) {
      showToast('🗑️ تم الحذف', 'success');
      loadCustomers();
    }
  } catch {
    showToast('⚠️ لا يوجد اتصال', 'error');
  }
}

// ===== QR =====
function generateQRCodes() {
  const count = parseInt(document.getElementById('tableCount').value) || 10;
  const baseUrl = document.getElementById('menuUrl').value.trim() || PUBLIC_MENU_URL;
  const grid = document.getElementById('qrGrid');
  grid.innerHTML = '';

  for (let t = 1; t <= count; t++) {
    const url = `${baseUrl}?table=${t}`;
    const div = document.createElement('div');
    div.className = 'qr-card';
    div.innerHTML = `<h4>طاولة ${t}</h4><div class="qr-wrap" id="qr-${t}"></div>
      <div style="font-size:11px; color:var(--text-muted); word-break:break-all">${url}</div>`;
    grid.appendChild(div);

    setTimeout(() => {
      new QRCode(document.getElementById(`qr-${t}`), {
        text: url,
        width: 100,
        height: 100,
        colorDark: '#000',
        colorLight: '#fff',
      });
    }, t * 50);
  }

  showToast(`✅ تم توليد ${count} رمز QR`, 'success');
}

// ===== HELPERS =====
function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) closeModal(el.id);
  });
});

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function loadingHtml() {
  return `<div style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></div>`;
}

// ===== LOYALTY =====
async function loadLoyaltyStats() {
  const grid = document.getElementById('loyaltyStatsGrid');
  grid.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon">👥</div>
      <div class="stat-value" id="loyaltyTotalCustomers">-</div>
      <div class="stat-label">إجمالي العملاء</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-icon">🏆</div>
      <div class="stat-value" id="loyaltyTotalPoints">-</div>
      <div class="stat-label">إجمالي النقاط</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon">🥇</div>
      <div class="stat-value" id="loyaltyGoldCount">-</div>
      <div class="stat-label">ذهبي</div>
    </div>
    <div class="stat-card" style="background:rgba(192,192,192,0.1)">
      <div class="stat-icon">🥈</div>
      <div class="stat-value" id="loyaltySilverCount">-</div>
      <div class="stat-label">فضي</div>
    </div>
    <div class="stat-card" style="background:rgba(205,127,50,0.1)">
      <div class="stat-icon">🥉</div>
      <div class="stat-value" id="loyaltyBronzeCount">-</div>
      <div class="stat-label">برونزي</div>
    </div>
  `;

  try {
    const res = await callAPI('getAllCustomers');
    if (res.success && res.customers) {
      customers = res.customers;
      renderLoyaltyStats(customers);
    } else {
      const localCustomers = buildLocalCustomersFromOrders();
      renderLoyaltyStats(localCustomers);
    }
  } catch {
    const localCustomers = buildLocalCustomersFromOrders();
    renderLoyaltyStats(localCustomers);
  }
}

function buildLocalCustomersFromOrders() {
  const allOrders = loadOrders();
  const customerMap = {};

  allOrders.forEach(o => {
    if (!o.customerPhone) return;
    const phone = String(o.customerPhone);
    if (!customerMap[phone]) {
      customerMap[phone] = {
        name: o.customerName || 'عميل',
        phone: phone,
        points: 0,
        ordersCount: 0,
        totalSpent: 0
      };
    }
    customerMap[phone].ordersCount++;
    customerMap[phone].totalSpent += (o.total || 0);
    customerMap[phone].points = Math.floor(customerMap[phone].totalSpent / 100);
  });

  return Object.values(customerMap);
}

function renderLoyaltyStats(list) {
  const totalCustomers = list.length;
  const totalPoints = list.reduce((s, c) => s + (c.points || 0), 0);
  const gold = list.filter(c => (c.points || 0) >= 300).length;
  const silver = list.filter(c => {
    const p = c.points || 0;
    return p >= 100 && p < 300;
  }).length;
  const bronze = list.filter(c => (c.points || 0) < 100).length;

  document.getElementById('loyaltyTotalCustomers').textContent = totalCustomers;
  document.getElementById('loyaltyTotalPoints').textContent = totalPoints.toLocaleString();
  document.getElementById('loyaltyGoldCount').textContent = gold;
  document.getElementById('loyaltySilverCount').textContent = silver;
  document.getElementById('loyaltyBronzeCount').textContent = bronze;

  // Render levels table
  const levelsTable = document.getElementById('loyaltyLevelsTable');
  if (list.length === 0) {
    levelsTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted)">لا يوجد عملاء مسجلون</td></tr>`;
  } else {
    levelsTable.innerHTML = `
      <thead><tr>
        <th>#</th><th>الاسم</th><th>الهاتف</th><th>النقاط</th><th>المستوى</th><th>إجراءات</th>
      </tr></thead>
      <tbody>
      ${list.map((c, i) => {
        const lvl = getLevel(c.points || 0);
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${c.name || '-'}</strong></td>
          <td style="direction:ltr; text-align:right">${c.phone}</td>
          <td><strong style="color:var(--accent)">${c.points || 0}</strong></td>
          <td><span class="status-badge ${lvl.class}">${lvl.badge} ${lvl.name}</span></td>
          <td>
            <button class="action-btn btn-info" onclick="openEditCustomer('${c.phone}', '${c.name || ''}', ${c.points || 0})"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-success" onclick="quickAddPoints('${c.phone}', '${c.name || ''}', ${c.points || 0})" style="margin-right:4px" title="إضافة نقاط"><i class="fas fa-plus"></i></button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    `;
  }

  // Render top customers as cards
  const topGrid = document.getElementById('topCustomersGrid');
  const sorted = [...list].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];

  if (sorted.length === 0) {
    topGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted)">لا توجد بيانات</div>`;
  } else {
    topGrid.innerHTML = sorted.map((c, i) => {
      const lvl = getLevel(c.points || 0);
      const rank = i < 3 ? medals[i] : (i + 1);
      return `<div class="item-card" style="text-align:center; padding:20px; cursor:pointer" onclick="openEditCustomer('${c.phone}', '${c.name || ''}', ${c.points || 0})">
        <div style="font-size:32px; margin-bottom:12px">${rank}</div>
        <div class="item-name" style="font-size:16px; margin-bottom:8px">${c.name || '-'}</div>
        <div style="font-size:14px; color:var(--text-muted); margin-bottom:8px; direction:ltr">${c.phone}</div>
        <div style="font-size:24px; font-weight:900; color:var(--accent); margin-bottom:10px">${c.points || 0} <span style="font-size:14px">نقطة</span></div>
        <span class="status-badge ${lvl.class}" style="font-size:13px">${lvl.badge} ${lvl.name}</span>
      </div>`;
    }).join('');
  }
}

function quickAddPoints(phone, name, currentPoints) {
  document.getElementById('loyaltyPhone').value = phone;
  document.getElementById('loyaltyPoints').value = '';
  document.getElementById('loyaltyReason').value = '';
  document.getElementById('loyaltyPhone').focus();
  showToast(`📱 العميل: ${name} — النقاط الحالية: ${currentPoints}`, 'success');
}

async function adjustLoyaltyPoints() {
  const phone = document.getElementById('loyaltyPhone').value.trim();
  const pointsDelta = parseInt(document.getElementById('loyaltyPoints').value);
  const reason = document.getElementById('loyaltyReason').value.trim();

  if (!phone) { showToast('⚠️ أدخل رقم الهاتف', 'error'); return; }
  if (isNaN(pointsDelta)) { showToast('⚠️ أدخل عدد النقاط', 'error'); return; }

  try {
    const getRes = await callAPI('getCustomer', { phone });
    let currentPoints = 0;
    let customerName = '';

    if (getRes.success && getRes.customer) {
      currentPoints = getRes.customer.points || 0;
      customerName = getRes.customer.name || '';
    } else {
      const localCustomers = buildLocalCustomersFromOrders();
      const local = localCustomers.find(c => c.phone === phone);
      if (local) {
        currentPoints = local.points || 0;
        customerName = local.name || '';
      }
    }

    const newPoints = Math.max(0, currentPoints + pointsDelta);

    const res = await callAPI('updatePoints', { phone, points: newPoints, name: customerName });
    if (res.success) {
      const action = pointsDelta > 0 ? 'إضافة' : 'خصم';
      showToast(`✅ تم ${action} ${Math.abs(pointsDelta)} نقطة. الرصيد الجديد: ${newPoints}`, 'success');
      document.getElementById('loyaltyPhone').value = '';
      document.getElementById('loyaltyPoints').value = '';
      document.getElementById('loyaltyReason').value = '';
      loadLoyaltyStats();
    } else {
      if (getRes.success === false) {
        showToast('⚠️ العميل غير مسجل في السيرفر. سيتم التسجيل أولاً...', 'warning');
        const regRes = await callAPI('registerCustomer', { name: customerName || 'عميل', phone });
        if (regRes.success) {
          const updateRes = await callAPI('updatePoints', { phone, points: newPoints });
          if (updateRes.success) {
            showToast(`✅ تم تسجيل العميل و${pointsDelta > 0 ? 'إضافة' : 'خصم'} النقاط`, 'success');
            loadLoyaltyStats();
          }
        }
      } else {
        showToast('❌ خطأ في التحديث', 'error');
      }
    }
  } catch {
    showToast('⚠️ لا يوجد اتصال بالسيرفر', 'error');
  }
}

// ===== PENDING REWARDS ADMIN =====
async function loadPendingRewards() {
  const grid = document.getElementById('pendingRewardsGrid');
  if (!grid) return;
  grid.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted)">جارٍ التحميل...</td></tr>`;
  try {
    const res = await callAPI('getPendingRewards');
    if (res.success && Array.isArray(res.pendingRewards)) {
      rewards = res.pendingRewards; // Store rewards in state
      renderPendingRewards(rewards);
      updateNewRewardRequestsBadge();
    } else {
      grid.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">لا توجد طلبات مكافأة معلقة</td></tr>`;
    }
  } catch {
    grid.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">خطأ في الاتصال</td></tr>`;
  }
}

function renderPendingRewards(requests) {
  const grid = document.getElementById('pendingRewardsGrid');
  if (!grid) return;
  if (requests.length === 0) {
    grid.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">لا توجد طلبات مكافأة معلقة</td></tr>`;
    return;
  }
  grid.innerHTML = requests.map(r => `
    <tr>
      <td>#${String(r.RequestID).slice(-4)}</td>
      <td>${r.Phone}</td>
      <td>${r.RewardName || r.RewardID}</td>
      <td>${new Date(r.CreatedAt).toLocaleString('ar-DZ')}</td>
      <td>
        <button class="action-btn btn-success" onclick="approveReward('${r.RequestID}')">✅ موافق</button>
        <button class="action-btn btn-danger" onclick="rejectReward('${r.RequestID}')">❌ رفض</button>
      </td>
    </tr>
  `).join('');
}

async function approveReward(requestId) {
  try {
    const res = await callAPI('approveReward', { requestId });
    if (res.success) {
      showToast('✅ تم اعتماد المكافأة', 'success');
      loadPendingRewards();
      loadLoyaltyStats();
    } else {
      showToast(res.error || 'خطأ في الاعتماد', 'error');
    }
  } catch {
    showToast('⚠️ لا يوجد اتصال', 'error');
  }
}

async function rejectReward(requestId) {
  try {
    const res = await callAPI('rejectReward', { requestId });
    if (res.success) {
      showToast('✅ تم رفض الطلب', 'success');
      loadPendingRewards();
    } else {
      showToast(res.error || 'خطأ في الرفض', 'error');
    }
  } catch {
    showToast('⚠️ لا يوجد اتصال', 'error');
  }
}

function showLoyaltyTab(tab, btn) {
  document.querySelectorAll('.loyalty-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`loyalty-tab-${tab}`).classList.add('active');
  document.querySelectorAll('#page-loyalty .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== LOYALTY =====
