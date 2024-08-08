import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import { registerCommands } from './commands';
import { handleInteraction } from './interactions';

dotenv.config();
export const logger = require('./logger');


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
    logger.info(`Бот вошел в систему как ${client.user}`);
    await registerCommands(client);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(process.env.DISCORD_TOKEN);