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

// ✅ تسجيل الدخول
async function loginAndGetToken(username, password) {
  if (tokenCache[username]) {
    console.log(`[Cache] Using cached token for user: ${username}`);
    return tokenCache[username];
  }

  try {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);

    console.log(`[Login] Sending login request for user: ${username}`);

    const response = await axios.post(`${BASE_API}/login`, form, {
      headers: form.getHeaders(),
    });

    console.log('[Login Response from الوسيط]', response.data);

    if (response.data.status === true && response.data.data && response.data.data.token) {
      const token = response.data.data.token;
      tokenCache[username] = token;
      return token;
    }

    throw new Error(response.data.msg || 'فشل تسجيل الدخول');
  } catch (err) {
    console.error('[Login Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.msg || err.message || 'فشل تسجيل الدخول');
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

// ✅ تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
