import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import qrcode from "qrcode";

export default {
  data: new SlashCommandBuilder()
    .setName("bill")
    .setDescription("Create a bill for a transaction")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to create a bill for")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the bill")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of the bill")
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration of the bill (e.g., monthly, yearly)")
        .addChoices(
          { name: "Monthly", value: "monthly" },
          { name: "Yearly", value: "yearly" },
          { name: "One-time", value: "one-time" }
        )
        .setRequired(true)
    ),

  run: async ({ interaction, client }) => {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user");
    const description = interaction.options.getString("description");
    const amount = interaction.options.getNumber("amount");
    const duration = interaction.options.getString("duration") || "N/A";
    const upi = client.config.PTERODACTYL_PANEL.UPI_ID;
    const name = client.config.PTERODACTYL_PANEL.UPI_NAME;

    if (!upi || !name) {
      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Configuration Error")
        .setDescription("UPI ID or name is not configured in the bot.")
        .setFooter({ text: "Please contact the bot administrator." });

      return interaction.editReply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const note = `${targetUser.id} | ${description}`.slice(0, 80); // Limit to 80 chars
    const encodedNote = encodeURIComponent(note);
    const encodedName = encodeURIComponent(name);
    const upi_link = `upi://pay?pa=${upi}&pn=${encodedName}&am=${amount.toFixed(
      2
    )}&cu=INR&tn=${encodedNote}`;

    // Generate QR Code as buffer
    const qrBuffer = await qrcode.toBuffer(upi_link);

    const qrAttachment = new AttachmentBuilder(qrBuffer, {
      name: "upi_qr.png",
    });

    const embed = new EmbedBuilder()
      .setColor("#00b0f4")
      .setTitle("📄 Transaction Bill")
      .addFields(
        { name: "User", value: `<@${targetUser.id}>`, inline: true },
        { name: "Amount", value: `₹${amount}`, inline: true },
        { name: "Duration", value: duration, inline: true },
        { name: "Description", value: description },
        { name: "UPI Link", value: `\`${upi_link}\`` }
      )
      .setImage("attachment://upi_qr.png")
      .setFooter({ text: "Scan the QR or copy the link to pay via UPI" });

    return interaction.editReply({
      embeds: [embed],
      files: [qrAttachment],
    });
  },
};
