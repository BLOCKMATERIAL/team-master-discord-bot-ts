import { Interaction } from 'discord.js';
import { handleCreateCommand } from './createCommand';
import { handleKickCommand } from './kickCommand';
import { handleHelpCommand } from './helpCommand';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleButtonInteraction } from './buttonInteraction';
import { handleModalSubmit } from './modalSubmit';

export async function handleInteraction(interaction: Interaction) {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'create') {
                await handleCreateCommand(interaction);
            } else if (commandName === 'kick') {
                await handleKickCommand(interaction);
            } else if (commandName === 'help') {
                await handleHelpCommand(interaction);
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
    }
}


