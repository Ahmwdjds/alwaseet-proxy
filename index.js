const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BASE_API = 'https://api.alwaseet-iq.net/v1/merchant';
const tokenCache = {};

// ✅ تسجيل الدخول وجلب التوكن
async function loginAndGetToken(username, password) {
  if (tokenCache[username]) {
    console.log(`[Cache] Using cached token for user: ${username}`);
    return tokenCache[username];
  }

  try {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);

    const response = await axios.post(`${BASE_API}/login`, form, {
      headers: form.getHeaders(),
    });

    if (response.data.status && response.data.data?.token) {
      const token = response.data.data.token;
      tokenCache[username] = token;
      return token;
    }

    throw new Error(response.data.msg || 'فشل تسجيل الدخول');
  } catch (err) {
    throw new Error(err.response?.data?.msg || 'فشل تسجيل الدخول');
  }
}

// ✅ تسجيل الدخول
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'مطلوب اسم المستخدم وكلمة المرور' });
  }

  try {
    const token = await loginAndGetToken(username, password);
    return res.json({ success: true, token });
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }
});

// ✅ إرسال الطلب الرسمي
app.post('/api/submit-order', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'مطلوب توكن صالح' });
  }

  const token = authHeader.split(' ')[1];
  const {
    client_name,
    client_mobile,
    client_mobile2,
    city_id,
    region_id,
    location,
    type_name,
    items_number,
    price,
    package_size,
    merchant_notes,
    replacement
  } = req.body;

  if (!client_name || !client_mobile || !city_id || !region_id || !location || !type_name || !items_number || !price || !package_size || replacement === undefined) {
    return res.status(400).json({ success: false, error: 'بعض الحقول المطلوبة مفقودة' });
  }

  try {
    const form = new FormData();
    form.append('client_name', client_name);
    form.append('client_mobile', client_mobile);
    if (client_mobile2) form.append('client_mobile2', client_mobile2);
    form.append('city_id', city_id.toString());
    form.append('region_id', region_id.toString());
    form.append('location', location);
    form.append('type_name', type_name);
    form.append('items_number', items_number.toString());
    form.append('price', price.toString());
    form.append('package_size', package_size.toString());
    if (merchant_notes) form.append('merchant_notes', merchant_notes);
    form.append('replacement', replacement.toString());

    const response = await axios.post(`${BASE_API}/create-order?token=${token}`, form, {
      headers: form.getHeaders()
    });

    const createdOrderId = response.data.data?.[0]?.order_id;
    if (!createdOrderId) {
      return res.json({
        success: true,
        order: {},
        message: response.data?.msg || 'تم إنشاء الطلب، لكن لم يتم العثور على رقم الطلب'
      });
    }

    // ✅ نبحث داخل الفواتير عن الفاتورة التي تحتوي هذا الطلب
    try {
      const invoicesRes = await axios.get(`${BASE_API}/get_merchant_invoices?token=${token}`);
      const invoices = invoicesRes.data.data || [];

      for (const invoice of invoices) {
        const invoiceId = invoice.id;
        const ordersRes = await axios.get(`${BASE_API}/get_merchant_invoice_orders?token=${token}&invoice_id=${invoiceId}`);
        const orders = ordersRes.data.data || [];

        const foundOrder = orders.find(order => order.order_id === createdOrderId);
        if (foundOrder) {
          return res.json({
            success: true,
            order: response.data.data?.[0],
            invoice: {
              id: invoice.id,
              merchant_price: invoice.merchant_price,
              delivered_orders_count: invoice.delivered_orders_count,
              status: invoice.status
            },
            message: 'تم إنشاء الطلب وتحديد الفاتورة بنجاح'
          });
        }
      }

      // إذا لم يتم العثور عليه
      return res.json({
        success: true,
        order: response.data.data?.[0],
        message: 'تم إنشاء الطلب، لكن لم يتم العثور على الفاتورة الخاصة به حتى الآن'
      });

    } catch (err) {
      return res.json({
        success: true,
        order: response.data.data?.[0],
        message: 'تم إنشاء الطلب، لكن حدث خطأ أثناء محاولة جلب الفاتورة',
        invoice_error: err.response?.data || err.message
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'فشل إرسال الطلب',
      details: err.response?.data || err.message
    });
  }
});

// ✅ تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy server running on port ${PORT}`));
