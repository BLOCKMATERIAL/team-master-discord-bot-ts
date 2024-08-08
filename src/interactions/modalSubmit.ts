import { ModalSubmitInteraction } from "discord.js";
import { createTeamButtons, createTeamEmbed, generateTeamId, getGameNameByValue, teams } from "../utils";
import { logger } from "..";
export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (interaction.customId.startsWith('create_team_modal_')) {
        const game = interaction.customId.split('_').pop()!;
        const slotsInput = interaction.fields.getTextInputValue('slots_input');
        const slots = parseInt(slotsInput);

        if (isNaN(slots) || slots < 2 || slots > 10) {
            await interaction.reply({ content: 'Невірна кількість гравців. Будь ласка, введіть число від 2 до 10.', ephemeral: true });
            return;
        }

        logger.info(`User ${interaction.user.id} created a team for game ${game} with ${slots} slots`);
        
        const teamId = generateTeamId();
        teams[teamId] = {
            id: teamId,
            leader: interaction.user.id,
            players: [interaction.user.id],
            reserve: [],
            createdAt: new Date(),
            channelId: interaction.channelId!,
            messageId: '',
            slots: slots,
            game: game
        };

        const embed = createTeamEmbed(teamId);
        const row = createTeamButtons(teamId);


        const reply = await interaction.reply({
            content: `🎉 Гравець ${interaction.user} створив команду для гри ${getGameNameByValue(game)} з ${slots} слотами! @everyone`,
            embeds: [embed],
            components: [row],
            fetchReply: true,
        });

        if ('id' in reply) {
            teams[teamId].messageId = reply.id;
        }
        
         

    }
}