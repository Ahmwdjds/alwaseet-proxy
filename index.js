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

// ✅ دالة تسجيل الدخول باستخدام multipart/form-data
async function loginAndGetToken(username, password) {
  if (tokenCache[username]) {
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
      tokenCache[username] = response.data.data.token;
      return response.data.data.token;
    } else {
      throw new Error(response.data.msg || 'فشل تسجيل الدخول');
    }
  } catch (err) {
    console.error('[Login Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.msg || 'فشل تسجيل الدخول');
  }
}

// ✅ endpoint لتسجيل الدخول
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
