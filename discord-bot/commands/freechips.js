const { SlashCommandBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('freechips')
        .setDescription('Get your daily 1000 free chips!'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        // Using YYYY-MM-DD format is more reliable than toLocaleDateString()
        const today = new Date().toISOString().slice(0, 10);
        
        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // Get user from the NEW 'users' table
            let user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);

            // If user doesn't exist, create them
            if (!user) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', [userId]);
                user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            }

            // Check if the last claim date is today
            if (user.last_claim_date === today) {
                return interaction.editReply({ content: "You have already claimed your free chips today! Come back tomorrow.", ephemeral: true });
            }

            // Grant the chips and update the claim date
            await db.run('UPDATE users SET chip_balance = chip_balance + 1000, last_claim_date = ? WHERE user_id = ?', [today, userId]);

            const updatedUser = await db.get('SELECT chip_balance FROM users WHERE user_id = ?', [userId]);

            await interaction.editReply(`🎉 You have claimed your **1000** free chips! Your new balance is **${updatedUser.chip_balance}**.`);

        } catch (error) {
            console.error("Error in /freechips:", error);
            await interaction.editReply({ content: 'An error occurred.', ephemeral: true });
        } finally {
            if (db) await db.close();
        }
    },
};