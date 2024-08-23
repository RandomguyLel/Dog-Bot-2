const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
let config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('platformupdate')
    .setDescription('Update an existing platform or its regex pattern')
    .addStringOption(option => option.setName('platform').setDescription('Platform to update\nCurrently supported platforms: x, twitter, instagram, reddit, tiktok').setRequired(true))
    .addStringOption(option => option.setName('new-provider').setDescription('New provider for the platform').setRequired(false))
    .addStringOption(option => option.setName('new-regex-pattern').setDescription('New regex pattern for the platform').setRequired(false)),
  async execute(interaction) {
    const platform = interaction.options.getString('platform');
    const newProvider = interaction.options.getString('new-provider');
    const newRegexPattern = interaction.options.getString('new-regex-pattern');

    if (config.platform[platform] !== undefined) {
      const embed = new EmbedBuilder()
        .setTitle('Platform Update')
        .setColor('#0099ff')
        .setDescription(`Updating settings for **${platform}**`);

      if (newProvider) {
        config.platform[platform] = newProvider;
        embed.addFields({ name: 'New Provider', value: newProvider, inline: true });
      }

      if (newRegexPattern) {
        config.regexPatterns[platform] = newRegexPattern;
        embed.addFields({ name: 'New Regex Pattern', value: `\`${newRegexPattern}\``, inline: true });
      }

      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({ embeds: [embed], components: [row] });

      const filter = i => i.customId === 'confirm' || i.customId === 'cancel';
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

      collector.on('collect', async i => {
        if (i.customId === 'confirm') {
          await i.update({ content: 'Changes confirmed!', components: [], embeds: [] });
        } else {
          // Revert changes if canceled
          if (newProvider) config.platform[platform] = config.platform[platform];
          if (newRegexPattern) config.regexPatterns[platform] = config.regexPatterns[platform];
          fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
          await i.update({ content: 'Changes canceled!', components: [], embeds: [] });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.editReply({ content: 'No response received. Changes canceled!', components: [], embeds: [] });
        }
      });
    } else {
      await interaction.reply(`Platform ${platform} not found in config!`);
    }
  },
};
