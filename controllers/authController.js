// authController.js
const User = require("../models/user");
const TempResetToken = require("../models/TempResetToken");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// REGISTER
// REGISTER
exports.register = async (req, res) => {
  try {
    console.log("📥 Incoming data:", req.body);

    const { realname ,username, email, password } = req.body;

    if (!realname || !username || !email || !password) {
      console.log("❌ Missing field(s)");
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!email.endsWith("@gmail.com")) {
      console.log("❌ Invalid email format");
      return res.status(400).json({ message: "Only Gmail ID is allowed." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("❌ Username already exists");
      return res.status(400).json({ message: "Username already exists." });
    }



    const newUser = new User({
      realname,
      username: username.trim(),
      email: email.toLowerCase(),
      password, // ✅ pass plain password, the pre('save') hook will hash it
    });
    await newUser.save();

    console.log("✅ User registered:", newUser.username);

    return res.status(201).json({
      message: "Registered successfully.",
      userId: newUser._id,
      username: newUser.username,
       realname: newUser.realname,
    });
  } catch (err) {
    console.error("❌ FULL Register Error:", err);  // Full stack
    return res.status(500).json({ message: "Server error during registration." });
  }
};


// LOGIN
// LOGIN
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const input = username.trim();
    console.log("Login input:", input);

    const user = await User.findOne({
      $or: [{ username: input }, { email: input.toLowerCase() }],
    });

    console.log("User found:", user);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    console.log("Entered password:", password);
    console.log("Stored hashed password:", user.password);

    // 🔑 THIS LINE WAS MISSING
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined in .env");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      userId: user._id,
      username: user.username,
      realname: user.realname,
    });

  } catch (err) {
    console.error("❌ Login error:", err.message);
    return res.status(500).json({ message: "Server error during login." });
  }
};




// RESET PASSWORD
// RESET PASSWORD
// RESET PASSWORD
// REQUEST PASSWORD RESET

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required." });
    }

    const input = email.trim().toLowerCase(); // normalize
    const token = crypto.randomBytes(32).toString("hex");

    // Try to find existing user
    let user = await User.findOne({
      $or: [{ email: input }, { username: input }]
    });

    if (user) {
      user.resetToken = token;
      user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
      await user.save();
      console.log(`🔐 Token saved for existing user: ${user.username}`);
    } else {
      // Remove any existing temp tokens for same email (optional but clean)
      await TempResetToken.deleteMany({ email: input });

      // Create new temp token
      const tempToken = new TempResetToken({
        email: input,
        token,
        expiresAt: Date.now() + 3600000 // 1 hour
      });

      await tempToken.save();
      console.log(`🆕 Temp token saved for unknown user: ${input}`);
    }

    const resetLink = `${process.env.FRONTEND_URL}/resetPass.html?token=${token}`;
    console.log("📤 Reset link generated:", resetLink);

    await sendEmail(
      input,
      "MemoFold Password Setup",
      `Click the link below to reset or set your MemoFold password:\n\n${resetLink}\n\nThis link will expire in 1 hour.`
    );

    return res.status(200).json({ message: "✅ Reset link sent." });
  } catch (err) {
    console.error("❌ requestPasswordReset error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};


// RESET PASSWORD

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  console.log("🔐 Reset Password Attempt - Token:", token);
  console.log("🔑 New Password:", password);

  try {
    // STEP 1: Check if token exists in the User model
    let user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (user) {
      console.log("✅ Found user with valid resetToken:", user.email);

      user.password = password;
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      // 🔄 Confirm user saved properly
      const confirmedUser = await User.findOne({ email: user.email });
      console.log("🔁 Confirmed user after reset (User model):", confirmedUser);

      return res.json({
        message: "✅ Password reset successfully.",
        user: confirmedUser
      });
    }

    // STEP 2: If not in User model, check TempResetToken
    const temp = await TempResetToken.findOne({
      token,
      expiresAt: { $gt: Date.now() }
    });

    if (!temp) {
      console.log("❌ Invalid or expired token in both User and TempResetToken.");
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    console.log("✅ Temp token found for:", temp.email);

    // STEP 3: Try to find an existing user by email or username
    user = await User.findOne({
      $or: [{ email: temp.email }, { username: temp.email }]
    });

    if (user) {
      console.log("✅ Existing user found for temp token:", user.email);

      user.password = await bcrypt.hash(password, 10);
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      // 🔄 Confirm user saved properly
      const confirmedUser = await User.findOne({ email: user.email });
      console.log("🔁 Confirmed user after reset (existing user):", confirmedUser);

      await TempResetToken.deleteOne({ _id: temp._id });

      return res.json({
        message: "✅ Password reset for existing user.",
        user: confirmedUser
      });
    }

    // STEP 4: No user exists → auto-create one
    console.log("🆕 No user found. Creating new account for:", temp.email);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: temp.email,
      email: temp.email,
      password: hashedPassword
    });

    await newUser.save();

    // 🔄 Confirm new user saved properly
    const confirmedUser = await User.findOne({ email: temp.email });
    console.log("✅ New user confirmed from DB:", confirmedUser);

    await TempResetToken.deleteOne({ _id: temp._id });

    return res.json({
      message: "✅ New account created and password set.",
      user: confirmedUser
    });

  } catch (err) {
    console.error("❌ Error in resetPassword:", err);
    return res.status(500).json({ error: "Failed to reset or create account." });
  }
};


