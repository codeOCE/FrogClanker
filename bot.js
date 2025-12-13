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

/* ==================================================
   HELPERS
================================================== */

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

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

/* ==================================================
   HISTORIES
================================================== */

const phrogHistory = [];
const frogFactHistory = [];

/* ==================================================
   FROG QUIZ DATA LOADER
================================================== */

const QUIZ_DIR = "./frogquiz";

function loadFrogSpecies() {
  if (!fs.existsSync(QUIZ_DIR)) return [];

  return fs.readdirSync(QUIZ_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(dir => {
      const dirPath = path.join(QUIZ_DIR, dir.name);
      const images = fs.readdirSync(dirPath)
        .filter(f => /^img\d+\.jpg$/i.test(f))
        .map(f => ({
          name: f,
          path: path.join(dirPath, f)
        }));

      if (!images.length) return null;

      return {
        key: dir.name,
        display: dir.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase()),
        images
      };
    })
    .filter(Boolean);
}

const frogSpecies = loadFrogSpecies();

/* ==================================================
   ACTIVE QUIZ RUNS
================================================== */

// key = channelId:userId
const activeQuizRuns = new Map();

/* ==================================================
   DISCORD CLIENT
================================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ==================================================
   QUIZ FUNCTIONS
================================================== */

function disableRow(row) {
  return [
    new ActionRowBuilder().addComponents(
      row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
    )
  ];
}

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
      content: `⏰ **Time’s up!** It was **${correct.display}**.`,
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

async function nextQuestion(channel, userId) {
  const key = `${channel.id}:${userId}`;
  const run = activeQuizRuns.get(key);
  if (!run) return;

  if (run.current >= 3) {
    activeQuizRuns.delete(key);
    return channel.send(
      `🏁 **Quiz complete!**\n\n🐸 **Score:** ${run.score} / 3`
    );
  }

  await sendQuizQuestion(channel, userId, run);
}

/* ==================================================
   MESSAGE HANDLER
================================================== */

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
      .setTitle("🐸 A wild frog appears")
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
        const res = await axios.get("https://frogclanker.codeoce.com/fact");
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
      return message.reply("Not enough frog species for the quiz.");
    }

    const key = `${message.channel.id}:${message.author.id}`;
    if (activeQuizRuns.has(key)) {
      return message.reply("You already have a quiz running 🐸");
    }

    const run = {
      key,
      score: 0,
      current: 0,
      active: null
    };

    activeQuizRuns.set(key, run);
    await sendQuizQuestion(message.channel, message.author.id, run);
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
    console.error("Frog News fetch failed:", err.message);
    await message.reply(
      "The Daily Croak journalists are on strike, no news can be shown at this time."
    );
  }
}


});

/* ==================================================
   BUTTON HANDLER
================================================== */

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


/* ==================================================
   LOGIN
================================================== */

client.login(process.env.BOT_TOKEN);
