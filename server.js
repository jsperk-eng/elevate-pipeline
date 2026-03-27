const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = 8888;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || "";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  // Slack proxy endpoint
  if (req.method === "POST" && req.url === "/api/slack") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const url = new URL(SLACK_WEBHOOK);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" }
      };
      const slackReq = https.request(options, slackRes => {
        let data = "";
        slackRes.on("data", chunk => { data += chunk; });
        slackRes.on("end", () => {
          res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
          res.end(data);
        });
      });
      slackReq.on("error", err => {
        res.writeHead(500);
        res.end("Slack error: " + err.message);
      });
      slackReq.write(body);
      slackReq.end();
    });
    return;
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  // Static file server
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Elevate Pipeline running at http://localhost:${PORT}`);
});
