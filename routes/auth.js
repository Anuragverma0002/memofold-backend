//routes --> auth.js
const express = require("express");
const router = express.Router();
const { register, login , requestPasswordReset,  resetPassword,} = require("../controllers/authController");

// Support both /register and /signup for compatibility
router.post("/register", register);
router.post("/signup", register); // ✅ Added for frontend compatibility
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);



// Check if reset token is valid (Optional helper route)
router.get("/check-token/:token", async (req, res) => {
  const User = require("../models/user");

  try {
    const token = req.params.token;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() } // check token is still valid
    });

    res.json(user ? { valid: true, username: user.username } : { valid: false });
  } catch (err) {
    console.error("❌ Token check error:", err);
    res.status(500).json({ error: "Server error during token validation." });
  }
});
module.exports = router;