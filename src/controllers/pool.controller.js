const mongoose = require("mongoose");
const Pool = require("../models/pools.model");
const Message = require("../models/message.model");
const Chat = require("../models/chat.model");
const User = require("../models/auth.model");

async function createPool(req, res) {
  try {
    const {
      title,
      totalAmount,
      participantIds,
      includeCreator,
      chatId,
      isGroupChat,
    } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const creatorId = req.user._id;

    // CALCULATE THE SPLIT
    const divisor = includeCreator
      ? participantIds.length + 1
      : participantIds.length;

    if (divisor === 0) {
      return res.status(400).json({ error: "No participants to split with!" });
    }

    const rawSplit = totalAmount / divisor;
    const amountPerPerson = Math.round((rawSplit + Number.EPSILON) * 100) / 100;

    // PREPARE DATA
    const createdPools = [];
    const batchId = new mongoose.Types.ObjectId();

    // CREATE 1-ON-1 POOLS
    for (const borrowerId of participantIds) {
      const newPool = await Pool.create({
        creator: creatorId,
        borrower: borrowerId,
        title: title,
        amountOwed: amountPerPerson,
        batchId: batchId,
        status: "pending",
        creatorIncluded: includeCreator,
      });

      createdPools.push(newPool);

      // Inject Bubble
      try {
        const privateChat = await findOrCreatePrivateChat(
          creatorId,
          borrowerId
        );
        if (privateChat) {
          const msg = await Message.create({
            chat: privateChat._id,
            sender: creatorId,
            type: "pool",
            poolId: newPool._id,
            content: `Requesting: ${title}`,
          });

          //Update the Chat's latestMessage so the list updates!
          await Chat.findByIdAndUpdate(privateChat._id, {
            latestMessage: msg._id,
          });
        }
      } catch (err) {
        console.error(`Could not send pool message to user ${borrowerId}`, err);
      }
    }

    // NOTIFICATION
    if (isGroupChat && chatId) {
      const summaryText = `created a split expense "${title}" for $${totalAmount}.`;

      //Capture system message
      const sysMsg = await Message.create({
        chat: chatId,
        sender: creatorId,
        type: "system",
        content: summaryText,
      });

      //Update Group Chat's latestMessage
      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: sysMsg._id,
      });
    }

    res.status(201).json({
      success: true,
      message: `Created ${createdPools.length} expense requests.`,
      splitDetails: {
        total: totalAmount,
        perPerson: amountPerPerson,
        yourshare: includeCreator ? amountPerPerson : 0,
        batchId: batchId,
      },
      pools: createdPools,
    });
  } catch (error) {
    console.error("Create Pool Error:", error);
    res.status(500).json({ error: "Server Error creating pool" });
  }
}

async function updatePoolStatus(req, res) {
  try {
    const { poolId, action } = req.body;
    const userId = req.user._id.toString();

    const pool = await Pool.findById(poolId);
    if (!pool)
      return res.status(404).json({ error: "Pool transaction not found" });

    const isBorrower = pool.borrower.toString() === userId;
    const isCreator = pool.creator.toString() === userId;

    if (!isBorrower && !isCreator) {
      return res
        .status(403)
        .json({ error: "You are not part of this transaction" });
    }

    let newStatus = pool.status;

    // SCENARIO A: Mark Paid
    if (action === "mark_paid") {
      if (!isBorrower)
        return res
          .status(403)
          .json({ error: "Only the borrower can mark as paid" });
      if (pool.status !== "pending")
        return res.status(400).json({ error: "Transaction is not pending" });
      newStatus = "verification_pending";
      pool.paidAt = new Date();
    }

    // SCENARIO B: Confirm
    else if (action === "confirm") {
      if (!isCreator)
        return res
          .status(403)
          .json({ error: "Only the lender can confirm payment" });
      if (pool.status !== "verification_pending")
        return res
          .status(400)
          .json({ error: "Borrower hasn't marked this as paid yet" });
      newStatus = "settled";
      pool.settledAt = new Date();
    }

    // SCENARIO C: Reject
    else if (action === "reject") {
      if (!isCreator)
        return res
          .status(403)
          .json({ error: "Only the lender can reject payment" });
      newStatus = "pending";
      pool.paidAt = null;
    }

    // SCENARIO D: Cancel
    else if (action === "cancel") {
      if (!isCreator)
        return res.status(403).json({ error: "Only the lender can cancel" });
      if (pool.status !== "pending")
        return res
          .status(400)
          .json({ error: "Can only cancel pending requests" });
      newStatus = "cancelled";
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    pool.status = newStatus;
    await pool.save();

    res.status(200).json({ success: true, pool });
  } catch (error) {
    console.error("Update Pool Error:", error);
    res.status(500).json({ error: "Server Error updating pool" });
  }
}

async function getDashboardData(req, res) {
  try {
    const userId = req.user._id;

    // 1. Calculate "Total Owed" (Money people owe ME)
    const owedResult = await Pool.aggregate([
      {
        $match: {
          creator: userId,
          status: { $in: ["pending", "verification_pending"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountOwed" },
        },
      },
    ]);

    // 2. Calculate "Total Due" (Money I owe OTHERS)
    const dueResult = await Pool.aggregate([
      {
        $match: {
          borrower: userId,
          status: { $in: ["pending", "verification_pending"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountOwed" },
        },
      },
    ]);

    // 3. Fetch Recent Activity (Last 10 transactions involving me)
    const recentActivity = await Pool.find({
      $or: [{ creator: userId }, { borrower: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("creator", "name avatar")
      .populate("borrower", "name avatar");

    const totalOwed = owedResult[0]?.total || 0;
    const totalDue = dueResult[0]?.total || 0;

    res.status(200).json({
      totalOwed: parseFloat(totalOwed.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard Data Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
}

async function getFriendBalance(req, res) {
  try {
    const myId = req.user._id;
    const friendId = req.params.friendId;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    const friendObjectId = new mongoose.Types.ObjectId(friendId);

    // 1. Calculate what THEY owe ME (I am Creator, They are Borrower)
    const lentResult = await Pool.aggregate([
      {
        $match: {
          creator: myId,
          borrower: friendObjectId,
          status: { $in: ["pending", "verification_pending"] },
        },
      },
      {
        $group: { _id: null, total: { $sum: "$amountOwed" } },
      },
    ]);

    // 2. Calculate what I owe THEM (They are Creator, I am Borrower)
    const borrowedResult = await Pool.aggregate([
      {
        $match: {
          creator: friendObjectId,
          borrower: myId,
          status: { $in: ["pending", "verification_pending"] },
        },
      },
      {
        $group: { _id: null, total: { $sum: "$amountOwed" } },
      },
    ]);

    const lent = lentResult[0]?.total || 0;
    const borrowed = borrowedResult[0]?.total || 0;
    const netBalance = lent - borrowed; // Positive = They owe me; Negative = I owe them

    res.json({ lent, borrowed, netBalance });
  } catch (error) {
    console.error("Friend Balance Error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
}

async function findOrCreatePrivateChat(userId1, userId2) {
  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: userId1 } } },
      { users: { $elemMatch: { $eq: userId2 } } },
    ],
  });

  if (userId1.toString() === userId2.toString()) {
    isChat = isChat.filter(
      (chat) => !chat.users.some((u) => u.toString() !== userId1.toString())
    );
  }

  if (isChat.length > 0) return isChat[0];

  const chatData = {
    chatName: "sender",
    isGroupChat: false,
    users: [userId1, userId2],
  };

  return await Chat.create(chatData);
}

module.exports = {
  createPool,
  updatePoolStatus,
  findOrCreatePrivateChat,
  getDashboardData,
  getFriendBalance,
};
