const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ADMIN_USER_ID = process.env.ALFRED_ADMIN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show bot status and guild list (admin only).'),
    async execute(interaction) {
        if (interaction.user.id !== ADMIN_USER_ID) {
            return interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
        }

        const guilds = interaction.client.guilds.cache;

        const embed = new EmbedBuilder()
            .setColor(0x39ff14)
            .setTitle('Alfred Status Report')
            .setDescription(`**Bot:** ${interaction.client.user.tag}\n**Guilds:** ${guilds.size}`)
            .addFields(
                guilds.map(g => ({
                    name: g.name,
                    value: `ID: \`${g.id}\` | Members: ${g.memberCount}`,
                    inline: false,
                }))
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
