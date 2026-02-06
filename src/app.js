const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(
  cors({
    origin: [
      "https://split-sync-dput.vercel.app",
    ],
    credentials: true,
  })
);


app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const authRoutes = require("./routes/auth.route");
const chatRoutes = require("./routes/chat.route");
const messageRoute = require("./routes/message.routes");
const poolRoutes = require("./routes/pool.route");

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/api/messages", messageRoute);
app.use("/api/pools", poolRoutes);

// --- PING ROUTE ---
app.get("/ping", (req, res) => {
  console.log("🔔 PING RECEIVED: Keeping backend awake...");
  res.status(200).send("Pong");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("ERROR LOG:", err.message);
  console.error(err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

module.exports = app;
