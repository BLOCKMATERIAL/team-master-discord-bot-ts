import { Interaction, StringSelectMenuInteraction } from 'discord.js';
import { handleCreateCommand } from './createCommand';
import { handleKickCommand } from './kickCommand';
import { handleHelpCommand } from './helpCommand';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleButtonInteraction, handleDisbandAdmin } from './buttonInteraction';
import { handleModalSubmit } from './modalSubmit';
import logger from '../logger';
import { handleInviteCommand } from './inviteCommand';
import { handleInitCommand, handleInitGameSelection } from './handleInit';

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
                case 'invite':
                    await handleInviteCommand(interaction);
                    break;
                case 'init':
                    await handleInitCommand(interaction);
                    break;
                case 'disband':
                    await handleDisbandAdmin(interaction);
                    break;
            }
        } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        } else if (interaction.isStringSelectMenu()) {
         const newInteraction = interaction as StringSelectMenuInteraction;
         logger.info(`Handling select menu interaction with custom ID ${newInteraction.customId}`);
            if (newInteraction.customId === 'select_init_games') {
            await handleInitGameSelection(interaction);
         } else {
            await handleSelectMenuInteraction(interaction);
        }
    }
    } catch (error) {
        console.error('Error handling interaction:', error);
        logger.error('Error handling interaction:', error);
    }
}