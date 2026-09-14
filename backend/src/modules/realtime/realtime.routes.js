const express = require("express");
const { requireAuth } = require("../../shared/middleware/auth");
const sse = require("./sse.service");

const router = express.Router();

const PING_INTERVAL_MS = 30000;

router.get("/", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`data: Conexao estabelecida\n\n`);

  const intervalId = setInterval(() => {
    res.write(`data: Ping\n\n`);
  }, PING_INTERVAL_MS);

  const client = sse.addClient({ res, user: req.user });

  req.on("close", () => {
    clearInterval(intervalId);
    sse.removeClient(client);
  });
});

module.exports = router;
