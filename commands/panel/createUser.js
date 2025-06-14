import { MessageFlags, SlashCommandBuilder } from "discord.js";
import crypto from "crypto";
import createPanelUser from "../../utils/createPanelUser.js";
import validator from "email-validator";

export default {
  data: new SlashCommandBuilder()
    .setName("create-user")
    .setDescription("Create a new user on the panel")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The username for the new user")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("email")
        .setDescription("The email for the new user")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("firstname")
        .setDescription("The first name for the new user")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("lastname")
        .setDescription("The last name for the new user")
        .setRequired(true)
    ),

  run: async ({ interaction, client }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (
        !client.config.PTERODACTYL_PANEL.panelURL ||
        !client.config.PTERODACTYL_PANEL.panelAPIKey
      ) {
        return interaction.editReply({
          content:
            "Panel is not set up for this server. Please set it up first.",
        });
      }

      const username = interaction.options.getString("username");
      const email = interaction.options.getString("email");

      if (!validator.validate(email)) {
        return interaction.editReply({
          content: "Invalid email format. Please provide a valid email.",
        });
      }

      const firstName = interaction.options.getString("firstname");
      const lastName = interaction.options.getString("lastname");
      const password = crypto.randomBytes(8).toString("base64");

      await createPanelUser({
        interaction,
        username,
        email,
        password,
        firstName,
        lastName,
        client,
      });

      // Try to send the password in DMs
      try {
        await interaction.user.send(
          `🛡️ Your panel user has been created:\n**Username:** ${username}\n**Email:** ${email}\n**Password:** \`${password}\`\nPlease store it securely.`
        );
      } catch (dmError) {
        return interaction.editReply({
          content:
            "User created, but I couldn't send you a DM. Please make sure your DMs are enabled.",
        });
      }

      await interaction.editReply({
        content:
          "✅ Panel user created successfully. Check your DMs for login credentials.",
      });
    } catch (error) {
      console.error("Error creating panel user:", error);
      return interaction.editReply({
        content: error.message || "An error occurred while creating the user.",
      });
    }
  },
};
