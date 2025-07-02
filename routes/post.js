// routes/post.js

const express = require("express");
const router = express.Router();
const { createPost, getPosts,getMyPosts  } = require("../controllers/postController");
const Post = require("../models/Post");
const { authenticate } = require("../middleware/authMiddleware");

// Protect both routes
// router.post("/", authenticate, createPost);
// router.get("/", authenticate, getPosts);

// ✅ Create a new post
router.post("/", authenticate, async (req, res) => {
    console.log("📩 Incoming Post:", req.body); // ← Add this line to log the request body
  const { content, image, date, time} = req.body;
   if (!content || !date || !time) {
    return res.status(400).json({ error: "Missing content, date, or time." });
  }
  try {
    const newPost = new Post({
      userId: req.user.id,
      username: req.user.username,
      content,
      image,
       date,
      time
    });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Failed to create post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});



// ✅ Get all posts (main feed)
router.get("/", authenticate, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ✅ Get posts for a specific user (by username)
router.get("/user/:username", authenticate, async (req, res) => {
  try {
    const userPosts = await Post.find({ username: req.params.username }).sort({ createdAt: -1 });
    res.json(userPosts);
  } catch (err) {
    console.error("Failed to fetch user's posts:", err);
    res.status(500).json({ error: "Failed to fetch user's posts" });
  }
});

module.exports = router;



