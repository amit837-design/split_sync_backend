const express = require("express");
const {
  fetchMessages,
  sendMessage,
} = require("../controllers/message.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/:chatId", authMiddleware, fetchMessages);
router.post("/", authMiddleware, sendMessage);

module.exports = router;
