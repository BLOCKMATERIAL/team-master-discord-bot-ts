import { ChatInputCommandInteraction } from "discord.js";
import { getTeamIdByLeader, isUserInAnyTeam, teams, updateTeamMessage } from "../utils";
import logger from "../logger";

export async function handleInviteCommand(interaction: ChatInputCommandInteraction) {
    const teamId = getTeamIdByLeader(interaction.user.id);
    if (!teamId) {
        await interaction.reply({ content: 'Ви не є лідером жодної команди.', ephemeral: true });
        return;
    }

    const playerToInvite = interaction.options.getUser('player');
    if (!playerToInvite) {
        await interaction.reply({ content: 'Вказаного користувача не знайдено.', ephemeral: true });
        return;
    }

    if (isUserInAnyTeam(playerToInvite.id)) {
        await interaction.reply({ content: 'Цей гравець вже є учасником іншої команди або в резерві.', ephemeral: true });
        return;
    }

    const team = teams[teamId];
    if (team.players.length >= team.slots && team.reserve.length >= 2) {
        await interaction.reply({ content: 'Команда та резерв повні. Неможливо запросити більше гравців.', ephemeral: true });
        return;
    }

    if (team.players.length < team.slots) {
        team.players.push(playerToInvite.id);
        logger.info(`User invited  ${playerToInvite.id} ${playerToInvite.username} was invited to team ${teamId}`);
        await interaction.reply({ content: `Гравця ${playerToInvite} запрошено до команди.`, ephemeral: true });
    } else {
        team.reserve.push(playerToInvite.id);
        await interaction.reply({ content: `Гравця ${playerToInvite} запрошено до резерву команди.`, ephemeral: true });
    }

    await updateTeamMessage(interaction.client, teamId);
}