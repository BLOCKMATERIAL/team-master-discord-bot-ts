import { GuildMember, Guild } from "discord.js";

const valorantRanks = [
    "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"
];

export function getValorantRank(member: GuildMember): string | null {
    for (const rank of valorantRanks) {
        if (member.roles.cache.some(role => role.name.toLowerCase() === rank.toLowerCase())) {
            return rank;
        }
    }
    return null;
}

export function getRankEmoji(guild: Guild, rank: string): string {
    const emojiName = `${rank}_Valorant`;
    const emoji = guild.emojis.cache.find(emoji => emoji.name === emojiName);
    return emoji ? emoji.toString() : '';
}