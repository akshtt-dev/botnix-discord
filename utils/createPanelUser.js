import axios from "axios";
import User from "../models/User.js";

export default async function createPanelUser({
  interaction,
  username,
  email,
  password,
  firstName,
  lastName,
  client,
}) {
  try {
    const panelURL = client.config.PTERODACTYL_PANEL.panelURL;
    const panelAPIKey = client.config.PTERODACTYL_PANEL.panelAPIKey;
    const UserAgent =
      client.config.PTERODACTYL_PANEL.panelUserAgent || "PanelUserAgent/1.0";

    if (!username || !email || !password || !firstName || !lastName) {
      throw new Error("Missing required parameters");
    }

    if (!panelURL || !panelAPIKey) {
      throw new Error("Panel is not set up for this server.");
    }

    // Check if user already exists globally
    const existingUser = await User.findOne({
      $or: [{ userId: interaction.user.id }, { email }],
    });

    if (existingUser) {
      if (existingUser.panelUserId) {
        throw new Error("You already have a panel user.");
      }
      throw new Error("User already exists.");
    }

    // Step 1: Create the panel user
    const createRes = await axios.post(
      `${panelURL}/api/application/users`,
      {
        email,
        username,
        first_name: firstName,
        last_name: lastName,
      },
      {
        headers: {
          Authorization: `Bearer ${panelAPIKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": UserAgent,
        },
      }
    );

    const userId = createRes.data.attributes.id;

    // Step 2: Patch password
    await axios.patch(
      `${panelURL}/api/application/users/${userId}`,
      {
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        language: "en",
        password,
      },
      {
        headers: {
          Authorization: `Bearer ${panelAPIKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": UserAgent,
        },
      }
    );

    // Step 3: Save to MongoDB
    const newUser = new User({
      panelUserId: userId,
      userId: interaction.user.id,
      username,
      email,
      firstName,
      lastName,
    });

    await newUser.save();

    return { email, username, password };
  } catch (error) {
    console.error("Error creating panel user:", error);
    throw new Error(error.response?.data?.errors?.[0]?.detail || error.message);
  }
}
