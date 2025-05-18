// خادم وسيط للتواصل مع API الوسيط
// يستخدم فقط البيانات الفعلية من API وسيط دون أي بيانات احتياطية
// متوافق تماماً مع وثائق وسيط الرسمية

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 5002;

// إعداد CORS للسماح بالوصول من أي مصدر
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// إضافة middleware لتسجيل جميع الطلبات
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  next();
});

// إعداد multer لمعالجة طلبات multipart/form-data
const upload = multer();

// عنوان API الوسيط
const API_BASE_URL = 'https://api.alwaseet-iq.net/v1/merchant';

// دالة مساعدة لتصحيح تنسيق رقم الهاتف
function formatPhoneNumber(phone) {
  console.log(`تصحيح رقم الهاتف: ${phone}`);
  
  // إزالة أي مسافات أو رموز غير ضرورية
  let cleanPhone = phone.replace(/\s+/g, '');
  
  // إذا كان الرقم يبدأ بـ 0، نزيله ونضيف +964
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
    cleanPhone = '+964' + cleanPhone;
  } 
  // إذا كان الرقم يبدأ بـ 964، نضيف + في البداية
  else if (cleanPhone.startsWith('964')) {
    cleanPhone = '+' + cleanPhone;
  }
  // إذا كان الرقم يبدأ بـ 7، نضيف +964 في البداية
  else if (cleanPhone.startsWith('7')) {
    cleanPhone = '+964' + cleanPhone;
  }
  // إذا كان الرقم لا يبدأ بـ +964، نضيفه
  else if (!cleanPhone.startsWith('+964')) {
    cleanPhone = '+964' + cleanPhone;
  }
  
  // التأكد من أن الرقم يحتوي على 10 أرقام بعد +964
  const digitsAfterCode = cleanPhone.substring(4);
  if (digitsAfterCode.length !== 10) {
    console.log(`خطأ: رقم الهاتف يجب أن يحتوي على 10 أرقام بعد مفتاح الدولة +964، الرقم الحالي: ${cleanPhone}`);
    throw new Error('رقم الهاتف يجب أن يحتوي على 10 أرقام بعد مفتاح الدولة +964');
  }
  
  console.log(`رقم الهاتف بعد التصحيح: ${cleanPhone}`);
  return cleanPhone;
}

// نقطة نهاية تسجيل الدخول
app.post('/api/auth/login', upload.none(), async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`محاولة تسجيل دخول: ${username}`);
    
    if (!username || !password) {
      console.log('خطأ: اسم المستخدم وكلمة المرور مطلوبان');
      return res.status(400).json({
        status: false,
        errNum: 'E001',
        msg: 'اسم المستخدم وكلمة المرور مطلوبان'
      });
    }
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    console.log(`إرسال طلب تسجيل دخول إلى ${API_BASE_URL}/login`);
    const response = await axios.post(`${API_BASE_URL}/login`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('استجابة تسجيل الدخول:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية جلب المدن - تم تصحيح المسار من cities إلى citys حسب وثائق وسيط
app.get('/api/cities', async (req, res) => {
  try {
    console.log('طلب جلب المدن');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('خطأ: التوكن مطلوب');
      return res.status(401).json({
        status: false,
        errNum: 'E002',
        msg: 'التوكن مطلوب'
      });
    }
    
    // تصحيح المسار من cities إلى citys حسب وثائق وسيط
    console.log(`إرسال طلب جلب المدن إلى ${API_BASE_URL}/citys?token=${token}`);
    const response = await axios.get(`${API_BASE_URL}/citys?token=${token}`);
    
    console.log('استجابة جلب المدن:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في جلب المدن:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية جلب المناطق - تم تصحيح المسار حسب وثائق وسيط
app.get('/api/regions/:cityId', async (req, res) => {
  try {
    const { cityId } = req.params;
    console.log(`طلب جلب المناطق للمدينة: ${cityId}`);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('خطأ: التوكن مطلوب');
      return res.status(401).json({
        status: false,
        errNum: 'E002',
        msg: 'التوكن مطلوب'
      });
    }
    
    // تصحيح المسار حسب وثائق وسيط
    console.log(`إرسال طلب جلب المناطق إلى ${API_BASE_URL}/regions?city_id=${cityId}&token=${token}`);
    const response = await axios.get(`${API_BASE_URL}/regions?city_id=${cityId}&token=${token}`);
    
    console.log('استجابة جلب المناطق:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في جلب المناطق:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية جلب أحجام الطرود - تم تصحيح المسار حسب وثائق وسيط
app.get('/api/package-sizes', async (req, res) => {
  try {
    console.log('طلب جلب أحجام الطرود');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('خطأ: التوكن مطلوب');
      return res.status(401).json({
        status: false,
        errNum: 'E002',
        msg: 'التوكن مطلوب'
      });
    }
    
    // تصحيح المسار حسب وثائق وسيط
    console.log(`إرسال طلب جلب أحجام الطرود إلى ${API_BASE_URL}/package-sizes?token=${token}`);
    const response = await axios.get(`${API_BASE_URL}/package-sizes?token=${token}`);
    
    console.log('استجابة جلب أحجام الطرود:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في جلب أحجام الطرود:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية إنشاء طلب جديد
app.post('/api/orders/create', upload.none(), async (req, res) => {
  try {
    console.log('طلب إنشاء طلب جديد:', req.body);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('خطأ: التوكن مطلوب');
      return res.status(401).json({
        status: false,
        errNum: 'E002',
        msg: 'التوكن مطلوب'
      });
    }
    
    const formData = new FormData();
    
    // تصحيح تنسيق رقم الهاتف حسب وثائق وسيط الرسمية
    try {
      if (req.body.client_mobile) {
        const formattedPhone = formatPhoneNumber(req.body.client_mobile);
        formData.append('client_mobile', formattedPhone);
      } else {
        console.log('خطأ: رقم هاتف العميل مطلوب');
        return res.status(400).json({
          status: false,
          errNum: 'E003',
          msg: 'رقم هاتف العميل مطلوب'
        });
      }
    } catch (phoneError) {
      console.log('خطأ في تنسيق رقم الهاتف:', phoneError.message);
      return res.status(400).json({
        status: false,
        errNum: 'E004',
        msg: phoneError.message
      });
    }
    
    // إضافة باقي البيانات إلى formData
    for (const key in req.body) {
      if (key !== 'client_mobile') {
        formData.append(key, req.body[key]);
      }
    }
    
    // تحويل parcel_type إلى type_name حسب وثائق وسيط
    if (req.body.parcel_type && !req.body.type_name) {
      formData.append('type_name', req.body.parcel_type);
    }
    
    // تحويل pieces_count إلى items_number حسب وثائق وسيط
    if (req.body.pieces_count && !req.body.items_number) {
      formData.append('items_number', req.body.pieces_count);
    }
    
    // تحويل package_size إلى package_size_id حسب وثائق وسيط
    if (req.body.package_size) {
      let packageSizeId = '1'; // صغير افتراضياً
      
      if (req.body.package_size === 'medium') {
        packageSizeId = '2';
      } else if (req.body.package_size === 'large') {
        packageSizeId = '3';
      }
      
      formData.append('package_size', packageSizeId);
    }
    
    console.log(`إرسال طلب إنشاء طلب جديد إلى ${API_BASE_URL}/create-order?token=${token}`);
    const response = await axios.post(`${API_BASE_URL}/create-order?token=${token}`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('استجابة إنشاء الطلب:', response.data);
    
    // إضافة رابط QR إلى الاستجابة إذا كان موجوداً
    if (response.data.status && response.data.data && response.data.data.qr_link) {
      response.data.data.qr_url = response.data.data.qr_link.trim();
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في إنشاء الطلب:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية استرجاع الفاتورة
app.get('/api/orders/invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`طلب استرجاع الفاتورة للطلب: ${orderId}`);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('خطأ: التوكن مطلوب');
      return res.status(401).json({
        status: false,
        errNum: 'E002',
        msg: 'التوكن مطلوب'
      });
    }
    
    console.log(`إرسال طلب استرجاع الفاتورة إلى ${API_BASE_URL}/get_merchant_invoice_orders?order_id=${orderId}&token=${token}`);
    const response = await axios.get(`${API_BASE_URL}/get_merchant_invoice_orders?order_id=${orderId}&token=${token}`);
    
    console.log('استجابة استرجاع الفاتورة:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('خطأ في استرجاع الفاتورة:', error.message);
    
    if (error.response) {
      console.error('استجابة الخطأ:', error.response.data);
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({
      status: false,
      errNum: 'E999',
      msg: 'حدث خطأ أثناء الاتصال بخادم الوسيط'
    });
  }
});

// نقطة نهاية للصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    status: true,
    msg: 'مرحباً بك في خدمة API لنظام إدارة طلبات التوصيل',
    version: '1.0.0'
  });
});

// نقطة نهاية للتحقق من حالة الخادم
app.get('/api/health', (req, res) => {
  res.json({
    status: true,
    msg: 'الخادم يعمل بشكل صحيح',
    timestamp: new Date().toISOString()
  });
});

// بدء تشغيل الخادم
app.listen(port, '0.0.0.0', () => {
  console.log(`الخادم الوسيط يعمل على المنفذ ${port}`);
  console.log('المسارات المتاحة:');
  console.log('- POST /api/auth/login - تسجيل الدخول');
  console.log('- GET /api/cities - جلب المدن (يستخدم endpoint citys)');
  console.log('- GET /api/regions/:cityId - جلب المناطق');
  console.log('- GET /api/package-sizes - جلب أحجام الطرود');
  console.log('- POST /api/orders/create - إنشاء طلب جديد');
  console.log('- GET /api/orders/invoice/:orderId - استرجاع الفاتورة');
});

module.exports = app;
