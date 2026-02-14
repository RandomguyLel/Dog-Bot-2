const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

/**
 * Handle admin panel interactions: add/remove config access roles. Owner only.
 * @returns {Promise<boolean>} true if the interaction was handled
 */
async function handleAdminInteraction(interaction) {
  const config = readConfig();
  if (interaction.user.id !== config.ownerId) return false;

  const customId = interaction.customId;

  if (interaction.isButton()) {
    if (customId === 'admin_add_role_by_id') {
      const modal = new ModalBuilder()
        .setCustomId('admin_add_role_modal')
        .setTitle('Add role by ID or name');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_or_name')
            .setLabel('Role ID or exact name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 123456789012345678 or Staff')
            .setRequired(true)
        )
      );
      await interaction.showModal(modal);
      return true;
    }
    if (customId === 'admin_add_config_role') {
      const select = new RoleSelectMenuBuilder()
        .setCustomId('admin_add_role_select')
        .setPlaceholder('Select a role to grant /config access…')
        .setMaxValues(1);
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        content: 'Select a role. Members with that role will be able to use **/config**.',
        components: [row]
      });
      return true;
    }
    if (customId === 'admin_remove_config_role') {
      const roleIds = config.configRoleIds || [];
      if (roleIds.length === 0) {
        await interaction.reply({
          content: 'There are no config roles to remove.'
        });
        return true;
      }
      const options = roleIds.slice(0, 25).map(rid => {
        const role = interaction.guild?.roles.cache.get(rid);
        return {
          label: role?.name ?? rid,
          value: rid,
          description: `Remove access for ${role?.name ?? 'this role'}`
        };
      });
      const select = new StringSelectMenuBuilder()
        .setCustomId('admin_remove_role_select')
        .setPlaceholder('Select a role to remove from /config access…')
        .addOptions(options);
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        content: 'Select a role to remove from config access.',
        components: [row]
      });
      return true;
    }
  }

  if (interaction.isRoleSelectMenu() && customId === 'admin_add_role_select') {
    const role = interaction.roles.first();
    if (!role) {
      await interaction.reply({ content: 'No role selected.' });
      return true;
    }
    const cfg = readConfig();
    if (!cfg.configRoleIds) cfg.configRoleIds = [];
    if (cfg.configRoleIds.includes(role.id)) {
      await interaction.reply({
        content: `**${role.name}** already has config access.`
      });
      return true;
    }
    cfg.configRoleIds.push(role.id);
    writeConfig(cfg);
    await interaction.reply({
      content: `Added **${role.name}** to config access. Members with this role can now use **/config**.`
    });
    return true;
  }

  if (interaction.isModalSubmit() && customId === 'admin_add_role_modal') {
    const input = interaction.fields.getTextInputValue('role_id_or_name').trim();
    if (!input) {
      await interaction.reply({ content: 'Please enter a role ID or name.', flags: MessageFlags.Ephemeral });
      return true;
    }
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
      return true;
    }
    const snowflake = /^\d{17,19}$/.test(input);
    const role = snowflake
      ? guild.roles.cache.get(input)
      : guild.roles.cache.find(r => r.name === input);
    if (!role) {
      await interaction.reply({
        content: snowflake
          ? `No role found with ID \`${input}\`. Check that the ID is correct and the bot can see the role.`
          : `No role found with name **${input}**. Use the exact role name (case-sensitive).`
      });
      return true;
    }
    const cfg = readConfig();
    if (!cfg.configRoleIds) cfg.configRoleIds = [];
    if (cfg.configRoleIds.includes(role.id)) {
      await interaction.reply({
        content: `**${role.name}** already has config access.`
      });
      return true;
    }
    cfg.configRoleIds.push(role.id);
    writeConfig(cfg);
    await interaction.reply({
      content: `Added **${role.name}** to config access. Members with this role can now use **/config**.`
    });
    return true;
  }

  if (interaction.isStringSelectMenu() && customId === 'admin_remove_role_select') {
    const roleId = interaction.values[0];
    const cfg = readConfig();
    if (!cfg.configRoleIds) cfg.configRoleIds = [];
    cfg.configRoleIds = cfg.configRoleIds.filter(id => id !== roleId);
    writeConfig(cfg);
    const role = interaction.guild?.roles.cache.get(roleId);
    await interaction.reply({
      content: `Removed **${role?.name ?? roleId}** from config access.`
    });
    return true;
  }

  return false;
}

module.exports = { handleAdminInteraction };
