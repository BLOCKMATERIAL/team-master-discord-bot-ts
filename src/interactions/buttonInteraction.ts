import { ButtonInteraction, ChannelType } from "discord.js";
import { isUserInAnyTeam, teams, updateTeamMessage } from "../utils";
import { logger } from "..";
export async function handleButtonInteraction(interaction: ButtonInteraction) {
    const [action, teamId] = interaction.customId.split('_');

    switch (action) {
        case 'join':
            await handleJoin(interaction, teamId);
            break;
        case 'leave':
            await handleLeave(interaction, teamId);
            break;
        case 'disband':
            await handleDisband(interaction, teamId);
            break;
    }
}

async function handleJoin(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (isUserInAnyTeam(interaction.user.id)) {
        await interaction.reply({ content: 'Ви вже є учасником, лідером або в резерві іншої команди.', ephemeral: true });
        return;
    }

    if (team.players.length < team.slots) {
        team.players.push(interaction.user.id);
        await interaction.reply({ content: 'Ви приєдналися до команди.', ephemeral: true });
    } else {
        team.reserve.push(interaction.user.id);
        await interaction.reply({ content: 'Команда повна. Вас додано до черги.', ephemeral: true });
    }

    await updateTeamMessage(interaction.client, teamId);
}
async function handleLeave(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (!team.players.includes(interaction.user.id) && !team.reserve.includes(interaction.user.id)) {
        await interaction.reply({ content: 'Ви не є учасником цієї команди.', ephemeral: true });
        return;
    }

    const isLeader = team.leader === interaction.user.id;
    const wasInReserve = team.reserve.includes(interaction.user.id);

    if (isLeader) {
        if (team.players.length === 1) {
            delete teams[teamId];
            await interaction.message.delete();
            await interaction.reply({ content: 'Ви покинули команду. Оскільки ви були єдиним гравцем, команду розформовано.', ephemeral: true });
            return;
        } else {
            const newLeaderIndex = team.players.findIndex(id => id !== interaction.user.id);
            if (newLeaderIndex !== -1) {
                team.leader = team.players[newLeaderIndex];
                await interaction.client.users.cache.get(team.leader)?.send(`Ви стали новим лідером команди ${teamId}.`);
            }
        }
    }

    team.players = team.players.filter(id => id !== interaction.user.id);
    team.reserve = team.reserve.filter(id => id !== interaction.user.id);

    if (!wasInReserve && team.reserve.length > 0 && team.players.length < team.slots) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache.get(newPlayer)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
    }

    await updateTeamMessage(interaction.client, teamId);
    
    const leaveMessage = isLeader 
        ? 'Ви покинули команду і передали роль лідера іншому гравцю.' 
        : (wasInReserve ? 'Ви покинули резерв команди.' : 'Ви покинули команду.');
    await interaction.reply({ content: leaveMessage, ephemeral: true });
}

async function handleDisband(interaction: ButtonInteraction, teamId: string) {
    const team = teams[teamId];
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (team.leader !== interaction.user.id) {
        await interaction.reply({ content: 'Тільки лідер команди може розпустити команду.', ephemeral: true });
        return;
    }
    let voiceChannelDeleted = false;
    if (team.voiceChannelId && interaction.guild) {
        try {
            const voiceChannel = await interaction.guild.channels.fetch(team.voiceChannelId);
            if (voiceChannel && voiceChannel.type === ChannelType.GuildVoice) {
                await voiceChannel.delete();
                voiceChannelDeleted = true;
                logger.info(`Deleted voice channel ${team.voiceChannelId} for disbanded team ${teamId}`);
            }
        } catch (error) {
            logger.error(`Failed to delete voice channel for team ${teamId}: ${error}`);
        }
    }

    delete teams[teamId];
    await interaction.message.delete();
    const replyContent = voiceChannelDeleted
        ? 'Команду розпущено, і голосовий канал видалено.'
        : 'Команду розпущено.';
    await interaction.reply({ content: replyContent, ephemeral: true });
}