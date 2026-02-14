const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Manage which roles can access /config (owner only)'),
  async execute(interaction) {
    const config = readConfig();
    if (interaction.user.id !== config.ownerId) {
      await interaction.reply({
        content: 'Only the bot owner can use this command.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const configRoleIds = config.configRoleIds || [];
    const roleCount = configRoleIds.length;
    const embed = new EmbedBuilder()
      .setTitle('Admin — Config access roles')
      .setColor('#00AE86')
      .setDescription(
        'Control which roles can open the **/config** menu (in addition to the owner).\n\n' +
        `**Current roles with access:** ${roleCount === 0 ? 'None (only owner can use /config)' : `${roleCount} role(s)`}\n\n` +
        '**Add role** — pick from a list (can be hard with many roles).\n' +
        '**Add by ID or name** — type the role ID (Developer Mode → right‑click role) or exact role name.'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin_add_config_role')
        .setLabel('Add role')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_add_role_by_id')
        .setLabel('Add by ID or name')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('admin_remove_config_role')
        .setLabel('Remove role')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(roleCount === 0)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
