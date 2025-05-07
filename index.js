const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_API = 'https://api.alwaseet-iq.net/v1/merchant';

app.post('/api/login', async (req, res) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', req.body.username);
    formData.append('password', req.body.password);

    const response = await axios.post(`${BASE_API}/login`, formData);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

app.get('/api/cities', async (req, res) => {
  try {
    const response = await axios.get(`${BASE_API}/citys`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities', details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});