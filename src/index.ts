import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import * as dotenv from 'dotenv';

import { connectToDatabase } from './api/mongo';
import { registerCommands } from './commands';
import { handleInteraction } from './interactions';
import logger from './logger';
import { cleanupInactiveTeams } from './utils/cleanupInactiveTeams';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async () => {
  logger.info(`Бот вошел в систему как ${client.user?.displayName}`);
  await connectToDatabase();
  await registerCommands(client);

  setInterval(() => cleanupInactiveTeams(client), 6 * 60 * 60 * 1000);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(process.env.DISCORD_TOKEN);
