const { Client, GatewayIntentBits, Collection} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
require('dotenv').config();
//require('log-timestamp');
const fs = require('fs');
const config = require("./config.json");
//const { platform } = require('os');


const TOKEN = process.env.DISCORD_TOKEN;
//const GUILD = process.env.DISCORD_GUILD;

client.on('ready', async() => 
{
  console.log('Bot is online!');
  client.user.setActivity('Running DogBotv2 Beta');
  //const guild = client.guilds.cache.find(guild => guild.name === GUILD);

  try
  {
    await client.application?.commands.set(client.commands.map(command => command.data));
    console.log('Slash commands registered!');
  } 
  catch (error) 
  {
    console.error('Failed to register slash commands:', error);
  }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    const command = client.commands.get(commandName);
    
    if (!command) return;
    
     try {
    console.log(`Executing command: ${commandName} by ${interaction.user.tag} (ID: ${interaction.user.id})`);
    await command.execute(interaction);
    console.log(`Command executed: ${commandName} by ${interaction.user.tag}`);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
  }
});


client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}


// Social Link Converter stuff start //

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const regexPatterns = config.regexPatterns;
  const platforms = config.platform;
  let modifiedLink = null;
  //console.log("message detected:", message.content);
  for (const [key, pattern] of Object.entries(regexPatterns)) {
    const regex = new RegExp(pattern);
    console.log("testing for pattern:", pattern);
    if (regex.test(message.content)) {
      console.log('message valid for pattern:', pattern, 'converting start');
      const match = message.content.match(regex);
      if (match) {
        const originalLink = match[0];
        const replacement = platforms[key];
        console.log('originalLink:', originalLink);
        console.log('replacement:', replacement);
        // Adjust the regex to capture the domain and path separately
        const domainRegex = new RegExp(`(https?://(?:[a-zA-Z0-9-]+\\.)?)(${key}\\.com)(/\\S*)`);

        console.log('domainRegex:', domainRegex);
        modifiedLink = originalLink.replace(domainRegex, `$1${replacement}$3`);
        console.log('modifiedLink:', modifiedLink);
        message.content = message.content.replace(originalLink, modifiedLink);
      }
      break;
    }
  }

  if (modifiedLink) {
    const author = message.author.username;
    const textBeforeLink = message.content.split(modifiedLink)[0];
    const textAfterLink = message.content.split(modifiedLink)[1];

    const trimmedTextBeforeLink = textBeforeLink ? textBeforeLink.trim() : '';
    const trimmedTextAfterLink = textAfterLink ? textAfterLink.trim() : '';

    // Known issue: if link contains underscore, it messes up whole hyperlink formatting

    await message.delete();
    const sentMessage = await message.channel.send({
      content: `Posted by ${author}: **${trimmedTextBeforeLink}** **${trimmedTextAfterLink}**\n[Media](${modifiedLink})`,
      flags: [4096]
    })
    const messageId = sentMessage.id;

    // Check if embed is created within 10 seconds
    setTimeout(async () => {
      const fetchedMessage = await message.channel.messages.fetch(messageId);
      if (fetchedMessage.embeds.length === 0) {
        console.log('Embed not created, retrying...');
        const retryLink = `${modifiedLink}?embed-retry`;
        await fetchedMessage.delete();
        await message.channel.send({
        content: `(:arrows_counterclockwise:Embed retry) Posted by ${author}: **${trimmedTextBeforeLink}** **${trimmedTextAfterLink}**\n[Media](${retryLink})`,
        flags: [4096]
        })
      }
      else console.log('Embed success')
    }, 10000); // 10 seconds
    
  }
     
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.startsWith('dirst')) {
    await message.channel.send('nedirsies daudz te ja');
  }

  if (message.content.startsWith('pips')) {
    await message.channel.send('pats ne labaks');
  }
});

client.login(TOKEN);
