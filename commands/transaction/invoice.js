import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { v4 as uuidv4 } from "uuid";
import createInvoice from "../../utils/generateInvoice.js";
import Invoice from "../../models/Invoice.js";

export default {
  data: new SlashCommandBuilder()
    .setName("create-invoice")
    .setDescription("Generate an invoice for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to generate the invoice for")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("products")
        .setDescription("Enter products like: ProductA:100, ProductB:250")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("currency")
        .setDescription("The currency symbol (e.g., $, ₹, €)")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("paid")
        .setDescription("Mark the invoice as paid")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Customer name")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("email")
        .setDescription("The email of the user")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription(
          "The duration of the invoice (e.g., 1d, 1w, 1m, 1 year)"
        )
        .setRequired(false)
    ),

  run: async ({ interaction, client }) => {
    const config = client.config;
    if (!config.PTERODACTYL_PANEL.panelAdmins.includes(interaction.user.id))
      return;
    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const user = interaction.options.getUser("user");
    const customerName =
      interaction.options.getString("username") || user.username;
    const customerEmail = interaction.options.getString("email") || "N/A";
    const orgName = config.PTERODACTYL_PANEL.orgName || interaction.guild.name;
    const orgEmail = config.PTERODACTYL_PANEL.orgEmail || "contact@example.com";
    const invoiceId = uuidv4();
    // const qrData = `https://example.com/invoice/${invoiceId}`;
    const qrData = `Thnak you for your purchase! Your invoice ID is ${invoiceId}.`;
    const currency = interaction.options.getString("currency");
    const duration = interaction.options.getString("duration") || null;
    const rawProducts = interaction.options.getString("products");
    const isPaid = interaction.options.getBoolean("paid");
    let products = [];

    try {
      products = rawProducts.split(",").map((entry) => {
        const [name, price] = entry.trim().split(":");
        if (!name || isNaN(price)) {
          throw new Error(`Invalid product entry: ${entry}`);
        }
        return { name: name.trim(), price: parseFloat(price.trim()) };
      });
    } catch (err) {
      return await interaction.editReply({
        content:
          "❌ Invalid format. Please enter products like: `ProductA:100, ProductB:250`",
        flags: MessageFlags.Ephemeral,
      });
    }

    const invoiceData = {
      invoiceId,
      userId: user.id,
      customerName,
      customerEmail,
      orgName,
      orgEmail,
      qrData,
      products,
    };

    try {
      let invoiceDoc = await Invoice.findOne({ guildId });

      if (!invoiceDoc) {
        invoiceDoc = await Invoice.create({ guildId, invoices: [invoiceData] });
      } else {
        invoiceDoc.invoices.push(invoiceData);
        await invoiceDoc.save();
      }
    } catch (error) {
      console.error("Error saving invoice to database:", error);
      return await interaction.editReply({
        content: "There was an error saving the invoice to the database.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const pdfBytes = await createInvoice({
        qrData,
        orgName,
        orgEmail,
        invoiceId,
        customerName,
        customerEmail,
        currency,
        products,
        duration,
        paid: isPaid,
      });
      const pdfBuffer = Buffer.from(pdfBytes);

      await interaction.editReply({
        content: "📄 Here is your invoice:",
        files: [
          {
            name: `invoice.pdf`,
            attachment: pdfBuffer,
          },
        ],
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      await interaction.editReply({
        content: "There was an error generating the invoice.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
