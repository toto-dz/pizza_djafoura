const fs = require('fs');
const vm = require('vm');

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`❌ لا يمكن قراءة الملف: ${file}`);
    process.exit(1);
  }
}

function checkSyntax(name, source) {
  try {
    new vm.Script(source, { filename: name });
    console.log(`✅ ${name} - صحيح نحويًا`);
  } catch (e) {
    console.error(`❌ ${name} - خطأ نحوي: ${e.message}`);
    process.exit(1);
  }
}

console.log('🔍 بدء فحص المشروع...\n');

// ===== 1. فحص بناء الجملة =====
console.log('📋 فحص بناء الجملة:');
checkSyntax('config.js', read('config.js'));
checkSyntax('google-apps-script.js', read('google-apps-script.js'));
checkSyntax('menudj.js', read('menudj.js'));
checkSyntax('admindj.js', read('admindj.js'));

// ===== 2. فحص دوال Google Apps Script =====
console.log('\n📋 فحص دوال Google Apps Script:');
const gasContext = {};
vm.createContext(gasContext);
vm.runInContext(read('google-apps-script.js'), gasContext);

// فحص normalizePhone
const phoneCases = [
  ['0555 12-34-56', '0555123456'],
  ['+213 555 12 34 56', '0555123456'],
  ['00213 555 12 34 56', '0555123456'],
  ['0555123456', '0555123456'],
  ['213555123456', '0555123456'],
];

for (const [input, expected] of phoneCases) {
  const actual = gasContext.normalizePhone(input);
  if (actual !== expected) {
    throw new Error(`normalizePhone("${input}") returned "${actual}", expected "${expected}"`);
  }
}
console.log('✅ normalizePhone - يعمل بشكل صحيح');

// فحص calcLevel
if (gasContext.calcLevel(50) !== 'برونزي') throw new Error('calcLevel(50)');
if (gasContext.calcLevel(150) !== 'فضي') throw new Error('calcLevel(150)');
if (gasContext.calcLevel(350) !== 'ذهبي') throw new Error('calcLevel(350)');
console.log('✅ calcLevel - يعمل بشكل صحيح');

// ===== 3. فحص إعدادات config.js =====
console.log('\n📋 فحص إعدادات config.js:');
const configContext = {};
vm.createContext(configContext);
vm.runInContext(read('config.js'), configContext);

// فحص calcPoints
if (configContext.calcPoints(99) !== 0 || configContext.calcPoints(250) !== 2) {
  throw new Error('نظام النقاط يجب أن يمنح نقطة واحدة لكل 100 دج كاملة');
}
console.log('✅ calcPoints - يعمل بشكل صحيح');

// فحص isImageUrl
if (!configContext.isImageUrl('https://example.com/product.jpg')) {
  throw new Error('isImageUrl يجب أن تقبل روابط HTTPS');
}
if (configContext.isImageUrl('🍕')) {
  throw new Error('isImageUrl يجب أن ترفض الإيموجي كصور');
}
if (configContext.isImageUrl('')) {
  throw new Error('isImageUrl يجب أن ترفض الروابط الفارغة');
}
console.log('✅ isImageUrl - يعمل بشكل صحيح');

// فحص getLevel
const level = configContext.getLevel(150);
if (level.name !== 'فضي') throw new Error('getLevel(150) يجب أن يعيد "فضي"');
console.log('✅ getLevel - يعمل بشكل صحيح');

// فحص وجود RESTAURANT_LOGO_URL
const configSource = read('config.js');
if (!configSource.includes('const RESTAURANT_LOGO_URL')) {
  throw new Error('إعداد رابط شعار المطعم مفقود');
}
console.log('✅ RESTAURANT_LOGO_URL - موجود');

// فحص وجود ADMIN_PASSWORD
if (!configSource.includes('const ADMIN_PASSWORD')) {
  throw new Error('إعداد كلمة مرور المشرف مفقود');
}
console.log('✅ ADMIN_PASSWORD - موجود');

// ===== 4. فحص menudj.js =====
console.log('\n📋 فحص menudj.js:');
const menuSource = read('menudj.js');

// التحقق من استخدام API الصحيح
if (menuSource.includes("callAPI('earnPoints'")) {
  throw new Error('يتم منح النقاط بشكل منفصل عن createOrder - يجب أن تتم عبر updateOrderStatus');
}
console.log('✅ لا توجد نقاط منفصلة - صحيح');

if (!menuSource.includes("callAPI('createOrder'")) {
  throw new Error('لا يتم إنشاء الطلبات عبر API');
}
console.log('✅ createOrder عبر API - صحيح');

if (!menuSource.includes('productImageHtml(p.image, p.name)')) {
  throw new Error('لا يتم عرض صور المنتجات بشكل صحيح');
}
console.log('✅ productImageHtml - مستخدم بشكل صحيح');

if (!menuSource.includes('openLoyalty()')) {
  throw new Error('نافذة الولاء غير متصلة');
}
console.log('✅ openLoyalty - موجود');

if (!menuSource.includes('refreshLoyaltyPoints')) {
  throw new Error('تحديث النقاط غير متصل بعد التسليم');
}
console.log('✅ refreshLoyaltyPoints - موجود');

if (!menuSource.includes('requestReward')) {
  throw new Error('دالة طلب المكافأة مفقودة');
}
console.log('✅ requestReward - موجود');

// فحص وجود showTab
if (!menuSource.includes('function showTab')) {
  console.log('⚠️ تحذير: showTab غير معرفة، قد لا يعمل التنقل السفلي');
} else {
  console.log('✅ showTab - موجود');
}

// ===== 5. فحص admindj.js =====
console.log('\n📋 فحص admindj.js:');
const adminSource = read('admindj.js');

if (!adminSource.includes("if (!isImageUrl(image))")) {
  throw new Error('نموذج إضافة المنتج لا يتحقق من روابط الصور');
}
console.log('✅ التحقق من روابط الصور - موجود');

if (!adminSource.includes('renderLoyaltyStats')) {
  throw new Error('دالة إحصائيات الولاء مفقودة');
}
console.log('✅ renderLoyaltyStats - موجود');

if (!adminSource.includes('loadPendingRewards')) {
  throw new Error('دالة تحميل طلبات المكافآت مفقودة');
}
console.log('✅ loadPendingRewards - موجود');

if (!adminSource.includes('approveReward')) {
  throw new Error('دالة اعتماد المكافأة مفقودة');
}
console.log('✅ approveReward - موجود');

// ===== 6. فحص روابط HTML =====
console.log('\n📋 فحص روابط HTML:');
const menuHtml = read('menudj.html');
const adminHtml = read('admindj.html');

if (!menuHtml.includes('<script src="menudj.js"></script>')) {
  throw new Error('menudj.html غير مرتبط بـ menudj.js');
}
console.log('✅ menudj.html ← menudj.js');

if (!adminHtml.includes('<script src="admindj.js"></script>')) {
  throw new Error('admindj.html غير مرتبط بـ admindj.js');
}
console.log('✅ admindj.html ← admindj.js');

if (!menuHtml.includes('config.js')) {
  throw new Error('menudj.html غير مرتبط بـ config.js');
}
console.log('✅ menudj.html ← config.js');

if (!adminHtml.includes('config.js')) {
  throw new Error('admindj.html غير مرتبط بـ config.js');
}
console.log('✅ admindj.html ← config.js');

// ===== 7. فحص دوال الطلبات المحلية =====
console.log('\n📋 فحص دوال الطلبات المحلية:');
if (!configSource.includes('function loadOrders()')) {
  throw new Error('loadOrders غير معرفة في config.js');
} else {
  console.log('✅ loadOrders - موجودة');
}

if (!configSource.includes('function saveOrders(orders)')) {
  throw new Error('saveOrders غير معرفة في config.js');
} else {
  console.log('✅ saveOrders - موجودة');
}

// ===== 8. فحص تطابق عمليات الواجهة مع Google Apps Script =====
console.log('\n📋 فحص تطابق عمليات API:');
const gasSource = read('google-apps-script.js');
const clientSources = [configSource, menuSource, adminSource].join('\n');
const clientActions = [...clientSources.matchAll(/callAPI\(['"]([^'"]+)['"]/g)].map(match => match[1]);
const serverActions = new Set([...gasSource.matchAll(/case\s+["']([^"']+)["']/g)].map(match => match[1]));
const unsupportedActions = [...new Set(clientActions)].filter(action => !serverActions.has(action));
if (unsupportedActions.length) {
  throw new Error(`عمليات API غير مدعومة في الخادم: ${unsupportedActions.join(', ')}`);
}
console.log('✅ جميع عمليات الواجهة مدعومة في الخادم');

const adminFunctions = [...adminSource.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)]
  .map(match => match[1]);
const duplicateAdminFunctions = [...new Set(adminFunctions.filter((name, index) => adminFunctions.indexOf(name) !== index))];
if (duplicateAdminFunctions.length) {
  throw new Error(`دوال مكررة في admindj.js: ${duplicateAdminFunctions.join(', ')}`);
}
console.log('✅ لا توجد دوال مكررة في admindj.js');

// ===== 9. فحص دوال المكافآت في Google Apps Script =====
console.log('\n📋 فحص دوال المكافآت:');

if (!gasSource.includes('status === "delivered"')) {
  throw new Error('يجب منح النقاط بعد التسليم');
}
console.log('✅ منح النقاط بعد التسليم - موجود');

if (!gasSource.includes('PointsAwarded')) {
  throw new Error('حقل PointsAwarded مفقود');
}
console.log('✅ PointsAwarded - موجود');

if (!gasSource.includes('requestReward')) {
  throw new Error('دالة طلب المكافأة مفقودة');
}
console.log('✅ requestReward - موجود');

if (!gasSource.includes('getPendingRewards')) {
  throw new Error('دالة جلب الطلبات المعلقة مفقودة');
}
console.log('✅ getPendingRewards - موجود');

if (!gasSource.includes('approveReward')) {
  throw new Error('دالة اعتماد المكافأة مفقودة');
}
console.log('✅ approveReward - موجود');

if (!gasSource.includes('getRewardDefinition')) {
  throw new Error('دالة تعريف المكافآت مفقودة');
}
console.log('✅ getRewardDefinition - موجود');

// ===== 10. فحص إعدادات SPREADSHEET_ID =====
console.log('\n📋 فحص إعدادات Google Sheets:');
if (!gasSource.includes('SPREADSHEET_ID = "1OGMmA2oGMJ3u4ZjWckt0hGD0hey0NAFcwrbamf9Bms0"')) {
  console.log('⚠️ تحذير: SPREADSHEET_ID قد يكون مختلفًا عن الإعداد الافتراضي');
} else {
  console.log('✅ SPREADSHEET_ID - موجود');
}

// ===== 11. فحص الروابط الخارجية =====
console.log('\n📋 فحص الروابط الخارجية:');
if (!configSource.includes('GOOGLE_APPS_SCRIPT_URL')) {
  throw new Error('رابط Google Apps Script مفقود من config.js');
}
console.log('✅ GOOGLE_APPS_SCRIPT_URL - موجود');

// ===== النتيجة النهائية =====
console.log('\n' + '='.repeat(50));
console.log('🎉 جميع الفحوصات اجتازت بنجاح!');
console.log('✅ المشروع جاهز للنشر');
console.log('='.repeat(50));
