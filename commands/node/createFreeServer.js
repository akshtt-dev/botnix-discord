import axios from "axios";
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import User from "../../models/User.js";
import { sendFreeLogs } from "../../utils/sendLogs.js";

export default {
  data: new SlashCommandBuilder()
    .setName("create-free-server")
    .setDescription("Create a new server on the free node")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of server: paper, forge, nodejs")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("cpu")
        .setDescription("CPU limit (in %). Use 0 for unlimited.")
        .setMaxValue(400)
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("memory")
        .setDescription("Memory in MB. Use 0 for unlimited.")
        .setMaxValue(16384)
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("disk")
        .setDescription("Disk space in MB. Use 0 for unlimited.")
        .setMaxValue(51200)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The server name")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The Discord user to assign the server to")
        .setRequired(false)
    ),

  run: async ({ interaction, client }) => {
    if (!interaction.guild) return;

    const PANEL_ADMINS = client.config.PTERODACTYL_PANEL.panelAdmins;
    if (!PANEL_ADMINS.includes(interaction.user.id)) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("❌ You do not have permission to create servers.")
        .setTimestamp();
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const type = interaction.options.getString("type");
    const cpu = interaction.options.getNumber("cpu");
    const memory = interaction.options.getNumber("memory");
    const disk = interaction.options.getNumber("disk");
    const name = interaction.options.getString("name") || "New Server";
    const targetUser = interaction.options.getUser("user") || interaction.user;

    const {
      panelAPIKey: PTERO_API_KEY,
      panelURL: PTERO_URL,
      panelUserAgent = "DiscordBot",
      freeNodeId = "2",
      eggMap,
    } = client.config.PTERODACTYL_PANEL;

    await interaction.deferReply();

    if (!PTERO_API_KEY || !PTERO_URL) {
      return interaction.editReply("❌ Panel is not set up correctly.");
    }

    const eggInfo = eggMap[type.toLowerCase()];
    if (!eggInfo) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(
          "❌ Invalid server type provided. Available types:\n\n" +
            Object.keys(eggMap).join("\n")
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    try {
      // 🔍 Lookup user
      const panelUser = await User.findOne({ userId: targetUser.id });
      if (!panelUser || !panelUser.panelUserId) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(
            `❌ ${targetUser.tag} doesn't have a Pterodactyl account. Ask them to run \`/create-user\` first.`
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      // 🧪 Fetch egg
      const eggDetails = await axios.get(
        `${PTERO_URL}/api/application/nests/${eggInfo.nestId}/eggs/${eggInfo.eggId}?include=variables`,
        {
          headers: {
            Authorization: `Bearer ${PTERO_API_KEY}`,
            Accept: "application/json",
            "User-Agent": panelUserAgent,
          },
        }
      );

      const egg = eggDetails.data.attributes;
      const dockerImage = egg.docker_image;
      const startup = egg.startup;

      const environment = {};
      for (const variable of egg.relationships.variables.data) {
        environment[variable.attributes.env_variable] =
          variable.attributes.default_value || "";
      }

      // 🌐 Fetch allocations for specific node
      const allocRes = await axios.get(
        `${PTERO_URL}/api/application/nodes/${freeNodeId}/allocations`,
        {
          headers: {
            Authorization: `Bearer ${PTERO_API_KEY}`,
            Accept: "application/json",
            "User-Agent": panelUserAgent,
          },
        }
      );

      const availableAlloc = allocRes.data.data.find(
        (a) => a.attributes.assigned === false
      );

      if (!availableAlloc) {
        return interaction.editReply("❌ No available allocations on Node 2.");
      }

      // ✅ Create the server
      const response = await axios.post(
        `${PTERO_URL}/api/application/servers`,
        {
          name,
          user: panelUser.panelUserId,
          egg: eggInfo.eggId,
          docker_image: dockerImage,
          startup,
          environment,
          limits: {
            memory,
            swap: 0,
            disk,
            io: 500,
            cpu,
          },
          feature_limits: {
            databases: 1,
            allocations: 1,
            backups: 1,
          },
          allocation: availableAlloc.attributes.id,
          start_on_completion: false,
        },
        {
          headers: {
            Authorization: `Bearer ${PTERO_API_KEY}`,
            Accept: "application/json",
            "User-Agent": panelUserAgent,
          },
        }
      );

      const server = response.data;
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ Server Created Successfully")
        .setDescription(
          `Server **${server.attributes.name}** has been created!`
        )
        .addFields(
          { name: "Server ID", value: server.attributes.identifier },
          { name: "CPU Limit", value: `${cpu}%` },
          { name: "Memory", value: `${memory} MB` },
          { name: "Disk", value: `${disk} MB` },
          { name: "Type", value: type }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      try {
        sendFreeLogs({
          server: {
            id: server.attributes.identifier,
            cpu,
            ram: memory,
            disk,
            type,
          },
          user: targetUser,
          creator: interaction.user,
        });
      } catch (logError) {
        console.error("❌ Error sending logs:", logError);
      }
    } catch (error) {
      console.error(
        "Pterodactyl API error:",
        error.response?.data || error.message
      );
      await interaction.editReply(
        "❌ Failed to create server. Contact panel administrator."
      );
    }
  },
};
