require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const phrasesData = require("./json/challenges.json");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TZ = process.env.TZ || "Europe/Paris";
const CRON_EXPR = process.env.CRON || "30 18 * * *";

if (!TOKEN) throw new Error("DISCORD_TOKEN manquant dans .env");
if (!CHANNEL_ID) throw new Error("CHANNEL_ID manquant dans .env");

const phrases = Array.isArray(phrasesData)
  ? phrasesData
  : phrasesData.phrases || [];

if (!Array.isArray(phrases) || phrases.length === 0) {
  throw new Error("Aucune phrase trouvée dans challenges.json");
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("clientReady", async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  const ch = await client.channels.fetch(CHANNEL_ID);
  await ch.send("✅ Bot prêt. Test OK.");

  cron.schedule(
    CRON_EXPR,
    async () => {
      try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          console.error("Channel invalide ou non textuel");
          return;
        }
        const phrase = pickRandom(phrases);
        await channel.send({
          embeds: [
            {
              title: "🧩 Challenge du jour !",
              description: phrase,
              color: 0x5e62c2,
            },
          ],
        });
        console.log("Phrase envoyée :", phrase);
      } catch (err) {
        console.error("Erreur envoi :", err);
      }
    },
    { timezone: TZ },
  );

  console.log(`Cron planifié: "${CRON_EXPR}" (TZ=${TZ})`);
});

client.login(TOKEN);
