const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Environment variable (BASE API URL)
const BASE_API = process.env.BASE_API || 'https://api.alwaseet-iq.net/v1/merchant';

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  try {
    const response = await axios.post(`${BASE_API}/login`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Login proxy error:', error.message);
    res.status(500).json({
      status: false,
      msg: 'خطأ في الاتصال بخادم تسجيل الدخول.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
