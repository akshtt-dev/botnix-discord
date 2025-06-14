import "dotenv/config";

export default {
  TOKEN:
    process.env.TOKEN ||
    "",
  MONGO_URI:
    process.env.MONGODB_URI ||
    "",
  PTERODACTYL_PANEL: {
    UPI_ID: "",
    UPI_NAME: "",
    panelAdmins: [""],
    panelURL: process.env.PTERODACTYL_PANEL_URL || "https://panel.botnix.cloud",
    panelAPIKey:
      process.env.PTERODACTYL_PANEL_API_KEY ||
      "",
    panelUserAgent: process.env.PTERODACTYL_PANEL_USER_AGENT || "BOTNIX",
    eggMap: {
      nodejs: { eggId: 15, nestId: 6 },
      python: { eggId: 16, nestId: 6 },
      aio: { eggId: 17, nestId: 6 },
      lavalink: { eggId: 21, nestId: 5 },
      paper: { eggId: 1, nestId: 1 },
      forge: { eggId: 4, nestId: 1 },
      vanilla: { eggId: 5, nestId: 1 },
      nginx: { eggId: 20, nestId: 5 },
    },
    freeNodeId: "1",
    webhookURL: {
      createServer:
        "https://discord.com/api/webhooks/",
    },
  },
};
