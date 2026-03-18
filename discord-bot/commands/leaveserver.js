const { SlashCommandBuilder } = require('discord.js');

const ADMIN_USER_ID = process.env.ALFRED_ADMIN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaveserver')
        .setDescription('Make the bot leave a guild by ID (admin only).')
        .addStringOption(option =>
            option.setName('guild_id')
                .setDescription('The ID of the guild to leave')
                .setRequired(true)),
    async execute(interaction) {
        if (interaction.user.id !== ADMIN_USER_ID) {
            return interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
        }

        const guildId = interaction.options.getString('guild_id');
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.reply({ content: `No guild found with ID \`${guildId}\`.`, ephemeral: true });
        }

        const guildName = guild.name;
        await guild.leave();
        await interaction.reply({ content: `Left **${guildName}** (\`${guildId}\`).`, ephemeral: true });
    },
};
