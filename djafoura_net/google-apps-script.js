// =====================================================
// Google Apps Script - نظام مطعم DJ
// انسخ هذا الكود إلى script.google.com
// =====================================================

const SPREADSHEET_ID = "1OGMmA2oGMJ3u4ZjWckt0hGD0hey0NAFcwrbamf9Bms0";

// ===== دالة استقبال الطلبات =====
function doPost(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Content-Type": "application/json",
  };

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      // ----- العملاء -----
      case "registerCustomer":
        result = registerCustomer(data.name, data.phone);
        break;
      case "getCustomer":
        result = getCustomer(data.phone);
        break;
      case "getAllCustomers":
        result = getAllCustomers();
        break;
      case "updatePoints":
        result = updatePoints(data.phone, data.points, data.name);
        break;
      case "updateCustomer":
        result = updateCustomer(data.phone, data.name);
        break;
      case "deleteCustomer":
        result = deleteCustomer(data.phone);
        break;

      // ----- النقاط -----
      case "earnPoints":
        result = earnPoints(data.phone, data.orderTotal);
        break;

      // ----- الطلبات -----
      case "createOrder":
        result = createOrder(data.id, data.customer, data.items, data.total, data.table);
        break;
      case "getOrder":
        result = getOrder(data.orderId);
        break;
      case "getOrders":
        result = getOrders(data.phone);
        break;
      case "getAllOrders":
        result = getAllOrders();
        break;
      case "updateOrderStatus":
        result = updateOrderStatus(data.orderId, data.status, data.changedBy || "admin");
        break;
case "deleteOrder":
        result = deleteOrder(data.orderId);
        break;
      case "addToOrderItems":
        result = addToOrderItems(data.orderId, data.items, data.total);
        break;
      case "getProducts":
        result = getProducts();
        break;
      case "saveProduct":
        result = saveProduct(data.product);
        break;
      case "deleteProduct":
        result = deleteProduct(data.productId);
        break;
  case "updateProductAvailability":
    result = updateProductAvailability(data.productId, data.available);
    break;

      // ----- العروض -----
      case "getOffers":
        result = getOffers();
        break;
      case "saveOffer":
        result = saveOffer(data.offer);
        break;
      case "updateOffer":
        result = updateOffer(data.offerId, data.offer);
        break;
      case "deleteOffer":
        result = deleteOffer(data.offerId);
        break;

      // ----- الإحصائيات -----
      case "getStats":
        result = getStats();
        break;
      
      // ----- المكافآت -----
      case "requestReward":
        result = requestReward(data.phone, data.rewardId);
        break;
      case "getPendingRewards":
        result = getPendingRewards();
        break;
      case "approveReward":
        result = approveReward(data.requestId);
        break;
      case "rejectReward":
        result = rejectReward(data.requestId);
        break;
      case "getActiveOrderByTable":
        result = getActiveOrderByTable(data.tableNumber);
        break;

      default:
        result = { success: false, error: "Action غير معروف: " + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: "API يعمل بنجاح ✅" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// دوال الورقات
// =====================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    Customers: ["ID", "Name", "Phone", "Points", "Level", "OrdersCount", "TotalSpent", "JoinDate", "LastOrderDate"],
    Orders: ["ID", "TableNumber", "CustomerName", "CustomerPhone", "Items", "Total", "Status", "CreatedAt", "UpdatedAt", "PointsAwarded"],
    Offers: ["ID", "Title", "Type", "Value", "MinOrder", "Active"],
  };
  if (headers[name]) {
    sheet.appendRow(headers[name]);
    sheet.getRange(1, 1, 1, headers[name].length).setFontWeight("bold");
  }
}

function initHistorySheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("OrderHistory");
  if (!sheet) {
    sheet = ss.insertSheet("OrderHistory");
    sheet.appendRow(["OrderID", "OldStatus", "NewStatus", "ChangedBy", "ChangeDate"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// =====================================================
// العملاء
// =====================================================
function registerCustomer(name, phone) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return registerCustomerUnlocked(name, phone);
  } finally {
    lock.releaseLock();
  }
}

function registerCustomerUnlocked(name, phone) {
  name = String(name || "").trim();
  phone = normalizePhone(phone);
  if (!name || !phone) return { success: false, error: "الاسم والهاتف مطلوبان" };

  const sheet = getSheet("Customers");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf("Phone");
  const nameCol = headers.indexOf("Name");

  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === phone) {
      if (name && String(data[i][nameCol]).trim() !== name) {
        sheet.getRange(i + 1, nameCol + 1).setValue(name);
        data[i][nameCol] = name;
      }
      if (String(data[i][phoneCol]) !== phone) {
        sheet.getRange(i + 1, phoneCol + 1).setValue(phone);
      }
      data[i][phoneCol] = phone;
      return { success: true, customer: formatCustomer(rowToObject(headers, data[i])), isExisting: true };
    }
  }

  const now = new Date().toISOString();
  const id = Date.now();
  sheet.appendRow([id, name, phone, 0, "برونزي", 0, 0, now, ""]);
  return {
    success: true,
    customer: { id, name, phone, points: 0, level: "برونزي", ordersCount: 0, totalSpent: 0, joinDate: now },
    isExisting: false
  };
}

function getCustomer(phone) {
  phone = normalizePhone(phone);
  if (!phone) return { success: false, error: "الهاتف مطلوب" };

  const sheet = getSheet("Customers");
  const customers = sheetToObjects(sheet);
  const customer = customers.find(c => normalizePhone(c.Phone) === phone);

  if (!customer) return { success: false, error: "العميل غير موجود" };
  return { success: true, customer: formatCustomer(customer) };
}

function getAllCustomers() {
  deduplicateCustomers();
  const cache = CacheService.getScriptCache();
  const cached = cache.get("allCustomers");
  if (cached) return JSON.parse(cached);
  const sheet = getSheet("Customers");
  const customers = sheetToObjects(sheet);
  const result = {
    success: true,
    customers: customers.map(c => formatCustomer(c))
  };
  cache.put("allCustomers", JSON.stringify(result), 60);
  return result;
}

function updatePoints(phone, points, name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    phone = normalizePhone(phone);
    points = Math.max(0, parseInt(points, 10) || 0);
    const sheet = getSheet("Customers");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const phoneCol = headers.indexOf("Phone");
    const pointsCol = headers.indexOf("Points");
    const levelCol = headers.indexOf("Level");
    const nameCol = headers.indexOf("Name");

    for (let i = 1; i < data.length; i++) {
      if (normalizePhone(data[i][phoneCol]) === phone) {
        const level = calcLevel(points);
        sheet.getRange(i + 1, pointsCol + 1).setValue(points);
        sheet.getRange(i + 1, levelCol + 1).setValue(level);
        if (name) sheet.getRange(i + 1, nameCol + 1).setValue(name);
        return { success: true, points, level };
      }
    }

    return { success: false, error: "العميل غير موجود" };
  } finally {
    lock.releaseLock();
  }
}

function updateCustomer(phone, name) {
  phone = normalizePhone(phone);
  name = String(name || "").trim();
  if (!phone || !name) return { success: false, error: "الاسم والهاتف مطلوبان" };

  const sheet = getSheet("Customers");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf("Phone");
  const nameCol = headers.indexOf("Name");

  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === phone) {
      sheet.getRange(i + 1, nameCol + 1).setValue(name);
      sheet.getRange(i + 1, phoneCol + 1).setValue(phone);
      return { success: true, name, phone };
    }
  }
  return { success: false, error: "العميل غير موجود" };
}

function deleteCustomer(phone) {
  phone = normalizePhone(phone);
  const sheet = getSheet("Customers");
  const data = sheet.getDataRange().getValues();
  const phoneCol = data[0].indexOf("Phone");

  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === phone) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "العميل غير موجود" };
}

// =====================================================
// النقاط
// =====================================================
function earnPoints(phone, orderTotal) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    phone = normalizePhone(phone);
    const sheet = getSheet("Customers");
    return earnPointsUnlocked(sheet, phone, orderTotal);
  } finally {
    lock.releaseLock();
  }
}

function earnPointsUnlocked(sheet, phone, orderTotal) {
  orderTotal = Number(orderTotal) || 0;
  const earnedPoints = Math.floor(orderTotal / 100);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf("Phone");
  const pointsCol = headers.indexOf("Points");
  const levelCol = headers.indexOf("Level");
  const ordersCol = headers.indexOf("OrdersCount");
  const spentCol = headers.indexOf("TotalSpent");
  const lastOrderCol = headers.indexOf("LastOrderDate");

  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][phoneCol]) === phone) {
      const newPoints = (parseInt(data[i][pointsCol]) || 0) + earnedPoints;
      const newLevel = calcLevel(newPoints);
      const newOrders = (parseInt(data[i][ordersCol]) || 0) + 1;
      const newSpent = (parseFloat(data[i][spentCol]) || 0) + orderTotal;

      sheet.getRange(i + 1, pointsCol + 1).setValue(newPoints);
      sheet.getRange(i + 1, levelCol + 1).setValue(newLevel);
      sheet.getRange(i + 1, ordersCol + 1).setValue(newOrders);
      sheet.getRange(i + 1, spentCol + 1).setValue(newSpent);
      sheet.getRange(i + 1, lastOrderCol + 1).setValue(new Date().toISOString());

      return {
        success: true,
        earnedPoints,
        newTotal: newPoints,
        level: newLevel,
        customer: { phone, points: newPoints, level: newLevel }
      };
    }
  }

  return { success: false, error: "العميل غير موجود" };
}

// =====================================================
// الطلبات
// =====================================================
function createOrder(id, customer, items, total, table) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    customer = customer || {};
    items = Array.isArray(items) ? items : [];
    total = Number(total);
    id = String(id || Date.now());
    const phone = normalizePhone(customer.phone);
    const name = String(customer.name || "").trim();

    if (!name || !phone || !items.length || !Number.isFinite(total) || total < 0) {
      return { success: false, error: "بيانات الطلب غير مكتملة" };
    }

    const ordersSheet = getSheet("Orders");
    ensureColumn(ordersSheet, "PointsAwarded");
    const existing = sheetToObjects(ordersSheet).find(o => String(o.ID) === id);
    if (existing) {
      return { success: true, orderId: id, order: formatOrder(existing), loyalty: null, isExisting: true };
    }

    const customerResult = registerCustomerUnlocked(name, phone);
    if (!customerResult.success) return customerResult;

    const now = new Date().toISOString();
    ordersSheet.appendRow([id, table, name, phone, JSON.stringify(items), total, "new", now, now, false]);

    return {
      success: true,
      orderId: id,
      order: {
        id, tableNumber: table, customerName: name, customerPhone: phone,
        items, total, status: "new", createdAt: now, updatedAt: now
      },
      loyalty: null
    };
  } finally {
    lock.releaseLock();
  }
}

function getOrder(orderId) {
  const sheet = getSheet("Orders");
  const orders = sheetToObjects(sheet);
  const order = orders.find(o => String(o.ID) === String(orderId));

  if (!order) return { success: false, error: "الطلب غير موجود" };
  return { success: true, order: formatOrder(order) };
}

function getOrders(phone) {
  phone = normalizePhone(phone);
  const sheet = getSheet("Orders");
  const orders = sheetToObjects(sheet);
  const filtered = orders.filter(o => normalizePhone(o.CustomerPhone) === phone);
  return { success: true, orders: filtered.map(o => formatOrder(o)) };
}

function getAllOrders() {
  const sheet = getSheet("Orders");
  const orders = sheetToObjects(sheet)
    .map(o => formatOrder(o))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100);
  return { success: true, orders: orders };
}

function getActiveOrderByTable(tableNumber) {
  const sheet = getSheet("Orders");
  const orders = sheetToObjects(sheet);
  const activeStatus = ["new", "preparing", "ready"];
  const activeOrder = orders.find(o => o.TableNumber == tableNumber && activeStatus.includes(o.Status));
  if (activeOrder) {
    return { success: true, order: formatOrder(activeOrder) };
  }
  return { success: true, order: null };
}

function updateOrderStatus(orderId, status, changedBy = "admin") {
  const validStatuses = ["new", "preparing", "ready", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) return { success: false, error: "حالة الطلب غير صالحة" };
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet("Orders");
    const pointsAwardedCol = ensureColumn(sheet, "PointsAwarded");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    const statusCol = headers.indexOf("Status");
    const updatedCol = headers.indexOf("UpdatedAt");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(orderId)) {
        const oldStatus = data[i][statusCol];
        let loyalty = null;

        if (status === "delivered" && String(data[i][pointsAwardedCol]).toLowerCase() !== "true") {
          const order = rowToObject(headers, data[i]);
          loyalty = earnPointsUnlocked(getSheet("Customers"), normalizePhone(order.CustomerPhone), order.Total);
          if (!loyalty.success) return loyalty;
          sheet.getRange(i + 1, pointsAwardedCol + 1).setValue(true);
        }

        sheet.getRange(i + 1, statusCol + 1).setValue(status);
        sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());
        const historySheet = initHistorySheet();
        historySheet.appendRow([orderId, oldStatus, status, changedBy, new Date().toISOString()]);
        return { success: true, loyalty };
      }
    }
    return { success: false, error: "الطلب غير موجود" };
  } finally {
    lock.releaseLock();
  }
}

function deleteOrder(orderId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet("Orders");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(orderId)) {
        const order = rowToObject(headers, data[i]);
        if (String(order.PointsAwarded).toLowerCase() === "true") {
          reverseOrderPointsUnlocked(order);
        }
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: "الطلب غير موجود" };
  } finally {
lock.releaseLock();
  }
}

function addToOrderItems(orderId, items, total) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet("Orders");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    const itemsCol = headers.indexOf("Items");
    const totalCol = headers.indexOf("Total");
    const updatedCol = headers.indexOf("UpdatedAt");

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(orderId)) {
        sheet.getRange(i + 1, itemsCol + 1).setValue(JSON.stringify(items));
        sheet.getRange(i + 1, totalCol + 1).setValue(total);
        sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());
        return { success: true };
      }
    }
    return { success: false, error: "الطلب غير موجود" };
  } finally {
    lock.releaseLock();
  }
}

function reverseOrderPointsUnlocked(order) {
  const phone = normalizePhone(order.CustomerPhone);
  const total = Number(order.Total) || 0;
  const earnedPoints = Math.floor(total / 100);
  const sheet = getSheet("Customers");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = name => headers.indexOf(name);

  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][col("Phone")]) !== phone) continue;
    const points = Math.max(0, (parseInt(data[i][col("Points")], 10) || 0) - earnedPoints);
    const ordersCount = Math.max(0, (parseInt(data[i][col("OrdersCount")], 10) || 0) - 1);
    const totalSpent = Math.max(0, (parseFloat(data[i][col("TotalSpent")]) || 0) - total);
    sheet.getRange(i + 1, col("Points") + 1).setValue(points);
    sheet.getRange(i + 1, col("Level") + 1).setValue(calcLevel(points));
    sheet.getRange(i + 1, col("OrdersCount") + 1).setValue(ordersCount);
    sheet.getRange(i + 1, col("TotalSpent") + 1).setValue(totalSpent);
    return;
  }
}

// =====================================================
// الإحصائيات
// =====================================================
function getStats() {
  const sheet = getSheet("Customers");
  const customers = sheetToObjects(sheet);

  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((s, c) => s + (parseInt(c.Points) || 0), 0);
  const bronze = customers.filter(c => c.Level === "برونزي").length;
  const silver = customers.filter(c => c.Level === "فضي").length;
  const gold = customers.filter(c => c.Level === "ذهبي").length;

  const topByPoints = [...customers]
    .sort((a, b) => (parseInt(b.Points) || 0) - (parseInt(a.Points) || 0))
    .slice(0, 5)
    .map(c => formatCustomer(c));

  const topBySpent = [...customers]
    .sort((a, b) => (parseFloat(b.TotalSpent) || 0) - (parseFloat(a.TotalSpent) || 0))
    .slice(0, 5)
    .map(c => formatCustomer(c));

  return {
    success: true,
    stats: {
      totalCustomers,
      totalPoints,
      levels: { bronze, silver, gold },
      topByPoints,
      topBySpent
    }
  };
}

// =====================================================
// دوال مساعدة
// =====================================================
function calcLevel(points) {
  if (points >= 300) return "ذهبي";
  if (points >= 100) return "فضي";
  return "برونزي";
}

function normalizePhone(phone) {
  let value = String(phone || "").replace(/\D/g, "");
  if (value.indexOf("00213") === 0) value = value.slice(5);
  else if (value.indexOf("213") === 0) value = value.slice(3);
  if (value.length === 9) value = "0" + value;
  return value;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => obj[header] = row[index]);
  return obj;
}

function ensureColumn(sheet, columnName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  let index = headers.indexOf(columnName);
  if (index === -1) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(columnName).setFontWeight("bold");
  }
  return index;
}

function deduplicateCustomers() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet("Customers");
    const data = sheet.getDataRange().getValues();
    if (data.length < 3) return;

    const headers = data[0];
    const col = name => headers.indexOf(name);
    const phoneCol = col("Phone");
    const seen = {};
    const rowsToDelete = [];

    for (let i = 1; i < data.length; i++) {
      const phone = normalizePhone(data[i][phoneCol]);
      if (!phone) continue;
      if (!seen[phone]) {
        seen[phone] = i;
        data[i][phoneCol] = phone;
        continue;
      }

      const keep = seen[phone];
      data[keep][col("Points")] = (parseInt(data[keep][col("Points")], 10) || 0) + (parseInt(data[i][col("Points")], 10) || 0);
      data[keep][col("OrdersCount")] = (parseInt(data[keep][col("OrdersCount")], 10) || 0) + (parseInt(data[i][col("OrdersCount")], 10) || 0);
      data[keep][col("TotalSpent")] = (parseFloat(data[keep][col("TotalSpent")]) || 0) + (parseFloat(data[i][col("TotalSpent")]) || 0);
      data[keep][col("Level")] = calcLevel(data[keep][col("Points")]);
      data[keep][col("LastOrderDate")] = latestDate(data[keep][col("LastOrderDate")], data[i][col("LastOrderDate")]);
      rowsToDelete.push(i + 1);
    }

    Object.keys(seen).forEach(phone => {
      const rowIndex = seen[phone];
      sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([data[rowIndex]]);
    });
    rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
  } finally {
    lock.releaseLock();
  }
}

function latestDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function formatCustomer(c) {
  return {
    id: c.ID,
    name: c.Name,
    phone: c.Phone,
    points: parseInt(c.Points) || 0,
    level: c.Level || "برونزي",
    ordersCount: parseInt(c.OrdersCount) || 0,
    totalSpent: parseFloat(c.TotalSpent) || 0,
    joinDate: c.JoinDate,
    lastOrderDate: c.LastOrderDate,
  };
}

function formatOrder(o) {
  let items = [];
  try { items = JSON.parse(o.Items); } catch(e) { items = []; }
  return {
    id: o.ID,
    tableNumber: o.TableNumber,
    customerName: o.CustomerName,
    customerPhone: o.CustomerPhone,
    items: items,
    total: parseFloat(o.Total) || 0,
    status: o.Status || "new",
    createdAt: o.CreatedAt,
    updatedAt: o.UpdatedAt,
  };
}

// =====================================================
// طلبات المكافآت
// =====================================================

// =====================================================
// العروض
// =====================================================

function getOffers() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("offers");
  if (cached) return JSON.parse(cached);
  const sheet = getSheet("Offers");
  const data = sheet.getDataRange().getValues();
  const offers = [];
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const activeCol = headers.indexOf("Active");

  for (let i = 1; i < data.length; i++) {
    const offer = {
      id: data[i][idCol],
      title: data[i][headers.indexOf("Title")],
      type: data[i][headers.indexOf("Type")],
      value: parseFloat(data[i][headers.indexOf("Value")]) || 0,
      minOrder: parseFloat(data[i][headers.indexOf("MinOrder")]) || 0,
      active: String(data[i][activeCol]).toLowerCase() !== "false"
    };
    offers.push(offer);
  }

  const result = { success: true, offers: offers };
  cache.put("offers", JSON.stringify(result), 60);
  return result;
}

function saveOffer(offer) {
  if (!offer) return { success: false, error: "Offer is required" };

  const sheet = getSheet("Offers");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const id = offer.id || Date.now();
  const rowValues = [
    id,
    String(offer.title || "").trim(),
    String(offer.type || "").trim(),
    Number(offer.value) || 0,
    Number(offer.minOrder) || 0,
    offer.active !== false
  ];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return getOffers();
    }
  }

  sheet.appendRow(rowValues);
  return getOffers();
}

function updateOffer(offerId, offer) {
  if (!offerId) return { success: false, error: "Offer ID is required" };

  const sheet = getSheet("Offers");
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: "Offer not found" };

  const headers = data[0];
  const idCol = headers.indexOf("ID");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(offerId)) {
      const rowValues = [
        offerId,
        String(offer.title || offer.Title || "").trim(),
        String(offer.type || offer.Type || "").trim(),
        Number(offer.value || offer.Value) || 0,
        Number(offer.minOrder || offer.MinOrder) || 0,
        offer.active !== false && String(offer.active || offer.Active).toLowerCase() !== "false"
      ];
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return getOffers();
    }
  }

  return { success: false, error: "العرض غير موجود" };
}

function deleteOffer(offerId) {
  const sheet = getSheet("Offers");
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return getOffers();

  const headers = data[0];
  const idCol = headers.indexOf("ID");
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === String(offerId)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getOffers();
}

// =====================================================
// Products
// =====================================================

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

const DEFAULT_PRODUCTS_VERSION = "djafoura-menu-images-2026-06-05";

function getProductsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const name = "Products";
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = ["ID", "Name", "Price", "Category", "Image", "Available", "UpdatedAt"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  seedDefaultProducts(sheet);
  return sheet;
}

function seedDefaultProducts(sheet) {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty("DEFAULT_PRODUCTS_VERSION") === DEFAULT_PRODUCTS_VERSION) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const now = new Date().toISOString();
  const productRowsById = {};

  for (let i = 1; i < data.length; i++) {
    productRowsById[String(data[i][idCol])] = i + 1;
  }

  DEFAULT_PRODUCTS.forEach(function(product) {
    const rowValues = [
      product.id,
      product.name,
      product.price,
      product.category,
      product.image,
      product.available !== false,
      now
    ];

    const existingRow = productRowsById[String(product.id)];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  });

  properties.setProperty("DEFAULT_PRODUCTS_VERSION", DEFAULT_PRODUCTS_VERSION);
}

function formatProduct(p) {
  return {
    id: Number(p.ID) || p.ID,
    name: p.Name || "",
    price: Number(p.Price) || 0,
    category: p.Category || "",
    image: p.Image || "",
    available: String(p.Available).toLowerCase() !== "false",
    updatedAt: p.UpdatedAt || ""
  };
}

function getProducts() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("products");
  if (cached) return JSON.parse(cached);
  const sheet = getProductsSheet();
  const products = sheetToObjects(sheet).map(formatProduct);
  if (products.length === 0) {
    const filled = DEFAULT_PRODUCTS.map(function(p) {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.image,
        available: p.available
      };
    });
    const result = { success: true, products: filled };
    return result;
  }
  const result = { success: true, products: products };
  cache.put("products", JSON.stringify(result), 60);
  return result;
}

function saveProduct(product) {
  if (!product) return { success: false, error: "Product is required" };

  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const now = new Date().toISOString();
  const id = product.id || Date.now();
  const rowValues = [
    id,
    String(product.name || "").trim(),
    Number(product.price) || 0,
    product.category || "",
    product.image || "",
    product.available !== false,
    now
  ];

  if (!rowValues[1] || !rowValues[2]) {
    return { success: false, error: "Name and price are required" };
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return getProducts();
    }
  }

  sheet.appendRow(rowValues);
  return getProducts();
}

function deleteProduct(productId) {
  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return getProducts();

  const headers = data[0];
  const idCol = headers.indexOf("ID");
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === String(productId)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getProducts();
}

function updateProductAvailability(productId, available) {
  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: "Product not found" };

  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const availableCol = headers.indexOf("Available");
  const updatedAtCol = headers.indexOf("UpdatedAt");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(productId)) {
      sheet.getRange(i + 1, availableCol + 1).setValue(available !== false);
      if (updatedAtCol >= 0) {
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
      }
      return getProducts();
    }
  }
  return { success: false, error: "Product not found" };
}
function getRewardRequestsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const name = "RewardRequests";
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = [
      "RequestID",
      "Phone",
      "RewardID",
      "RewardName",
      "PointsCost",
      "Status",
      "CreatedAt",
      "ApprovedAt"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function findRewardRequest(requestId) {
  const sheet = getRewardRequestsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(requestId)) {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      return { row: i + 1, data: obj };
    }
  }
  return null;
}

function getRewardDefinition(rewardId) {
  const rewards = {
    "مشروب مجاني": { name: "مشروب مجاني", cost: 50 },
    "ميني بيتزا مجانية": { name: "ميني بيتزا مجانية", cost: 100 },
    "خصم 300 دج": { name: "خصم 300 دج", cost: 200 },
    "وجبة مجانية": { name: "وجبة مجانية", cost: 300 }
  };
  return rewards[rewardId] || { name: rewardId, cost: 0 };
}

function requestReward(phone, rewardId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    phone = normalizePhone(phone);
    if (!phone) return { success: false, error: "الهاتف غير صالح" };

    const custRes = getCustomer(phone);
    if (!custRes.success) return { success: false, error: "العميل غير موجود" };
    const customer = custRes.customer;

    const reward = getRewardDefinition(rewardId);
    if (!reward) return { success: false, error: "المكافأة غير موجودة" };

    if (customer.points < reward.cost) {
      return { success: false, error: "نقاط غير كافية" };
    }

    const sheet = getRewardRequestsSheet();
    const all = sheet.getDataRange().getValues();
    if (all.length > 1) {
      const headers = all[0];
      const phoneIdx = headers.indexOf("Phone");
      const rewardIdx = headers.indexOf("RewardID");
      const statusIdx = headers.indexOf("Status");
      for (let i = 1; i < all.length; i++) {
        if (normalizePhone(all[i][phoneIdx]) === phone && all[i][rewardIdx] === rewardId && all[i][statusIdx] === "Pending") {
          return { success: false, error: "هناك طلب مكافأة معلق مسبقاً لهذا العميل" };
        }
      }
    }

    const requestId = "REQ" + Date.now();
    const now = new Date().toISOString();
    sheet.appendRow([
      requestId,
      phone,
      rewardId,
      reward.name,
      reward.cost,
      "Pending",
      now,
      ""
    ]);
    return { success: true, message: "تم إرسال طلب المكافأة إلى الإدارة.", requestId: requestId };
  } finally {
    lock.releaseLock();
  }
}

function getPendingRewards() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("pendingRewards");
  if (cached) return JSON.parse(cached);
  const sheet = getRewardRequestsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    const result = { success: true, pendingRewards: [] };
    cache.put("pendingRewards", JSON.stringify(result), 60);
    return result;
  }
  const headers = data[0];
  const pending = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf("Status")] === "Pending") {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = data[i][idx]);
      pending.push(obj);
    }
  }
  pending.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
  const result = { success: true, pendingRewards: pending };
  cache.put("pendingRewards", JSON.stringify(result), 60);
  return result;
}

function approveReward(requestId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const req = findRewardRequest(requestId);
    if (!req) return { success: false, error: "طلب المكافأة غير موجود" };
    if (req.data.Status !== "Pending") return { success: false, error: "الطلب غير معلق" };

    const cost = Number(req.data.PointsCost) || 0;

    const custRes = getCustomer(req.data.Phone);
    if (!custRes.success) return { success: false, error: "العميل غير موجود" };
    const customer = custRes.customer;
    if (customer.points < cost) return { success: false, error: "نقاط غير كافية" };

    const newPoints = Math.max(0, customer.points - cost);
    const updateRes = updatePoints(req.data.Phone, newPoints);
    if (!updateRes.success) return { success: false, error: "فشل تحديث النقاط" };

    const sheet = getRewardRequestsSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf("Status") + 1;
    const approvedAtCol = headers.indexOf("ApprovedAt") + 1;
    
    sheet.getRange(req.row, statusCol).setValue("Approved");
    sheet.getRange(req.row, approvedAtCol).setValue(new Date().toISOString());

    return { success: true, message: "تم اعتماد المكافأة", newPoints: newPoints, newLevel: updateRes.level };
  } finally {
    lock.releaseLock();
  }
}

function rejectReward(requestId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const req = findRewardRequest(requestId);
    if (!req) return { success: false, error: "طلب المكافأة غير موجود" };
    if (req.data.Status !== "Pending") return { success: false, error: "الطلب غير معلق" };

    const sheet = getRewardRequestsSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf("Status") + 1;
    const approvedAtCol = headers.indexOf("ApprovedAt") + 1;
    
    sheet.getRange(req.row, statusCol).setValue("Rejected");
    sheet.getRange(req.row, approvedAtCol).setValue(new Date().toISOString());
    
    return { success: true, message: "تم رفض طلب المكافأة" };
  } finally {
    lock.releaseLock();
  }
}
