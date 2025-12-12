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

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

// Prevent repeats
function chooseNonRepeatingRandom(list, history, limit = 10) {
  let choice;
  for (let i = 0; i < 20; i++) {
    choice = list[Math.floor(Math.random() * list.length)];
    if (!history.includes(choice)) break;
  }
  history.push(choice);
  if (history.length > limit) history.shift();
  return choice;
}

// Shuffle array
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* --------------------------------------------------
   Histories
-------------------------------------------------- */

const phrogHistory = [];
const frogFactHistory = [];

/* --------------------------------------------------
   Frog Quiz Loader
-------------------------------------------------- */

const QUIZ_DIR = "./frogquiz";

function loadFrogSpecies() {
  if (!fs.existsSync(QUIZ_DIR)) return [];

  return fs.readdirSync(QUIZ_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(dir => {
      const speciesDir = path.join(QUIZ_DIR, dir.name);
      const images = fs.readdirSync(speciesDir)
        .filter(f => f.endsWith(".jpg"))
        .map(f => ({
          name: f,
          path: path.join(speciesDir, f)
        }));

      if (!images.length) return null;

      return {
        key: dir.name,
        display: dir.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        images
      };
    })
    .filter(Boolean);
}

const frogSpecies = loadFrogSpecies();

/* --------------------------------------------------
   Active Quizzes (for timer + buttons)
-------------------------------------------------- */

const activeFrogQuizzes = new Map();

/* --------------------------------------------------
   Discord Client
-------------------------------------------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* --------------------------------------------------
   Message Handler
-------------------------------------------------- */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const msg = message.content.toLowerCase();

  /* ---------- !phrog ---------- */
  if (msg === "!phrog") {
    const files = fs.readdirSync("./phrogs")
      .filter(f => /\.(png|jpe?g|gif)$/i.test(f));

    if (!files.length) return message.reply("No phrogs found 😭");

    const file = chooseNonRepeatingRandom(files, phrogHistory);
    const embed = new EmbedBuilder()
      .setTitle("🐸 Random Phrog")
      .setColor("#4CAF50")
      .setImage("attachment://" + file);

    return message.channel.send({
      embeds: [embed],
      files: [{ attachment: `./phrogs/${file}`, name: file }]
    });
  }

  /* ---------- !frog ---------- */
  if (msg === "!frog") {
    try {
      let fact;
      for (let i = 0; i < 5; i++) {
        const res = await axios.get("https://frogfact.codeoce.com/random");
        if (!frogFactHistory.includes(res.data)) {
          fact = res.data;
          break;
        }
      }

      frogFactHistory.push(fact);
      if (frogFactHistory.length > 10) frogFactHistory.shift();

      const embed = new EmbedBuilder()
        .setTitle("🐸 Frog Fact")
        .setColor("#43B581")
        .setDescription(fact)
        .setThumbnail("attachment://frogfact.png");

      return message.channel.send({
        embeds: [embed],
        files: [{ attachment: "./assets/frogfact.png", name: "frogfact.png" }]
      });
    } catch {
      return message.reply("Couldn't fetch a frog fact 😭");
    }
  }

  /* ---------- !frogquiz ---------- */
  if (msg === "!frogquiz") {
    if (frogSpecies.length < 4) {
      return message.reply("Not enough frog species to run the quiz.");
    }

    const correct = frogSpecies[Math.floor(Math.random() * frogSpecies.length)];
    const image = correct.images[Math.floor(Math.random() * correct.images.length)];

    const choices = shuffle([
      correct,
      ...shuffle(frogSpecies.filter(f => f.key !== correct.key)).slice(0, 3)
    ]);

    const embed = new EmbedBuilder()
      .setTitle("🐸 What Frog Is This?")
      .setDescription("⏱️ **You have 5 seconds!**")
      .setColor("#4CAF50")
      .setImage("attachment://" + image.name);

    const row = new ActionRowBuilder().addComponents(
      choices.map((c, i) =>
        new ButtonBuilder()
          .setCustomId(`frogquiz:${c.key}`)
          .setLabel(`${String.fromCharCode(65 + i)}. ${c.display}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const quizMsg = await message.channel.send({
      embeds: [embed],
      files: [{ attachment: image.path, name: image.name }],
      components: [row]
    });

    const timeout = setTimeout(async () => {
      if (!activeFrogQuizzes.has(quizMsg.id)) return;

      activeFrogQuizzes.delete(quizMsg.id);

      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
      );

      await quizMsg.edit({
        content: `⏰ **Time’s up!** It was **${correct.display}**.`,
        components: [disabledRow]
      });
    }, 5000);

    activeFrogQuizzes.set(quizMsg.id, {
      correctKey: correct.key,
      row,
      timeout
    });
  }
});

/* --------------------------------------------------
   Button Handler
-------------------------------------------------- */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("frogquiz:")) return;

  const quiz = activeFrogQuizzes.get(interaction.message.id);
  if (!quiz) {
    return interaction.reply({ content: "⏰ Quiz already ended.", ephemeral: true });
  }

  clearTimeout(quiz.timeout);
  activeFrogQuizzes.delete(interaction.message.id);

  const chosen = interaction.customId.split(":")[1];
  const correct = quiz.correctKey;

  const disabledRow = new ActionRowBuilder().addComponents(
    quiz.row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
  );

  await interaction.message.edit({ components: [disabledRow] });

  await interaction.reply({
    content: chosen === correct
      ? "✅ **Correct!** 🐸"
      : `❌ **Wrong!** It was **${correct.replace(/_/g, " ")}**.`,
    ephemeral: true
  });
});

/* --------------------------------------------------
   Login
-------------------------------------------------- */

client.login(process.env.BOT_TOKEN);
