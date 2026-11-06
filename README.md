# retrocubing-discord-bot
Bot discord Retrocubing ! Lié au monde du Rubik's cube !

## Fonctionnalités

- **Défis du jour** (`src/challenges/`) : envoie 3 défis tirés de `json/challenges.json`, tous les jours à 18h30 par défaut (`CRON`).
- **Compétitions WCA** (`src/wca/`) : vérifie toutes les 30 min par défaut (`WCA_CRON`) si de nouvelles compétitions sont disponibles en France et les poste dans `WCA_CHANNEL_ID` (ou `CHANNEL_ID` si non défini).

