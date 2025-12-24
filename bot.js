import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

dotenv.config();

// ----------------------------
// CONFIG
// ----------------------------
const PHROG_FOLDER = "./phrogs";
const PHROG_REPORT_LIMIT = 3;
const PHROG_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ----------------------------
// REPORT TRACKERS (in-memory)
// ----------------------------
const phrogReportCounts = new Map(); // filename -> count
const phrogUserCooldown = new Map(); // userId -> timestamp

// ----------------------------
// CLIENT
// ----------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ----------------------------
// READY
// ----------------------------
client.once("ready", () => {
  console.log(`🐸 Logged in as ${client.user.tag}`);
});

// ----------------------------
// MESSAGE HANDLER
// ----------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  /* ---------- !phrog ---------- */
  if (msg === "!phrog") {
    try {
      const files = fs.readdirSync(PHROG_FOLDER).filter(file =>
        /\.(png|jpe?g|gif|webp)$/i.test(file)
      );

      if (files.length === 0) {
        await message.reply("No phrogs found 😭");
      } else {
        const randomFile =
          files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(PHROG_FOLDER, randomFile);

        const embed = new EmbedBuilder()
          .setTitle("🐸 Random Phrog")
          .setDescription("Here’s a fresh phrog for you 💚")
          .setColor("#4CAF50")
          .setImage("attachment://" + randomFile);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`report_phrog:${randomFile}`)
            .setLabel("🚫 Not a Frog")
            .setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({
          embeds: [embed],
          files: [{ attachment: filePath, name: randomFile }],
          components: [row]
        });
      }
    } catch (err) {
      console.error("Phrog error:", err);
      await message.reply("Something went wrong getting a phrog 😭");
    }
  }

  /* ---------- !frog (fact) ---------- */
  if (msg === "!frog") {
    try {
      const res = await axios.get("https://frogclanker.codeoce.com/fact", {
        timeout: 5000
      });

      const fact = res.data;

      const embed = new EmbedBuilder()
        .setTitle("🐸 Frog Fact")
        .setDescription(fact)
        .setColor("#43B581");

      await message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error("Frog fact error:", err.message);
      await message.reply("Couldn't fetch a frog fact right now 😭");
    }
  }

  /* ---------- !frognews ---------- */
  if (msg === "!frognews") {
    try {
      const res = await axios.get("https://frogclanker.codeoce.com/news", {
        timeout: 5000
      });

      const headline = res.data;

      const embed = new EmbedBuilder()
        .setTitle("The Daily Croak")
        .setDescription(headline)
        .setColor("#2ECC71")
        .setFooter({ text: "This report is frog-certified" });

      await message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error("Frog news error:", err.message);
      await message.reply(
        "The Daily Croak journalists are on strike, no news can be shown at this time."
      );
    }
  }
});

// ----------------------------
// BUTTON HANDLER (phrog reports)
// ----------------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("report_phrog:")) return;

  const fileName = interaction.customId.split(":")[1];
  const userId = interaction.user.id;
  const now = Date.now();

  // Cooldown check
  const lastUsed = phrogUserCooldown.get(userId) || 0;
  const remaining = PHROG_COOLDOWN_MS - (now - lastUsed);

  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60000);
    await interaction.reply({
      content: `🐸 Easy there! You can report another phrog in ${mins} minute(s).`,
      ephemeral: true
    });
    return;
  }

  // Increment report count
  const currentCount = phrogReportCounts.get(fileName) || 0;
  const newCount = currentCount + 1;
  phrogReportCounts.set(fileName, newCount);
  phrogUserCooldown.set(userId, now);

  await interaction.reply({
    content: `🚨 Thanks! Report recorded (${newCount}/${PHROG_REPORT_LIMIT}).`,
    ephemeral: true
  });

  // Notify owner or channel
  const reportMsg =
    `🚨 **Phrog Report**\n` +
    `Image: \`${fileName}\`\n` +
    `Count: ${newCount}/${PHROG_REPORT_LIMIT}\n` +
    `By: ${interaction.user.tag} (${interaction.user.id})\n` +
    `Server: ${interaction.guild?.name ?? "DM"}`;

  try {
    if (process.env.REPORT_CHANNEL_ID) {
      const channel = await interaction.client.channels.fetch(
        process.env.REPORT_CHANNEL_ID
      );
      if (channel) await channel.send(reportMsg);
    } else if (process.env.OWNER_ID) {
      const owner = await interaction.client.users.fetch(
        process.env.OWNER_ID
      );
      await owner.send(reportMsg);
    }
  } catch (err) {
    console.error("Failed to send phrog report:", err);
  }

  // Disable button after limit reached
  if (newCount >= PHROG_REPORT_LIMIT) {
    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.component).setDisabled(true)
    );

    try {
      await interaction.message.edit({
        components: [disabledRow]
      });
    } catch (err) {
      console.error("Failed to disable report button:", err);
    }
  }
});

// ----------------------------
// LOGIN
// ----------------------------
client.login(process.env.BOT_TOKEN);
