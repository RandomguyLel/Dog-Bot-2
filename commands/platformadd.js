const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
let config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('platformadd')
    .setDescription('Add a new platform for link conversion')
    .addStringOption(option => option.setName('name').setDescription('Domain name of the platform').setRequired(true))
    .addStringOption(option => option.setName('regex-pattern').setDescription('Regex pattern. Use /regexlist for examples').setRequired(true))
    .addStringOption(option => option.setName('conversion').setDescription('Domain name of new link').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('name');
    const pattern = interaction.options.getString('regex-pattern');
    const conversion = interaction.options.getString('conversion');

    config.regexPatterns[name] = pattern;
    config.platform[name] = conversion;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    await interaction.reply(`Added new regex pattern: ${name}`);
  },
};
