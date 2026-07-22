require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const phrasesData = require("./json/challenges.json");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TZ = process.env.TZ || "Europe/Paris";
const CRON_EXPR = process.env.CRON || "30 18 * * *";

// Config spécifique compet WCA 
const WCA_CHANNEL_ID = process.env.WCA_CHANNEL_ID || CHANNEL_ID;
const WCA_CRON_EXPR = process.env.WCA_CRON || "*/30 * * * *"; // toutes les 30 min
const WCA_SEEN_FILE = path.join(__dirname, "json", "seen_competitions.json");
const WCA_API_URL = "https://www.worldcubeassociation.org/api/v0/competitions";

if (!TOKEN) throw new Error("DISCORD_TOKEN manquant dans .env");
if (!CHANNEL_ID) throw new Error("CHANNEL_ID manquant dans .env");

const phrases = Array.isArray(phrasesData)
  ? phrasesData
  : phrasesData.phrases || [];
if (!Array.isArray(phrases) || phrases.length === 0) {
  throw new Error("Aucune phrase trouvée dans challenges.json");
}

function pickRandomDistinct(arr, n) {
  if (n > arr.length) {
    throw new Error("Pas assez de challenges pour en tirer autant.");
  }
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

async function loadSeenIds() {
  try {
    const raw = await fs.readFile(WCA_SEEN_FILE, "utf8");
    return new Set(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") return new Set();
    throw err;
  }
}

async function saveSeenIds(ids) {
  await fs.mkdir(path.dirname(WCA_SEEN_FILE), { recursive: true });
  await fs.writeFile(WCA_SEEN_FILE, JSON.stringify([...ids].sort()));
}

async function fetchFrenchCompetitions() {
  const competitions = [];
  let page = 1;
  while (true) {
    const url = `${WCA_API_URL}?country_iso2=FR&sort=start_date&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur API WCA : ${res.status}`);
    const batch = await res.json();
    if (batch.length === 0) break;
    competitions.push(...batch);
    page++;
    if (batch.length < 25) break;
  }
  return competitions;
}

function buildEmbed(comp) {
  const fields = [
    { name: "Début", value: comp.start_date || "?", inline: true },
    { name: "Fin", value: comp.end_date || "?", inline: true },
  ];
  if (comp.venue_address) {
    fields.push({ name: "Lieu", value: comp.venue_address, inline: false });
  }
  return {
    title: comp.name || "Nouvelle compétition",
    url: `https://www.worldcubeassociation.org/competitions/${comp.id}`,
    description: `📍 ${comp.city || "?"}, France`,
    color: 0x3b82f6,
    fields,
  };
}

async function checkNewCompetitions(channel) {
  let competitions;
  try {
    competitions = await fetchFrenchCompetitions();
  } catch (err) {
    console.error("Erreur lors de l'appel à l'API WCA :", err);
    return;
  }

  const seenIds = await loadSeenIds();
  const currentIds = new Set(competitions.map((c) => c.id));
  const newIds = [...currentIds].filter((id) => !seenIds.has(id));

  const firstRun = seenIds.size === 0;

  if (newIds.length > 0 && !firstRun) {
    const newComps = competitions.filter((c) => newIds.includes(c.id));
    const embeds = newComps.map(buildEmbed);
    // Discord limite à 10 embeds par message.
    for (let i = 0; i < embeds.length; i += 10) {
      await channel.send({ embeds: embeds.slice(i, i + 10) });
    }
    console.log("Nouvelles compétitions WCA postées :", newIds);
  } else if (firstRun) {
    console.log(
      `Initialisation WCA : ${currentIds.size} compétition(s) existante(s) enregistrée(s), rien posté.`
    );
  } else {
    console.log("Aucune nouvelle compétition WCA.");
  }

  await saveSeenIds(currentIds);
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
        const challenges = pickRandomDistinct(phrases, 3);
        await channel.send({
          embeds: [
            {
              title: "🧩 Challenge du jour !",
              description: challenges
                .map((c, i) => `**${i + 1}.** ${c}`)
                .join("\n\n"),
              color: 0x5e62c2,
            },
          ],
        });
        console.log("Challenges envoyés :", challenges);
      } catch (err) {
        console.error("Erreur envoi :", err);
      }
    },
    { timezone: TZ }
  );
  console.log(`Cron challenges planifié: "${CRON_EXPR}" (TZ=${TZ})`);

  // Cron de veille compétition WCA
  cron.schedule(
    WCA_CRON_EXPR,
    async () => {
      try {
        const channel = await client.channels.fetch(WCA_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          console.error("Channel WCA invalide ou non textuel");
          return;
        }
        await checkNewCompetitions(channel);
      } catch (err) {
        console.error("Erreur vérification WCA :", err);
      }
    },
    { timezone: TZ }
  );
  console.log(`Cron WCA planifié: "${WCA_CRON_EXPR}" (TZ=${TZ})`);
});

client.login(TOKEN);