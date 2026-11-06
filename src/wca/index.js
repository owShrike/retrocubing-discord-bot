const fs = require("fs/promises");
const path = require("path");
const config = require("../config");

const WCA_API_URL = "https://www.worldcubeassociation.org/api/v0/competitions";
const SEEN_FILE = config.wca.seenFile;

async function loadSeenIds() {
  try {
    const raw = await fs.readFile(SEEN_FILE, "utf8");
    return new Set(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") return new Set();
    throw err;
  }
}

async function saveSeenIds(ids) {
  await fs.mkdir(path.dirname(SEEN_FILE), { recursive: true });
  await fs.writeFile(SEEN_FILE, JSON.stringify([...ids].sort()));
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

module.exports = {
  name: "wca",
  channelId: config.wca.channelId,
  cron: config.wca.cron,
  run: checkNewCompetitions,
};
