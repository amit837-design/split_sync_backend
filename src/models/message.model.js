const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },

    type: { 
      type: String, 
      enum: ["text", "image", "pool", "system"], 
      default: "text" 
    },
    poolId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Pool" 
    }, 
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;