import { ActivityType } from "discord.js";

export default (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity(`${client.config.PTERODACTLY_PANEL.panelURL}`, {
    type: ActivityType.Watching,
  });
};
