import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

dotenv.config();

// --------------------------------------
// NO-REPEAT HELPER
// --------------------------------------
function chooseNonRepeatingRandom(list, history, historyLimit = 10) {
  if (list.length === 0) return null;

  let choice;

  // Try multiple times to avoid repeats
  for (let i = 0; i < 20; i++) {
    choice = list[Math.floor(Math.random() * list.length)];
    if (!history.includes(choice)) break;
  }

  history.push(choice);

  if (history.length > historyLimit) {
    history.shift(); // remove oldest
  }

  return choice;
}

// --------------------------------------
// HISTORY BUFFERS FOR NON-REPEAT LOGIC
// --------------------------------------
const phrogHistory = [];     // last 10 phrog images
const frogFactHistory = [];  // last 10 frog facts

// --------------------------------------
// DISCORD CLIENT
// --------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --------------------------------------
// MESSAGE HANDLER
// --------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  // ==============================
  // !phrog → random frog image
  // ==============================
  if (msg === "!phrog") {
    const folder = "./phrogs";

    const files = fs.readdirSync(folder).filter(file =>
      file.endsWith(".png") ||
      file.endsWith(".jpg") ||
      file.endsWith(".jpeg") ||
      file.endsWith(".gif")
    );

    if (files.length === 0) {
      return message.reply("No phrogs found 😭");
    }

    // No-repeat protection
    const randomFile = chooseNonRepeatingRandom(files, phrogHistory, 10);
    const filePath = path.join(folder, randomFile);

    const embed = new EmbedBuilder()
      .setTitle("🐸 Random Phrog")
      .setColor("#4CAF50")
      .setDescription("Here's a fresh phrog for you 💚")
      .setImage("attachment://" + randomFile);

    return message.channel.send({
      embeds: [embed],
      files: [{ attachment: filePath, name: randomFile }]
    });
  }

  // ==============================
  // !frog → random frog fact (API)
  // ==============================
  if (msg === "!frog") {
    try {
      // Try up to 5 times to avoid duplicates
      let fact = "";
      for (let i = 0; i < 5; i++) {
        const res = await axios.get("https://frogfact.codeoce.com/random");
        fact = res.data;
        if (!frogFactHistory.includes(fact)) break;
      }

      frogFactHistory.push(fact);
      if (frogFactHistory.length > 10) frogFactHistory.shift();

      const embed = new EmbedBuilder()
        .setTitle("🐸 Frog Fact")
        .setColor("#43B581")
        .setDescription(fact);

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      return message.channel.send("Couldn't fetch a frog fact right now 😭");
    }
  }
});

// --------------------------------------
// LOGIN
// --------------------------------------
client.login(process.env.BOT_TOKEN);
