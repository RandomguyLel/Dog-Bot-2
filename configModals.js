const fs = require("fs");
const path = require("path");
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const CONFIG_PATH = path.join(__dirname, "config.json");

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function isPlatformEnabled(cfg, key) {
  return cfg.enabled == null || cfg.enabled[key] !== false;
}

/** True if member is bot owner or has one of the config-allowed roles. */
function canAccessConfig(member, cfg) {
  if (!member) return false;
  if (member.user.id === cfg.ownerId) return true;
  const ids = cfg.configRoleIds;
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.some((rid) => member.roles.cache.has(rid))
  );
}

/** Max options in one Checkbox Group (Discord API limit). */
const CHECKBOX_GROUP_MAX_OPTIONS = 10;

/**
 * Build modal data for "Manage platforms" using a Checkbox Group.
 * Checked = conversion ON, unchecked = OFF. Supports up to CHECKBOX_GROUP_MAX_OPTIONS platforms per page.
 * Always reads config from disk so checkbox defaults reflect current state.
 * @param {number} [pageIndex=0] - Zero-based page (each page has up to CHECKBOX_GROUP_MAX_OPTIONS platforms)
 */
function buildManagePlatformsModal(pageIndex = 0) {
  const cfg = readConfig();
  const platforms = Object.keys(cfg.platform || {});
  const start = pageIndex * CHECKBOX_GROUP_MAX_OPTIONS;
  const slice = platforms.slice(start, start + CHECKBOX_GROUP_MAX_OPTIONS);
  const totalPages = Math.ceil(platforms.length / CHECKBOX_GROUP_MAX_OPTIONS);
  const pageLabel =
    totalPages > 1 ? ` (page ${pageIndex + 1}/${totalPages})` : "";
  return {
    customId:
      pageIndex === 0 && totalPages <= 1
        ? "manage_platforms_modal"
        : `manage_platforms_modal_${pageIndex}`,
    title: `Manage platforms${pageLabel}`.slice(0, 45),
    components: [
      {
        type: 18, // ComponentType.Label
        label: "Enable link conversion for these platforms",
        description:
          "Checked = ON, unchecked = OFF. Use config again for more pages.",
        component: {
          type: 22, // ComponentType.CheckboxGroup
          customId: "manage_platforms_enabled",
          options: slice.map((key) => ({
            value: key,
            label: key.length > 100 ? key.slice(0, 97) + "..." : key,
            default: isPlatformEnabled(cfg, key),
          })),
          minValues: 0,
          maxValues: slice.length,
          required: false,
        },
      },
    ],
  };
}

async function handleConfigButton(interaction) {
  const id = interaction.customId;
  if (
    id !== "config_add_platform" &&
    id !== "config_update_platform" &&
    id !== "config_update_status" &&
    id !== "config_manage_platforms" &&
    id !== "config_remove_platform" &&
    id !== "config_scraper_image_limit" &&
    id !== "config_retry_cooldown"
  )
    return false;

  const cfg = readConfig();
  if (!canAccessConfig(interaction.member, cfg)) {
    await interaction
      .reply({
        content: "You don't have permission to use config.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return true;
  }

  try {
    if (id === "config_add_platform") {
      const modal = new ModalBuilder()
        .setCustomId("platform_add_modal")
        .setTitle("Add platform");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("platform_name")
            .setLabel("Platform name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. instagram")
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("regex_pattern")
            .setLabel("Regex pattern")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              "e.g. (https?:\\/\\/(?:www\\.)?instagram\\.com\\/\\S+)",
            )
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("conversion_domain")
            .setLabel("Conversion domain")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. instagramez.com")
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    } else if (id === "config_update_platform") {
      const cfg = readConfig();
      const platforms = Object.keys(cfg.platform || {});
      if (platforms.length === 0) {
        await interaction.reply({
          content: 'No platforms in config yet. Use "Add platform" first.',
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId("config_select_platform_to_update")
        .setPlaceholder("Choose a platform to update…")
        .addOptions(
          platforms.slice(0, 25).map((key) => ({
            label: key,
            value: key,
            description: (cfg.platform[key] || "").slice(0, 100),
          })),
        );
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        content:
          "**Update platform** — Select which platform to edit. The next form will be pre-filled with current values.",
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (id === "config_manage_platforms") {
      const cfg = readConfig();
      const platforms = Object.keys(cfg.platform || {});
      if (platforms.length === 0) {
        await interaction.reply({
          content: 'No platforms in config yet. Use "Add platform" first.',
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      if (platforms.length > CHECKBOX_GROUP_MAX_OPTIONS) {
        const totalPages = Math.ceil(
          platforms.length / CHECKBOX_GROUP_MAX_OPTIONS,
        );
        const select = new StringSelectMenuBuilder()
          .setCustomId("config_manage_platforms_page")
          .setPlaceholder("Choose which set of platforms to manage…")
          .addOptions(
            Array.from({ length: totalPages }, (_, i) => {
              const start = i * CHECKBOX_GROUP_MAX_OPTIONS;
              const pagePlatforms = platforms.slice(
                start,
                start + CHECKBOX_GROUP_MAX_OPTIONS,
              );
              const label = pagePlatforms.map((p) => p.slice(0, 15)).join(", ");
              return {
                label: `Platforms ${start + 1}–${start + pagePlatforms.length} (${pagePlatforms.length})`,
                value: String(i),
                description: (label || "—").slice(0, 100),
              };
            }),
          );
        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({
          content: `You have **${platforms.length}** platforms. Pick a page to open the checkbox modal (${CHECKBOX_GROUP_MAX_OPTIONS} per page).`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      const modalData = buildManagePlatformsModal(0);
      // Pass raw payload: ModalBuilder doesn't support CheckboxGroup (type 22), so avoid it
      await interaction.showModal(modalData);
    } else if (id === "config_remove_platform") {
      const cfg = readConfig();
      const platforms = Object.keys(cfg.platform || {});
      if (platforms.length === 0) {
        await interaction.reply({
          content: "No platforms in config yet. Nothing to remove.",
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId("config_select_platform_to_remove")
        .setPlaceholder("Choose a platform to remove…")
        .addOptions(
          platforms.slice(0, 25).map((key) => ({
            label: key,
            value: key,
            description: (cfg.platform[key] || "").slice(0, 100),
          })),
        );
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        content:
          "**Remove platform** — Select which platform to remove. You'll get a confirmation step next.",
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (id === "config_update_status") {
      const cfg = readConfig();
      const modal = new ModalBuilder()
        .setCustomId("status_modal")
        .setTitle("Update bot status");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("status")
            .setLabel("Status message")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(cfg.status || "Spooky Dog Season!")
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    } else if (id === "config_scraper_image_limit") {
      const cfg = readConfig();
      const current = Math.min(
        10,
        Math.max(1, parseInt(cfg.ssScraperImageLimit, 10) || 10),
      );
      const modal = new ModalBuilder()
        .setCustomId("scraper_image_limit_modal")
        .setTitle("SS.com scraper image limit");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("limit")
            .setLabel("Max images (1–10)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("1–10")
            .setValue(String(current))
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    } else if (id === "config_retry_cooldown") {
      const cfg = readConfig();
      const current = Math.min(
        60000,
        Math.max(1000, parseInt(cfg.converterRetryCooldownMs, 10) || 11000),
      );
      const modal = new ModalBuilder()
        .setCustomId("retry_cooldown_modal")
        .setTitle("Converter retry cooldown");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("cooldown_ms")
            .setLabel("Delay in milliseconds (1000–60000)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("1000–60000")
            .setValue(String(current))
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    }
  } catch (e) {
    console.error("Config button/modal error:", e);
    await interaction
      .reply({
        content: "Something went wrong opening the form.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
  return true;
}

async function handleConfigSelect(interaction) {
  if (interaction.customId === "config_manage_platforms_page") {
    const pageIndex = parseInt(interaction.values[0], 10);
    const cfg = readConfig();
    const platforms = Object.keys(cfg.platform || {});
    const totalPages = Math.ceil(platforms.length / CHECKBOX_GROUP_MAX_OPTIONS);
    if (pageIndex < 0 || pageIndex >= totalPages) {
      await interaction.reply({
        content:
          "That page is no longer valid. Use **Manage platforms** again.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const modalData = buildManagePlatformsModal(pageIndex);
    await interaction.showModal(modalData);
    return true;
  }

  if (interaction.customId === "config_select_platform_to_remove") {
    const platformKey = interaction.values[0];
    const cfg = readConfig();
    if (!cfg.platform[platformKey]) {
      await interaction.reply({
        content: "That platform no longer exists in config.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    const modal = new ModalBuilder()
      .setCustomId(`platform_remove_confirm||${platformKey.slice(0, 76)}`)
      .setTitle(`Remove: ${platformKey}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("remove_confirm_name")
          .setLabel("Type the platform name to confirm")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(platformKey.slice(0, 100))
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId !== "config_select_platform_to_update") return false;

  const platformKey = interaction.values[0];
  const cfg = readConfig();
  if (!cfg.platform[platformKey]) {
    await interaction.reply({
      content: "That platform no longer exists in config.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  const currentProvider = cfg.platform[platformKey] || "";
  const currentRegex = cfg.regexPatterns[platformKey] || "";
  const modal = new ModalBuilder()
    .setCustomId(`platform_update_modal_${platformKey}`)
    .setTitle(`Update: ${platformKey}`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("provider")
        .setLabel("Provider domain")
        .setStyle(TextInputStyle.Short)
        .setValue(currentProvider)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("regex")
        .setLabel("Regex pattern")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(currentRegex)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
  return true;
}

async function handleConfigModalSubmit(interaction, client) {
  const id = interaction.customId;
  const cfg = readConfig();
  const canAccess = canAccessConfig(interaction.member, cfg);

  if (id === "platform_add_modal" && canAccess) {
    const name = interaction.fields.getTextInputValue("platform_name").trim();
    const pattern = interaction.fields
      .getTextInputValue("regex_pattern")
      .trim();
    const conversion = interaction.fields
      .getTextInputValue("conversion_domain")
      .trim();
    if (cfg.platform[name]) {
      await interaction.reply({
        content: `Platform **${name}** already exists. Use "Update platform" to change it.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    cfg.regexPatterns[name] = pattern;
    cfg.platform[name] = conversion;
    if (!cfg.enabled) cfg.enabled = {};
    cfg.enabled[name] = true;
    writeConfig(cfg);
    await interaction.reply({
      content: `Added platform **${name}** → \`${conversion}\` — changed by ${interaction.user}`,
    });
    return true;
  }

  if (id.startsWith("platform_update_modal_") && canAccess) {
    const platform = id.replace("platform_update_modal_", "");
    const newProvider = interaction.fields
      .getTextInputValue("provider")
      ?.trim();
    const newRegex = interaction.fields.getTextInputValue("regex")?.trim();
    if (!cfg.platform[platform]) {
      await interaction.reply({
        content: `Platform **${platform}** no longer exists in config.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    if (newProvider) cfg.platform[platform] = newProvider;
    if (newRegex) cfg.regexPatterns[platform] = newRegex;
    writeConfig(cfg);
    await interaction.reply({
      content: `Updated platform **${platform}** — changed by ${interaction.user}`,
    });
    return true;
  }

  if (id === "status_modal" && canAccess) {
    const status = interaction.fields.getTextInputValue("status").trim();
    cfg.status = status;
    writeConfig(cfg);
    client.user.setActivity(status);
    await interaction.reply({
      content: `Status set to: **${status}** — changed by ${interaction.user}`,
    });
    return true;
  }

  if (id === "scraper_image_limit_modal" && canAccess) {
    const raw = interaction.fields.getTextInputValue("limit").trim();
    const num = parseInt(raw, 10);
    if (Number.isNaN(num) || num < 1 || num > 10) {
      await interaction.reply({
        content: `\`${raw}\` isn't valid. Enter a number from **1** to **10**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    cfg.ssScraperImageLimit = num;
    writeConfig(cfg);
    await interaction.reply({
      content: `SS.com scraper image limit set to **${num}**. — changed by ${interaction.user}`,
    });
    return true;
  }

  if (id === "retry_cooldown_modal" && canAccess) {
    const raw = interaction.fields.getTextInputValue("cooldown_ms").trim();
    const num = parseInt(raw, 10);
    if (Number.isNaN(num) || num < 1000 || num > 60000) {
      await interaction.reply({
        content: `\`${raw}\` isn't valid. Enter a number from **1000** to **60000** milliseconds.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    cfg.converterRetryCooldownMs = num;
    writeConfig(cfg);
    await interaction.reply({
      content: `Converter retry cooldown set to **${num} ms**. — changed by ${interaction.user}`,
    });
    return true;
  }

  if (
    (id === "manage_platforms_modal" ||
      id.startsWith("manage_platforms_modal_")) &&
    canAccess
  ) {
    let enabledValues = [];
    try {
      const field = interaction.fields.getField("manage_platforms_enabled");
      if (field && Array.isArray(field.values)) enabledValues = field.values;
    } catch {
      // Field missing or wrong type; treat as none selected
    }
    const platforms = Object.keys(cfg.platform || {});
    const pageMatch = id.match(/^manage_platforms_modal_(\d+)$/);
    const pageIndex = pageMatch ? parseInt(pageMatch[1], 10) : 0;
    const start = pageIndex * CHECKBOX_GROUP_MAX_OPTIONS;
    const keysInThisPage = platforms.slice(
      start,
      start + CHECKBOX_GROUP_MAX_OPTIONS,
    );
    if (!cfg.enabled) cfg.enabled = {};
    for (const key of keysInThisPage) {
      cfg.enabled[key] = enabledValues.includes(key);
    }
    writeConfig(cfg);
    const totalEnabled = Object.keys(cfg.platform || {}).filter(
      (k) => cfg.enabled[k] !== false,
    ).length;
    const total = platforms.length;
    const totalPages = Math.ceil(total / CHECKBOX_GROUP_MAX_OPTIONS);
    const pageNote =
      totalPages > 1 ? ` (page ${pageIndex + 1}/${totalPages})` : "";
    await interaction.reply({
      content: `Platform toggles updated${pageNote}: **${totalEnabled}** of **${total}** enabled. — changed by ${interaction.user}`,
    });
    return true;
  }

  if (id.startsWith("platform_remove_confirm||") && canAccess) {
    const platformKey = id.slice("platform_remove_confirm||".length);
    const typed = interaction.fields
      .getTextInputValue("remove_confirm_name")
      .trim();
    if (typed !== platformKey) {
      await interaction.reply({
        content: `Confirmation failed: you typed \`${typed}\`. It must match exactly: \`${platformKey}\`. No changes made.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    if (!cfg.platform[platformKey]) {
      await interaction.reply({
        content: `Platform **${platformKey}** no longer exists in config.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    delete cfg.platform[platformKey];
    delete cfg.regexPatterns[platformKey];
    if (cfg.enabled) delete cfg.enabled[platformKey];
    writeConfig(cfg);
    await interaction.reply({
      content: `Removed platform **${platformKey}** — changed by ${interaction.user}`,
    });
    return true;
  }

  if (
    id === "platform_add_modal" ||
    id.startsWith("platform_update_modal_") ||
    id === "status_modal" ||
    id === "scraper_image_limit_modal" ||
    id === "retry_cooldown_modal" ||
    id.startsWith("manage_platforms_modal") ||
    id.startsWith("platform_remove_confirm||")
  ) {
    await interaction.reply({
      content: "You don't have permission to do that.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  return false;
}

/**
 * Handles config-related interactions: config buttons, platform select menu, and modal submits.
 * @param {Interaction} interaction
 * @param {Client} client - Needed for setActivity on status update
 * @returns {Promise<boolean>} - true if the interaction was handled
 */
async function handleConfigInteraction(interaction, client) {
  if (interaction.isButton()) {
    return handleConfigButton(interaction);
  }
  if (interaction.isStringSelectMenu()) {
    return handleConfigSelect(interaction);
  }
  if (interaction.isModalSubmit()) {
    return handleConfigModalSubmit(interaction, client);
  }
  return false;
}

module.exports = { handleConfigInteraction };
