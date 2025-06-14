import config from "../config.js";
import axios from "axios";

export function sendFreeLogs({ server, user, creator }) {
  if (!server || !user || !creator) {
    console.error("❌ Missing required parameters for sendFreeLogs");
    return;
  }

  const createServerURL = config?.PTERODACTYL_PANEL?.webhookURL?.createServer;
  if (!createServerURL) {
    console.error("❌ Webhook URL not found in config");
    return;
  }

  const payload = {
    username: "Botnix Cloud",
    avatar_url: "https://cdn.akshtt.is-a.dev/9k0r",
    embeds: [
      {
        title: "🔧 New Free Server Created",
        color: 0x5865f2,
        fields: [
          {
            name: "User ID",
            value: `${user.username} (${user.id})`,
            inline: true,
          },
          {
            name: "Creator ID",
            value: `${creator.username} (${creator.id})`,
            inline: true,
          },
          {
            name: "Server ID",
            value: `[${server.id}](${config.PTERODACTYL_PANEL.panelURL}/server/${server.id})`,
            inline: true,
          },
          { name: "CPU", value: `${server.cpu}%`, inline: true },
          { name: "RAM", value: `${server.ram}`, inline: true },
          { name: "Disk", value: `${server.disk}`, inline: true },
          { name: "Type", value: `${server.type}`, inline: true },
        ],
        footer: {
          text: "Botnix Cloud | Deployments",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  axios
    .post(createServerURL, payload)
    .then(() => console.log("✅ Free server log sent successfully."))
    .catch((err) =>
      console.error(
        "❌ Error sending server creation embed:",
        err?.response?.data || err.message
      )
    );
}
