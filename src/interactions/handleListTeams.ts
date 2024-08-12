import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import Team from "../api/models/Team";
import logger from "../logger";
import { getGameNameByValue } from "../utils";

export async function handleListTeamsCommand(interaction: ChatInputCommandInteraction) {
    try {
        const teams = await Team.find({});
        
        if (teams.length === 0) {
            await interaction.reply({ content: 'На даний момент немає активних команд.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Список активних команд')
            .setColor('#0099ff');

        teams.forEach(team => {
            embed.addFields({
                name: `Команда ${team.teamId} (${getGameNameByValue(team.game)})`,
                value: `Лідер: <@${team.leader}>\nГравці: ${team.players.length}/${team.slots}\nРезерв: ${team.reserve.length}/2`
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        logger.info(`User ${interaction.user.id} requested list of active teams`);
    } catch (error) {
        logger.error(`Error in handleListTeamsCommand: ${error}`);
        await interaction.reply({ content: 'Виникла помилка при отриманні списку команд. Спробуйте ще раз пізніше.', ephemeral: true });
    }
}