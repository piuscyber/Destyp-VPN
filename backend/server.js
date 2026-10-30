require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Simple storage for now (later we go use database)
let users = [];

app.get('/api/servers', (req, res) => {
  res.json([{name:'Lagos', id:1},{name:'London', id:2}]);
});

// REGISTER
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists, please login" });
  }
  users.push({ email, password, paid: false });
  console.log('New user:', email);
  res.json({ message: "Registered successfully!" });
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).json({ error: "Invalid email or password" });
  res.json({ message: "Login success", paid: user.paid, email: user.email });
});

// PAYSTACK INITIALIZE - now it marks user as paid
app.post('/api/paystack/initialize', async (req, res) => {
  const { email, amount } = req.body;
  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', 
      { email, amount: amount || 500000 },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    // Mark as paid after initialization (for test, in real life we go verify)
    let user = users.find(u => u.email === email);
    if(user) user.paid = true;
    console.log('Payment init for:', email);
    res.json(response.data.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Destyp-VPN backend running at http://localhost:${PORT}`);
  console.log(`Users:`, users);
});