const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('time')
        .setDescription('Replies with the current time in a specific timezone.')
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription("The IANA timezone name (e.g., America/New_York, Europe/London, Asia/Tokyo)")
                .setRequired(true)),

    async execute(interaction) {
        const timezone = interaction.options.getString('timezone');
        const now = new Date();

        try {
            // Options to format the time string nicely
            const timeOptions = {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true, // Use 12-hour format with AM/PM
                timeZoneName: 'short', // Include the timezone abbreviation (e.g., EST, PST)
            };

            const timeString = now.toLocaleString('en-US', timeOptions);
            await interaction.reply(`The current time in **${timezone}** is: **${timeString}**`);

        } catch (error) {
            // This catch block will trigger if the user provides an invalid timezone
            if (error instanceof RangeError) {
                await interaction.reply({
                    content: `"**${timezone}**" is not a valid IANA timezone. Please try again.\n\nExamples: \`America/New_York\`, \`Europe/Paris\`, \`Australia/Sydney\`, \`UTC\``,
                    ephemeral: true
                });
            } else {
                console.error("Error in /time command:", error);
                await interaction.reply({ content: "An unknown error occurred.", ephemeral: true });
            }
        }
    },
};
