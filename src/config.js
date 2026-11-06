require("dotenv").config();
const path = require("path");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant dans .env`);
  return value;
}

const discordToken = requireEnv("DISCORD_TOKEN");
const defaultChannelId = requireEnv("CHANNEL_ID");

module.exports = {
  discordToken,
  timezone: process.env.TZ || "Europe/Paris",
  challenges: {
    channelId: defaultChannelId,
    cron: process.env.CRON || "30 18 * * *",
  },
  wca: {
    channelId: process.env.WCA_CHANNEL_ID || defaultChannelId,
    cron: process.env.WCA_CRON || "*/30 * * * *", // toutes les 30 min
    seenFile: path.join(__dirname, "..", "json", "seen_competitions.json"),
  },
};
