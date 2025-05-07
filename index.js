const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const BASE_API = 'https://api.alwaseet-iq.net/v1/merchant';

// ✅ كاش لحفظ التوكنات
const tokenCache = {};

// ✅ دالة تسجيل الدخول وجلب التوكن
async function loginAndGetToken(username, password) {
  if (tokenCache[username]) {
    return tokenCache[username];
  }

  try {
    const loginData = new URLSearchParams();
    loginData.append('username', username);
    loginData.append('password', password);

    const response = await axios.post(`${BASE_API}/login`, loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.status && response.data.token) {
      tokenCache[username] = response.data.token;
      return response.data.token;
    } else {
      throw new Error('فشل تسجيل الدخول، تحقق من البيانات');
    }
  } catch (err) {
    throw new Error('فشل تسجيل الدخول: ' + err.message);
  }
}

// ✅ مسار login للربط من الواجهة
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

// ✅ مسار إرسال الطلب
app.post('/api/submit-order', async (req, res) => {
  try {
    const {
      username, password,
      customer_name, city, area, phone, product_type,
      price, quantity
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'مطلوب بيانات تسجيل الدخول' });
    }

    const token = await loginAndGetToken(username, password);

    const orderData = new URLSearchParams();
    orderData.append('customer_name', customer_name);
    orderData.append('city', city);
    orderData.append('area', area);
    orderData.append('phone', phone);
    orderData.append('product_type', product_type);
    orderData.append('price', price.toString());
    orderData.append('quantity', quantity.toString());

    const orderResponse = await axios.post(`${BASE_API}/create-order`, orderData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
    });

    const externalOrderNumber = orderResponse.data?.data?.order_number || null;

    const savedOrder = {
      customer: username,
      customer_name,
      phone,
      city,
      area,
      product_type,
      price,
      quantity,
      externalOrderNumber,
      status: 'تم إرسال الطلب بنجاح'
    };

    res.json({ success: true, order: savedOrder });
  } catch (error) {
    console.error('فشل إرسال الطلب:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'فشل إرسال الطلب' });
  }
});

// ✅ تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
