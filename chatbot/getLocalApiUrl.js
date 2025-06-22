const os = require("os");
const fs = require("fs");

const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        candidates.push({ name, address: iface.address });
      }
    }
  }

  if (candidates.length === 0) return "127.0.0.1"; // fallback

  // Wi-Fi:
  const preferred = candidates.find((c) => /wi-?fi|wlan/i.test(c.name));
  if (preferred) return preferred.address;

  // Ethernet:
  // const preferred = candidates.find(c => /eth|en/i.test(c.name));

  return candidates[0].address;
};

const localIP = getLocalIPAddress();
const apiUrl = `http://${localIP}:8080/api/v1`;

const output = `// This file is auto-generated. Do not edit it manually if it's not necessary.
// Generated on ${new Date().toISOString()}
export const API_URL = "${apiUrl}";
`;

fs.writeFileSync("./src/utils/constants/API_URL.ts", output, "utf-8");
