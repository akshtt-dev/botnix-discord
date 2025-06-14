import config from "./config.js";
import { Client, GatewayIntentBits } from "discord.js";
import { CommandKit } from "commandkit";
import { fileURLToPath } from "url";
import path from "path";
import axios from "axios";
import mongoose from "mongoose";

// Initialize MongoDB Connection
mongoose
  .connect(config.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

const api = axios.create({
  baseURL: `${config.PTERODACTYL_PANEL.panelURL}/api/application`,
  headers: {
    Authorization: `Bearer ${config.PTERODACTYL_PANEL.panelAPIKey}`,
    "User-Agent": config.PTERODACTYL_PANEL.panelUserAgent || "BOTNIX",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.panelAPI = api;
client.config = config;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

new CommandKit({
  client,
  commandsPath: path.join(__dirname, "/commands"),
  eventsPath: path.join(__dirname, "/events"),
  skipBuiltInValidations: true,
  bulkRegister: true,
});

client.login(config.TOKEN).catch((err) => {
  console.error("Failed to login:", err);
  process.exit(1);
});
