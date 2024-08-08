import { StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, InteractionResponse, MessageComponentInteraction, MessageInteraction, ButtonBuilder, ButtonStyle } from "discord.js";
import { getGameNameByValue } from "../utils";
import { logger } from "..";
export async function showSlotsModal(interaction: MessageComponentInteraction, game: string) {
    const modal = new ModalBuilder()
        .setCustomId(`create_team_modal_${game}`)
        .setTitle('Вкажіть кількість гравців');

    const slotsInput = new TextInputBuilder()
        .setCustomId('slots_input')
        .setLabel('Кількість гравців (2-10)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('5')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

    const slotsRow = new ActionRowBuilder<TextInputBuilder>().addComponents(slotsInput);

    modal.addComponents(slotsRow);

    try {
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing modal:', error);
    }
}

export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
    if (interaction.customId === 'select_game') {
        const selectedGame = interaction.values[0];
        logger.info(`User ${interaction.user.id} selected game ${selectedGame}`);
        interaction.deleteReply()
        await showSlotsModal(interaction, selectedGame);
    }
}