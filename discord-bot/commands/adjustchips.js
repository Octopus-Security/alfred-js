const { SlashCommandBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adjustchips')
        .setDescription('Add or remove chips from a user (Admin Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to adjust chips for.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of chips to adjust (positive to add, negative to remove).')
                .setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== '696202676966391888') { // Your Admin User ID
            return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        }
        
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const userId = targetUser.id;
        
        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // Get user, or create if they don't exist
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user) {
                await db.run('INSERT INTO users (user_id, chip_balance) VALUES (?, ?)', [userId, 0]);
            }

            // Adjust the chip balance
            await db.run('UPDATE users SET chip_balance = chip_balance + ? WHERE user_id = ?', [amount, userId]);

            // Get the final, updated balance to show in the reply
            const updatedUser = await db.get('SELECT chip_balance FROM users WHERE user_id = ?', [userId]);

            await interaction.editReply(`Successfully adjusted chips for ${targetUser}. Their new chip balance is **${updatedUser.chip_balance}**.`);

        } catch (error) {
            console.error("Error in /adjustchips:", error);
            await interaction.editReply({ content: 'An error occurred.', ephemeral: true });
        } finally {
            if (db) await db.close();
        }
    },
};