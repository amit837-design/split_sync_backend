require("dotenv").config();
const connectDB = require("./src/db/db");
const app = require("./src/app");

const PORT = process.env.PORT || 3000;

// SAFETY NET: Catch generic crashes
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION!:", err.message);
  // We do not exit the process here to keep the server alive if possible
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION!:", err.message);
});

// 1. Start the Server IMMEDIATELY (So Render sees it is alive)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Attempting to connect to MongoDB...");

  // 2. Connect to Database in the background
  // We use a try-catch block here to handle cases where connectDB does not return a promise
  try {
    const dbResult = connectDB();
    
    // Check if it returned a promise (async function) before using .then
    if (dbResult && typeof dbResult.then === 'function') {
      dbResult
        .then(() => {
          console.log("MongoDB Connected Successfully");
        })
        .catch((err) => {
          console.error("MongoDB Connection Failed (Async):", err.message);
        });
    } else {
      // If it is not a promise, assume it started successfully
      console.log("MongoDB Connection initiated (Sync or Fire-and-Forget)");
    }
  } catch (err) {
    console.error("MongoDB Connection Failed (Sync):", err.message);
  }
});