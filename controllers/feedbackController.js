const Feedback = require("../models/Feedback");

exports.submitFeedback = async (req, res) => {
  try {
     console.log("Incoming feedback data:", req.body); // 👈 Debug log
    const { name, email, type, message } = req.body;

    if (!name || !email || !type || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const feedback = new Feedback({ name, email, type, message });
    await feedback.save();
    res.status(201).json({ msg: "Feedback received" });
  } catch (err) {
    console.error("Feedback submission error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
