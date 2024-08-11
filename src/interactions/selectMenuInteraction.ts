import { StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, InteractionResponse, MessageComponentInteraction, MessageInteraction, ButtonBuilder, ButtonStyle } from "discord.js";
import logger from "../logger";
import Game from "../api/models/Game";

export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
    if (interaction.customId === 'select_game') {
        const selectedGameValue = interaction.values[0];
        logger.info(`User ${interaction.user.id} ${interaction.user.username} selected game ${selectedGameValue}`);
        
        try {
            const game = await Game.findOne({ value: selectedGameValue });
            if (!game) {
                await interaction.update({ content: 'Обрана гра не знайдена. Спробуйте ще раз.', components: [] });
                return;
            }
            await showCreateTeamModal(interaction, game.value);
        } catch (error) {
            logger.error('Error fetching game from database:', error);
            await interaction.update({ content: 'Виникла помилка при виборі гри. Спробуйте ще раз пізніше.', components: [] });
        }
    }
}

export async function showCreateTeamModal(interaction: StringSelectMenuInteraction, game: string) {
    const modal = new ModalBuilder()
        .setCustomId(`create_team_modal_${game}`)
        .setTitle('Створення команди');

    const slotsInput = new TextInputBuilder()
        .setCustomId('slots_input')
        .setLabel('Кількість гравців (2-10)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('5')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

    const startTimeInput = new TextInputBuilder()
        .setCustomId('start_time_input')
        .setLabel('Час початку гри (HH:MM, необов\'язково)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('18:00')
        .setRequired(false)
        .setMinLength(5)
        .setMaxLength(5);

    const notesInput = new TextInputBuilder()
        .setCustomId('notes_input')
        .setLabel('Нотатки (необов\'язково)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Вимоги до команди або код запрошення групи')
        .setRequired(false)
        .setMaxLength(1000);

    const slotsRow = new ActionRowBuilder<TextInputBuilder>().addComponents(slotsInput);
    const startTimeRow = new ActionRowBuilder<TextInputBuilder>().addComponents(startTimeInput);
    const notesRow = new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput);

    const createVoiceChannelInput = new TextInputBuilder()
    .setCustomId('create_voice_channel_input')
    .setLabel('Створити голосовий канал? (Не обов\'язково)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Так/Yes/Y/1/True')
    .setRequired(false)
    .setMaxLength(3);

    const createVoiceChannelRow = new ActionRowBuilder<TextInputBuilder>().addComponents(createVoiceChannelInput);

    modal.addComponents(slotsRow, startTimeRow, notesRow, createVoiceChannelRow);

    try {
        await interaction.showModal(modal);
    } catch (error) {
        logger.error('Error showing modal:', error);
        await interaction.update({ content: 'Виникла помилка при відкритті форми створення команди. Спробуйте ще раз пізніше.', components: [] });
    }
}

