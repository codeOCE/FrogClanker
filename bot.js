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

/* ---------------- Helpers ---------------- */

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* ---------------- Frog Quiz Loader ---------------- */

const QUIZ_DIR = "./frogquiz";

function loadFrogSpecies() {
  if (!fs.existsSync(QUIZ_DIR)) return [];

  return fs.readdirSync(QUIZ_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(dir => {
      const speciesDir = path.join(QUIZ_DIR, dir.name);
      const images = fs.readdirSync(speciesDir)
        .filter(f => /^img\d+\.jpg$/i.test(f))
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

/* ---------------- Active Quiz Runs ---------------- */

// key = channelId:userId
const activeQuizRuns = new Map();

/* ---------------- Discord Client ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ---------------- Quiz Logic ---------------- */

async function sendQuizQuestion(channel, userId, run) {
  const correct = frogSpecies[Math.floor(Math.random() * frogSpecies.length)];
  const image = correct.images[Math.floor(Math.random() * correct.images.length)];

  const choices = shuffle([
    correct,
    ...shuffle(frogSpecies.filter(f => f.key !== correct.key)).slice(0, 3)
  ]);

  const embed = new EmbedBuilder()
    .setTitle(`🐸 Frog Quiz (${run.current + 1}/3)`)
    .setDescription("⏱️ **You have 5 seconds!**")
    .setColor("#4CAF50")
    .setImage("attachment://" + image.name);

  const row = new ActionRowBuilder().addComponents(
    choices.map((c, i) =>
      new ButtonBuilder()
        .setCustomId(`frogquiz:${userId}:${c.key}`)
        .setLabel(`${String.fromCharCode(65 + i)}. ${c.display}`)
        .setStyle(ButtonStyle.Primary)
    )
  );

  const msg = await channel.send({
    embeds: [embed],
    files: [{ attachment: image.path, name: image.name }],
    components: [row]
  });

  const timeout = setTimeout(async () => {
    if (!activeQuizRuns.has(run.key)) return;

    run.current++;
    await msg.edit({
      content: `⏰ Time’s up! It was **${correct.display}**.`,
      components: disableRow(row)
    });

    nextQuestion(channel, userId);
  }, 5000);

  run.active = {
    correctKey: correct.key,
    row,
    message: msg,
    timeout
  };
}

function disableRow(row) {
  return [
    new ActionRowBuilder().addComponents(
      row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
    )
  ];
}

async function nextQuestion(channel, userId) {
  const key = `${channel.id}:${userId}`;
  const run = activeQuizRuns.get(key);
  if (!run) return;

  if (run.current >= 3) {
    activeQuizRuns.delete(key);
    return channel.send(
      `🏁 **Quiz complete!**\n\n**Score:** ${run.score} / 3 🐸`
    );
  }

  await sendQuizQuestion(channel, userId, run);
}

/* ---------------- Message Handler ---------------- */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() !== "!frogquiz") return;

  if (frogSpecies.length < 4) {
    return message.reply("Not enough frog species for the quiz.");
  }

  const key = `${message.channel.id}:${message.author.id}`;
  if (activeQuizRuns.has(key)) {
    return message.reply("You already have a quiz running here 🐸");
  }

  const run = {
    key,
    score: 0,
    current: 0,
    active: null
  };

  activeQuizRuns.set(key, run);
  await sendQuizQuestion(message.channel, message.author.id, run);
});

/* ---------------- Button Handler ---------------- */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("frogquiz:")) return;

  const [, userId, chosenKey] = interaction.customId.split(":");
  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: "This isn’t your quiz 🐸",
      ephemeral: true
    });
  }

  const key = `${interaction.channel.id}:${userId}`;
  const run = activeQuizRuns.get(key);
  if (!run || !run.active) {
    return interaction.reply({
      content: "⏰ This question has ended.",
      ephemeral: true
    });
  }

  clearTimeout(run.active.timeout);

  const correct = run.active.correctKey;
  const isCorrect = chosenKey === correct;

  if (isCorrect) run.score++;

  run.current++;

  await interaction.message.edit({
    components: disableRow(run.active.row)
  });

  await interaction.reply({
    content: isCorrect
      ? "✅ **Correct!** 🐸"
      : `❌ **Wrong!** It was **${correct.replace(/_/g, " ")}**.`,
    ephemeral: true
  });

  await nextQuestion(interaction.channel, userId);
});

/* ---------------- Login ---------------- */

client.login(process.env.BOT_TOKEN);
