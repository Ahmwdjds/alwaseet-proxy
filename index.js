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

// ✅ دالة تسجيل الدخول
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

    console.log('[Login Response]', response.data);

    if (response.data.status && response.data.data?.token) {
      const token = response.data.data.token;
      tokenCache[username] = token;
      return token;
    }

    throw new Error(response.data.msg || 'فشل تسجيل الدخول');
  } catch (err) {
    console.error('[Login Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.msg || 'فشل تسجيل الدخول');
  }
}

// ✅ POST /api/login
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

// ✅ GET /api/cities
app.get('/api/cities', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'مطلوب توكن صالح' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.get(`${BASE_API}/citys`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return res.json({ success: true, cities: response.data.data });
  } catch (err) {
    console.error('[Cities Error]', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: 'فشل في جلب المدن' });
  }
});

// ✅ GET /api/regions?city_id=ID
app.get('/api/regions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cityId = req.query.city_id;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'مطلوب توكن صالح' });
  }

  if (!cityId) {
    return res.status(400).json({ success: false, error: 'يجب إرسال city_id في الرابط' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.get(`${BASE_API}/regions?city_id=${cityId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return res.json({ success: true, regions: response.data.data });
  } catch (err) {
    console.error('[Regions Error]', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: 'فشل في جلب المناطق' });
  }
});

// ✅ POST /api/submit-order
app.post('/api/submit-order', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'مطلوب توكن صالح' });
  }

  const token = authHeader.split(' ')[1];
  const {
    customer_name, city, area, phone,
    product_type, price, quantity
  } = req.body;

  if (!customer_name || !city || !area || !phone || !product_type || !price || !quantity) {
    return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة' });
  }

  try {
    const form = new FormData();
    form.append('customer_name', customer_name);
    form.append('city', city);
    form.append('area', area);
    form.append('phone', phone);
    form.append('product_type', product_type);
    form.append('price', price.toString());
    form.append('quantity', quantity.toString());

    const response = await axios.post(`${BASE_API}/create-order`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    return res.json({ success: true, order_number: response.data?.data?.order_number || null });
  } catch (err) {
    console.error('[Order Error]', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: 'فشل إرسال الطلب' });
  }
});

// ✅ تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy server running on port ${PORT}`));
