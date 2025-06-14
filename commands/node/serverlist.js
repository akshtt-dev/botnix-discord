import { MessageFlags, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import User from "../../models/User.js";

export default {
  data: new SlashCommandBuilder()
    .setName("server-list")
    .setDescription("List all your servers from the panel")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to list servers for")
        .setRequired(false)
    ),

  run: async ({ interaction, client }) => {
    const PANEL_URL = client.config.PTERODACTYL_PANEL.panelURL;
    const PANEL_API_KEY = client.config.PTERODACTYL_PANEL.panelAPIKey;
    const targetUser = interaction.options.getUser("user") || interaction.user;

    if (!PANEL_URL || !PANEL_API_KEY) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("Panel URL or API Key is not configured.");
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const user = await User.findOne({ userId: targetUser.id });
      if (!user || !user.panelUserId) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("User not registered with the panel.");
        return interaction.editReply({ embeds: [embed] });
      }

      const { data } = await client.panelAPI.get("/servers");
      const allServers = data.data;
      const userServers = allServers.filter(
        (s) => s.attributes.user == user.panelUserId
      );

      if (!userServers.length) {
        const embed = new EmbedBuilder()
          .setColor("Yellow")
          .setDescription("You don’t own any servers on the panel.");
        return interaction.editReply({ embeds: [embed] });
      }

      const fields = userServers.map((s, i) => {
        const { name, identifier, limits } = s.attributes;
        const ram = (limits.memory / 1024).toFixed(1); // Convert MB to GB
        const cpu = limits.cpu; // CPU in %
        const disk = (limits.disk / 1024).toFixed(1); // Convert MB to GB

        return {
          name: `**${i + 1}. ${name}**`,
          value: `**ID:** \`${identifier}\`\n-# **RAM:** \`${ram} GB\` | **CPU:** \`${cpu}%\` | **SSD:** \`${disk} GB\``,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setColor("Random")
        .setTitle("Servers List")
        .addFields(fields)
        .setFooter({ text: `Total: ${userServers.length} servers` })
        .setTimestamp()
        .setThumbnail(targetUser.displayAvatarURL());

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(
        "Error fetching server list:",
        error?.response?.data || error.message
      );
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("An error occurred while fetching your server list.");
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
