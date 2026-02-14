const { Client, GatewayIntentBits, Collection, Events, MessageFlags } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const { handleConfigInteraction } = require('./configModals.js');
const { handleAdminInteraction } = require('./adminHandlers.js');
const { handleSsComMessage } = require('./ssScraper.js');

const TOKEN = process.env.DISCORD_TOKEN;

client.on(Events.ClientReady, async () => 
{
  console.log('Bot is online!');
  client.user.setActivity(config.status);
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


client.on(Events.InteractionCreate, async interaction => {
  const adminHandled = await handleAdminInteraction(interaction);
  if (adminHandled) return;
  const configHandled = await handleConfigInteraction(interaction, client);
  if (configHandled) return;

  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await interaction.reply({ content: 'An error occurred while executing this command.', flags: MessageFlags.Ephemeral });
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

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // Add the condition to skip processing if the message starts with '$'
  if (message.content.startsWith('$')) return;

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const regexPatterns = config.regexPatterns;
  const platforms = config.platform;
  let modifiedLink = null;
  //console.log("message detected:", message.content);
  for (const [key, pattern] of Object.entries(regexPatterns)) {
    if (config.enabled && config.enabled[key] === false) continue;
    const regex = new RegExp(pattern);
    //console.log("testing for pattern:", pattern);
    if (regex.test(message.content)) {
      console.log('message valid for pattern:', pattern, 'converting start');
      const match = message.content.match(regex);
      if (match) {
        const originalLink = match[0];
        const replacement = platforms[key];
        //console.log('originalLink:', originalLink);
        //console.log('replacement:', replacement);
        // Adjust the regex to capture the domain and path separately
        const domainRegex = new RegExp(`(https?://)([^/]+)(/.*)?`);

        //console.log('domainRegex:', domainRegex);
        modifiedLink = originalLink.replace(domainRegex, `$1${replacement}$3`);
        //console.log('modifiedLink:', modifiedLink);

        // Remove 'www.' if it exists before the domain
        if (modifiedLink.includes('www.')) {
          modifiedLink = modifiedLink.replace('www.', '');
        }
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
    const mediaContent = `Posted by ${author}: ${trimmedTextBeforeLink} ${trimmedTextAfterLink}\n[Media](${modifiedLink})`;
    // Use normal message (not Components V2) so Discord can unfurl the link; silent to avoid double pings from @mentions
    let sentMessage = await message.channel.send({
      content: mediaContent,
      flags: MessageFlags.SuppressNotifications
    });
    let messageId = sentMessage.id;

    const retryEmbed = async (retryCount) => {
      if (retryCount > 2) return;
      setTimeout(async () => {
        const fetchedMessage = await message.channel.messages.fetch(messageId);
        if (fetchedMessage.embeds.length === 0) {
          console.log('Embed not created, retrying...');
          const retryLink = `${modifiedLink}?embed-retry-${retryCount}`;
          await fetchedMessage.delete();
          const retryContent = retryCount === 2
            ? `(:warning: Embed failed after 3 tries - Post could be age restriced, Dog could be lazy or it's just a skill issue) Posted by ${author}: ${trimmedTextBeforeLink} ${trimmedTextAfterLink}\n[Media](${retryLink})`
            : `(:arrows_counterclockwise: Embed retry) Posted by ${author}: ${trimmedTextBeforeLink} ${trimmedTextAfterLink}\n[Media](${retryLink})`;
          const newMessage = await message.channel.send({
            content: retryContent,
            flags: MessageFlags.SuppressNotifications
          });
          messageId = newMessage.id;
          retryEmbed(retryCount + 1);
        } else {
          console.log('Embed success');
        }
      }, 11000); // 11 seconds
    };

    retryEmbed(1);
    
  }
     
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    if (message.content.startsWith('dirst')) {
    await message.channel.send('nedirsies daudz te ja');
  }

  if (message.content.startsWith('pips')) {
    await message.channel.send('pats ne labaks');
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (await handleSsComMessage(message)) return;
});

client.login(TOKEN);
