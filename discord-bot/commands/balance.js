const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('balances.db', (err) => {
    if (err) {
        console.error("Error opening database:", err);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS balances (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error("Error creating table:", err);
            }
        });
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check a user\'s chip balance.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose balance to check.')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const targetUserId = targetUser.id;

        db.get("SELECT balance FROM balances WHERE user_id = ?", [targetUserId], (err, row) => {
            if (err) {
                console.error("Error checking balance:", err);
                return interaction.reply("There was an error checking the balance. Please try again later.");
            }

            if (!row) { // New user
                db.run("INSERT INTO balances (user_id) VALUES (?)", [targetUserId]);
                return interaction.reply(`${targetUser} hasn't played yet, so their balance is 0.`);
            }

            const balance = row.balance;
            interaction.reply(`${targetUser}'s chip balance is ${balance}.`);
        });
    },
};