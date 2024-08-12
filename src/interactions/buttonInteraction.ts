import { ButtonInteraction, ChannelType, ChatInputCommandInteraction } from "discord.js";
import { updateTeamMessage } from "../utils";
import logger from "../logger";
import Team from "../api/models/Team";
import Admin from "../api/models/Admin";
import { User } from "../api/models/User";

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
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    let user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
        user = new User({
            userId: interaction.user.id,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            games: [],
            teamHistory: []
        });
    }

    const isAdmin = await Admin.findOne({ userId: interaction.user.id });
    const newPlayer = {
        id: interaction.user.id,
        name: interaction.user.username,
        isAdmin: !!isAdmin
    };

    let joinedTeam = false;
    let joinedReserve = false;

    if (team.players.length < team.slots) {
        if (isAdmin) {
            team.players.unshift(newPlayer);
        } else {
            team.players.push(newPlayer);
        }
        joinedTeam = true;
        await interaction.reply({ content: 'Ви приєдналися до команди.', ephemeral: true });
    } else if (team.reserve.length < 2) {
        if (isAdmin) {
            team.reserve.unshift(newPlayer);
        } else {
            team.reserve.push(newPlayer);
        }
        joinedReserve = true;
        await interaction.reply({ content: 'Команда повна. Вас додано до резерву.', ephemeral: true });
    } else {
        await interaction.reply({ content: 'На жаль, команда та резерв уже повні.', ephemeral: true });
        return;
    }

    if (joinedTeam || joinedReserve) {
        user.teamHistory.push({
            teamId: team.teamId,
            game: team.game,
            joinedAt: new Date(),
            isReserve: joinedReserve
        });

        await user.save();
        await team.save();
        await updateTeamMessage(interaction.client, teamId);
        
        logger.info(`User ${interaction.user.id} ${interaction.user.username} joined ${joinedReserve ? 'reserve of ' : ''}team ${teamId}`);
    }
}

async function handleLeave(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    const user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Помилка: користувача не знайдено.', ephemeral: true });
        return;
    }

    const playerIndex = team.players.findIndex(player => player.id === interaction.user.id);
    const reserveIndex = team.reserve.findIndex(player => player.id === interaction.user.id);
    let wasInReserve = false;

    if (playerIndex === -1 && reserveIndex === -1) {
        await interaction.reply({ content: 'Ви не є учасником цієї команди.', ephemeral: true });
        return;
    }

    if (playerIndex !== -1) {
        team.players.splice(playerIndex, 1);
        if (team.reserve.length > 0) {
            const newPlayer = team.reserve.shift()!;
            team.players.push(newPlayer);
            await interaction.client.users.cache.get(newPlayer.id)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
        }
    } else {
        team.reserve.splice(reserveIndex, 1);
        wasInReserve = true;
    }

    const teamHistoryEntry = user.teamHistory.find(entry => entry.teamId === teamId && !entry.leftAt);
    if (teamHistoryEntry) {
        teamHistoryEntry.leftAt = new Date();
    }

    await team.save();
    await user.save();
    await updateTeamMessage(interaction.client, teamId);

    const leaveMessage = wasInReserve ? 'Ви покинули резерв команди.' : 'Ви покинули команду.';
    await interaction.reply({ content: leaveMessage, ephemeral: true });
    logger.info(`User ${interaction.user.id} left ${wasInReserve ? 'reserve of ' : ''}team ${teamId}`);
}

async function handleDisband(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (team.players[0].id !== interaction.user.id) {
        await interaction.reply({ content: 'Тільки лідер команди може розпустити команду.', ephemeral: true });
        return;
    }

    const now = new Date();

    // Обновляем историю команд для всех участников
    const allMembers = [...team.players, ...team.reserve];
    for (const member of allMembers) {
        const user = await User.findOne({ userId: member.id });
        if (user) {
            const teamHistoryEntry = user.teamHistory.find(entry => entry.teamId === teamId && !entry.leftAt);
            if (teamHistoryEntry) {
                teamHistoryEntry.leftAt = now;
                await user.save();
            }
        }
    }

    // Удаляем голосовой канал, если он существует
    if (team.voiceChannelId) {
        try {
            const channel = await interaction.client.channels.fetch(team.voiceChannelId);
            if (channel && channel.isVoiceBased() && channel.deletable) {
                await channel.delete();
                logger.info(`Deleted voice channel ${team.voiceChannelId} for team ${teamId}`);
            }
        } catch (error) {
            logger.error(`Failed to delete voice channel for team ${teamId}: ${error}`);
        }
    }

    await Team.deleteOne({ teamId });
    await interaction.message.delete();
    await interaction.reply({ content: 'Команду розпущено.', ephemeral: true });
    logger.info(`Team ${teamId} disbanded by ${interaction.user.id}`);
}
export async function handleDisbandAdmin(interaction: ChatInputCommandInteraction) {
    const isAdmin = await Admin.findOne({ userId: interaction.user.id });
    if (!isAdmin) {
        await interaction.reply({ content: 'Ця команда доступна тільки для адміністраторів.', ephemeral: true });
        return;
    }

    const teamId = interaction.options.getString('team_id');
    if (!teamId) {
        await interaction.reply({ content: 'Будь ласка, вкажіть ID команди.', ephemeral: true });
        return;
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Команду не знайдено.', ephemeral: true });
        return;
    }

    await Team.deleteOne({ teamId });
    await interaction.reply({ content: `Команду ${teamId} розпущено.`, ephemeral: true });
    logger.info(`Admin ${interaction.user.id} disbanded team ${teamId}`);
}

async function deleteVoiceChannel(interaction: ButtonInteraction, channelId: string): Promise<boolean> {
    if (interaction.guild) {
        try {
            const channel = await interaction.guild.channels.fetch(channelId);
            if (channel && channel.type === ChannelType.GuildVoice) {
                await channel.delete();
                logger.info(`Deleted voice channel ${channelId}`);
                return true;
            }
        } catch (error) {
            logger.error(`Failed to delete voice channel ${channelId}: ${error}`);
        }
    }
    return false;
}