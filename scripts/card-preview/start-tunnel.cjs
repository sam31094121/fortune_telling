const localtunnel = require("localtunnel");
(async () => {
  const tunnel = await localtunnel({ port: 8888 });
  console.log("TUNNEL_URL=" + tunnel.url);
  tunnel.on("close", () => process.exit(0));
  // keep alive
  setInterval(() => {}, 1 << 30);
})().catch((e) => {
  console.error("TUNNEL_FAIL", e);
  process.exit(1);
});
