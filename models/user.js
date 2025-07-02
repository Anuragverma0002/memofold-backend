// models --> user.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
     realname: { // ✅ Add this field
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
       email: { type: String, required: true, unique: true  }, // ✅ Add Gmail field
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
     profilePic: {
    type: String,
    default: "",
    }
  },
  { timestamps: true }
);

// ✅ Auto-hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

const bcrypt = require("bcrypt");

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);
