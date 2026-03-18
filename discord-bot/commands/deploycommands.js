const { SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ADMIN_USER_ID = process.env.ALFRED_ADMIN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploycommands')
        .setDescription('Re-register all slash commands with Discord (admin only).'),
    async execute(interaction) {
        if (interaction.user.id !== ADMIN_USER_ID) {
            return interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const commands = [];
        const commandsPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const cmd = require(path.join(commandsPath, file));
            if (cmd.data) commands.push(cmd.data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            await rest.put(
                Routes.applicationCommands(interaction.client.user.id),
                { body: commands }
            );
            await interaction.editReply(`Successfully registered ${commands.length} commands.`);
        } catch (err) {
            console.error('[deploycommands]', err);
            await interaction.editReply(`Failed to deploy commands: ${err.message}`);
        }
    },
};
