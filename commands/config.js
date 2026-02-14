const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure the bot (platforms, status) — opens forms'),
  async execute(interaction) {
    const guildName = interaction.guild?.name ?? 'DM';
    const channelName = interaction.channel?.name ?? (interaction.channel ? 'DM' : 'unknown');
    console.log(`[/config] ${interaction.user.tag} (${interaction.user.id}) in ${guildName} #${channelName}`);

    const config = readConfig();
    const isOwner = interaction.user.id === config.ownerId;
    const configRoleIds = config.configRoleIds || [];
    const canAccess = isOwner || (configRoleIds.length > 0 && interaction.member?.roles.cache.hasAny(...configRoleIds));
    if (!canAccess) {
      await interaction.reply({
        content: 'You don\'t have permission to use config. Only the bot owner or users with an allowed role can open this menu.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Dog Bot config')
      .setColor('#00AE86')
      .setDescription(
        'Use the buttons below to change settings. Each opens a form you can fill and submit.\n\n' +
        '**Add platform** — Add a new link conversion (name, regex, domain)\n' +
        '**Update platform** — Change provider or regex for an existing platform\n' +
        '**Manage platforms** — Turn conversion ON or OFF per platform\n' +
        '**Remove platform** — Delete a platform (with confirmation)\n' +
        '**Update status** — Change the bot\'s activity status\n' +
        '**Scraper image limit** — Max images in ss.com listing embeds (1–10)'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config_add_platform')
        .setLabel('Add platform')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canAccess),
      new ButtonBuilder()
        .setCustomId('config_update_platform')
        .setLabel('Update platform')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAccess),
      new ButtonBuilder()
        .setCustomId('config_manage_platforms')
        .setLabel('Manage platforms')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAccess),
      new ButtonBuilder()
        .setCustomId('config_remove_platform')
        .setLabel('Remove platform')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canAccess),
      new ButtonBuilder()
        .setCustomId('config_update_status')
        .setLabel('Update bot status')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAccess)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config_scraper_image_limit')
        .setLabel('Scraper image limit')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canAccess)
    );

    await interaction.reply({ embeds: [embed], components: [row, row2], flags: MessageFlags.Ephemeral });
  },
};
