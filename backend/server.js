const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Simple database file so Paid no go disappear after restart
const DB_FILE = './users.json';
let users = [];
if (fs.existsSync(DB_FILE)) {
  users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveUsers() {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// REGISTER
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User exists" });
  }
  users.push({ email, password, paid: false });
  saveUsers();
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

// INITIALIZE PAYSTACK
app.post('/api/paystack/initialize', async (req, res) => {
  const { email, amount } = req.body;
  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize',
      { email, amount: amount || 500000 }, // 5000 Naira = 500000 kobo
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    console.log('Payment init for:', email);
    res.json(response.data.data); // contains authorization_url
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// VERIFY PAYSTACK - THIS IS WHERE INCOME IS CONFIRMED
app.post('/api/paystack/verify', async (req, res) => {
  const { reference, email } = req.body;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    
    if (response.data.data.status === 'success') {
      let user = users.find(u => u.email === email);
      if (user) {
        user.paid = true;
        saveUsers();
        console.log('PAID SUCCESS:', email);
      }
      return res.json({ status: 'success', paid: true });
    } else {
      return res.json({ status: 'failed', paid: false });
    }
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Destyp-VPN backend running at http://localhost:${PORT}`);
  console.log('Users:', users);
});