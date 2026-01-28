const express = require("express");
const router = express.Router();

const {
  createPool,
  updatePoolStatus,
  getDashboardData,
  getFriendBalance, 
} = require("../controllers/pool.controller");
const authMiddleware = require("../middlewares/auth.middleware");


router.post("/create-pool", authMiddleware, createPool);

router.patch("/update-status", authMiddleware, updatePoolStatus);

router.get("/dashboard", authMiddleware, getDashboardData);

router.get("/balance/:friendId", authMiddleware, getFriendBalance);

module.exports = router;