const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler");

const authMiddleware = (req, res, next) => {
  // Safe cookies extraction (avoids undefined error)
  const cookies = req.cookies || {};

  let token = cookies.auth_token;

  // Also support Bearer token from headers
  if (!token && req.headers.authorization) {
    if (req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
  }

  // No token found
  if (!token) {
    return response(res, 401, "Authorization token missing.");
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log("🔐 Authenticated User:", decoded);

    next(); // continue to next middleware
  } catch (error) {
    console.error("AUTH ERROR:", error);
    return response(res, 401, "Invalid or expired token");
  }
};

module.exports = authMiddleware;
