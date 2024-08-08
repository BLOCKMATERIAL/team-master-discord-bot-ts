import { ChatInputCommandInteraction, Client } from "discord.js";
import { getTeamIdByLeader, teams, updateTeamMessage } from "../utils";
import { logger } from "..";

export async function handleKickCommand(interaction: ChatInputCommandInteraction) {
    const teamId = getTeamIdByLeader(interaction.user.id);
    if (!teamId) {
        await interaction.reply({ content: 'Ви не є лідером жодної команди.', ephemeral: true });
        return;
    }

    const playerToKick = interaction.options.getUser('player');
    if (!playerToKick) {
        await interaction.reply({ content: 'Вказаного користувача не знайдено.', ephemeral: true });
        return;
    }

    const team = teams[teamId];
    if (!team.players.includes(playerToKick.id) && !team.reserve.includes(playerToKick.id)) {
        await interaction.reply({ content: 'Цей гравець не є учасником вашої команди.', ephemeral: true });
        return;
    }

    const wasInReserve = team.reserve.includes(playerToKick.id);
    team.players = team.players.filter(id => id !== playerToKick.id);
    team.reserve = team.reserve.filter(id => id !== playerToKick.id);

    if (!wasInReserve && team.reserve.length > 0 && team.players.length < team.slots) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache.get(newPlayer)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
    }

    await updateTeamMessage(interaction.client, teamId);

    try {
        await playerToKick.send(`Вас було виключено з команди ${teamId}.`);
        logger.info(`User ${playerToKick.id} was kicked from team ${teamId} and notified.`);
    } catch (error) {
        logger.warn(`Failed to send kick notification to user ${playerToKick.id}: ${error}`);
    }

    await interaction.reply({ content: `Гравця ${playerToKick} вигнано з команди.`, ephemeral: true });
}