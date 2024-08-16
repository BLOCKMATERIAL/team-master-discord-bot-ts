import { Client, GuildMember } from 'discord.js';

const valorantRanks = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Ascendant',
  'Immortal',
  'Radiant',
];

export function getValorantRank(member: GuildMember): string | null {
  for (const rank of valorantRanks) {
    if (
      member.roles.cache.some(
        (role) => role.name.toLowerCase() === rank.toLowerCase(),
      )
    ) {
      return rank;
    }
  }
  return null;
}

const rankEmojiIds: { [key: string]: string } = {
  Iron: '1273939653375954984',
  Bronze: '1273939625341358151',
  Silver: '1273939635814531133',
  Gold: '1273939643972190298',
  Platinum: '1273939577475825735',
  Diamond: '1273939683054718986',
  Ascendant: '1273952076359012362',
  Immortal: '1273939692630577245',
  Radiant: '1273939702583656469',
};

export function getRankEmoji(rank: string): string {
  const emojiId = rankEmojiIds[rank];
  return emojiId ? `<:${rank}_Valorant:${emojiId}>` : '';
}
