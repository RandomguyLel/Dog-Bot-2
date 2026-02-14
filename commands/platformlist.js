const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

const MAX_REGEX_DISPLAY = 120;

function isEnabled(cfg, key) {
  return cfg.enabled == null || cfg.enabled[key] !== false;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('platformlist')
    .setDescription('List all platforms with regex patterns, conversion domains, and status'),
  async execute(interaction) {
    try {
      const config = readConfig();
      const platform = config.platform;
      const regexPatterns = config.regexPatterns || {};
      if (typeof platform !== 'object' || Object.keys(platform).length === 0) {
        await interaction.reply({
          content: 'No platforms in config yet. Add some via `/config` → **Add platform**.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Platform list')
        .setDescription('Conversion domain, regex pattern, and status (ON = links rewritten) for each platform.')
        .setColor('#00AE86');

      for (const [name, conversion] of Object.entries(platform)) {
        const pattern = regexPatterns[name] || '—';
        const status = isEnabled(config, name) ? '🟢 ON' : '🔴 OFF';
        const value = [
          `**Conversion:** \`${conversion}\``,
          `**Regex:** \`${truncate(pattern, MAX_REGEX_DISPLAY)}\``,
          `**Status:** ${status}`
        ].join('\n');
        embed.addFields({ name: name, value, inline: false });
      }

      embed.setFooter({ text: `${Object.keys(platform).length} platform(s) • Use /config to add or edit` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing command platformlist:', error);
      await interaction.reply({
        content: 'There was an error loading the platform list.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
