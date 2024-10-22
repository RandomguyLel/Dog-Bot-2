const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
//const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Who\'s dog is this?'),
    async execute(interaction) { 
        const embed = new EmbedBuilder()
        .setAuthor({
            name: "About This Creature",
        })
        .setTitle("Dog Bot")
        .setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        .setDescription("Introducing Dog bot!\nA simple utility bot that converts social links to their embed-friendly counterparts.\nAnd may or may not do other shenanigans.\n\nWhat started as a barely functioning python bot,\nNow premiering as an even more unstable v2 version with some extras, now running on discord.js v14.15.3\n\nA totally original idea that you totally won't find anywhere on Github.\n\n\nProudly prompt-engineered using Copilot (Another word for developed) by <@217324558489747456>\n\n[Github Page](https://github.com/RandomguyLel/Dog-Bot-2) - Good luck understanding anything (I certainly can't).")
        .addFields(
            {
            name: "Contributors",
            value: "Probably you reading this right now!",
            inline: false
            },
        )
        .setImage("https://preview.redd.it/i-have-that-dawg-in-me-v0-3lvhutdlhkna1.jpg?width=640&crop=smart&auto=webp&s=ee105ac2e1f3c3f289a5cd22f95b76bc4a7cb3aa")
        .setThumbnail("https://images-ext-1.discordapp.net/external/uMaGjnLJsMQr9a3IJwm6EcU5aERfV_RPZzUQXk8Mgjk/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/605366736505798657/44707fed9239253da626059a815af177.png?format=webp&quality=lossless&width=670&height=670")
        .setColor("#00b0f4")
        .setFooter({
            text: "Dog Bot V2 - by Randomguy_lel",
            iconURL: "https://images-ext-1.discordapp.net/external/uMaGjnLJsMQr9a3IJwm6EcU5aERfV_RPZzUQXk8Mgjk/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/605366736505798657/44707fed9239253da626059a815af177.png?format=webp&quality=lossless&width=670&height=670",
        });

        await interaction.reply({ embeds: [embed] });
    }


      
  
};
