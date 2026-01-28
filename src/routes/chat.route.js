const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middlewares/auth.middleware");
const searchMiddleware = require("../middlewares/search.middleware");

const searchUsers = require("../controllers/chat_controller/search.controller");
const accessChat = require("../controllers/chat_controller/accessChat.controller");
const fetchChats = require("../controllers/chat_controller/fetchChats.controller");
const createGroupChat = require("../controllers/chat_controller/createGroupChat.controller");
const removeFromGroup = require("../controllers/chat_controller/removeFromGroup.controller");
const updateGroup = require("../controllers/chat_controller/updateGroup.controller");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Search users for creating chats
router.get("/users/search", authMiddleware, searchMiddleware, searchUsers);

// Access (Create/Fetch) 1-on-1 Chat
router.post("/access", authMiddleware, accessChat);

// Fetch all chats for the user
router.get("/fetch", authMiddleware, fetchChats);

// Create Group Chat
router.post(
  "/group",
  authMiddleware,
  upload.single("groupPic"),
  createGroupChat
);

// Exit/Remove from Group
router.put("/groupremove", authMiddleware, removeFromGroup);

// Update Group (Name or Pic)
router.put(
  "/groupupdate",
  authMiddleware,
  upload.single("groupPic"),
  updateGroup
);

module.exports = router;
