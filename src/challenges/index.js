const config = require("../config");
const phrasesData = require("../../json/challenges.json");

const CHALLENGES_PER_DAY = 3;

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

async function sendDailyChallenges(channel) {
  const challenges = pickRandomDistinct(phrases, CHALLENGES_PER_DAY);
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
}

module.exports = {
  name: "challenges",
  channelId: config.challenges.channelId,
  cron: config.challenges.cron,
  run: sendDailyChallenges,
};
