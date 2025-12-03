const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const connectDb = require("./config/dbConnect");
const authRoute = require("./routes/authRoute");
const bodyParser = require("body-parser");
const chatRoute = require("./routes/chatRoute");

const PORT = process.env.PORT || 5000;
const app = express();

// ✅ Middlewares (correct order is important)
app.use(cors());
app.use(express.json()); // ✅ Needed to parse JSON body
app.use(express.urlencoded({ extended: true })); // ✅ Needed to parse urlencoded form data
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
connectDb();

// ✅ Routes
app.use("/api/auth", authRoute);
app.use("/api/chat", chatRoute);

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
