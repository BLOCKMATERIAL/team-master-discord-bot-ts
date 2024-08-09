import { Interaction } from 'discord.js';
import { handleCreateCommand } from './createCommand';
import { handleKickCommand } from './kickCommand';
import { handleHelpCommand } from './helpCommand';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleButtonInteraction } from './buttonInteraction';
import { handleModalSubmit } from './modalSubmit';
import logger from '../logger';
import { handleCreateVoiceCommand } from './createVoiceCommand';
import { handleInviteCommand } from './inviteCommand';

export async function handleInteraction(interaction: Interaction) {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            switch (commandName) {
                case 'create':
                    await handleCreateCommand(interaction);
                    break;
                case 'kick':
                    await handleKickCommand(interaction);
                    break;
                case 'help':
                    await handleHelpCommand(interaction);
                    break;
                case 'createvoice':
                    await handleCreateVoiceCommand(interaction);
                    break;
                case 'invite':
                    await handleInviteCommand(interaction);
                    break;
            }
        } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        logger.error('Error handling interaction:', error);
    }
}