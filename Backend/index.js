const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDb = require('./config/dbConnect');
const authRoute = require('./routes/authRoute');

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// ✅ Middlewares (correct order is important)
app.use(cors());
app.use(express.json()); // ✅ Needed to parse JSON body
app.use(express.urlencoded({ extended: true })); // ✅ Needed to parse urlencoded form data
app.use(cookieParser());

// ✅ Connect to MongoDB
connectDb();

// ✅ Routes
app.use('/api/auth', authRoute);

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
