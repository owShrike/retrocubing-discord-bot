const cron = require("node-cron");

// Planifie une feature : à chaque déclenchement du cron, récupère son salon et lui passe
function scheduleFeature(client, feature, timezone) {
  cron.schedule(
    feature.cron,
    async () => {
      try {
        const channel = await client.channels.fetch(feature.channelId);
        if (!channel || !channel.isTextBased()) {
          console.error(`[${feature.name}] Channel invalide ou non textuel`);
          return;
        }
        await feature.run(channel);
      } catch (err) {
        console.error(`[${feature.name}] Erreur :`, err);
      }
    },
    { timezone }
  );
  console.log(
    `[${feature.name}] Cron planifié: "${feature.cron}" (TZ=${timezone})`
  );
}

module.exports = { scheduleFeature };
