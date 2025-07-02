require("dotenv").config();
const nodemailer = require("nodemailer");

(async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"MemoFold Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself
      subject: "MemoFold Test Email",
      text: "If you're reading this, your Gmail App Password works!",
    });

    console.log("✅ Email sent successfully:", info.response);
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
  }
})();
