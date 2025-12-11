import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  // -----------------------------
  // !phrog → Random frog image
  // -----------------------------
  if (msg === "!phrog") {
    const folder = "./phrogs";
    const files = fs.readdirSync(folder).filter(file =>
      file.endsWith(".png") ||
      file.endsWith(".jpg") ||
      file.endsWith(".jpeg") ||
      file.endsWith(".gif")
    );

    if (files.length === 0) return message.reply("No phrogs found 😭");

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = path.join(folder, randomFile);

    const embed = new EmbedBuilder()
      .setTitle("🐸 Random Phrog")
      .setColor("#4CAF50")
      .setDescription("Your daily dose of phrog energy 💚")
      .setImage("attachment://" + randomFile);

    await message.channel.send({
      embeds: [embed],
      files: [{ attachment: filePath, name: randomFile }]
    });
  }

  // -----------------------------
  // !frog → Random frog fact (API)
  // -----------------------------
  if (msg === "!frog") {
    try {
      const res = await axios.get("https://frogfact.codeoce.com/random");
      const fact = res.data;

      const embed = new EmbedBuilder()
        .setTitle("🐸 Frog Fact")
        .setColor("#43B581")
        .setDescription(fact);

      await message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      message.channel.send("Couldn't fetch a frog fact 😭");
    }
  }
});

client.login(process.env.BOT_TOKEN);
