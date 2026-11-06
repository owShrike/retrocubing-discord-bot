const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./src/config");
const { scheduleFeature } = require("./src/scheduleFeature");
const challenges = require("./src/challenges");
const wca = require("./src/wca");

const features = [challenges, wca];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("clientReady", async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  const channel = await client.channels.fetch(config.challenges.channelId);
  await channel.send("✅ Bot prêt. Test OK.");

  for (const feature of features) {
    scheduleFeature(client, feature, config.timezone);
  }
});

client.login(config.discordToken);
