const mongoose = require("mongoose");

const poolSchema = new mongoose.Schema(
  {
    // The "Lender"
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The "Borrower"
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Link group expenses
    batchId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
    },

    title: { 
      type: String, 
      required: true 
    }, 

    amountOwed: { 
      type: Number, 
      required: true 
    },

    // Stores if the creator paid for themselves too
    creatorIncluded: { 
      type: Boolean, 
      required: true, 
      default: true 
    },

    status: {
      type: String,
      enum: ["pending", "verification_pending", "settled", "cancelled"],
      default: "pending",
    },

    paidAt: { type: Date },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pool", poolSchema);