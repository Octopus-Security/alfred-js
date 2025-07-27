const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../balances.db', (err) => {
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
        .setName('adjustchips')
        .setDescription('Add or remove chips from a user (Admin Only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to adjust chips for.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of chips to adjust (positive for add, negative for remove).')
                .setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== '696202676966391888') { // User ID replaced
            return interaction.reply("You do not have permission to use this command.");
        }

        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const targetUserId = targetUser.id;

        db.get("SELECT balance FROM balances WHERE user_id = ?", [targetUserId], (err, row) => {
            if (err) {
                console.error("Error checking balance:", err);
                return interaction.reply("There was an error processing the transaction. Please try again later.");
            }

            if (!row) { // New user
                db.run("INSERT INTO balances (user_id) VALUES (?)", [targetUserId]);
            }

            db.run("UPDATE balances SET balance = balance + ? WHERE user_id = ?", [amount, targetUserId], (err) => {
                if (err) {
                    console.error("Error adjusting chips:", err);
                    return interaction.reply("There was an error adjusting chips. Please try again later.");
                }

                db.get("SELECT balance FROM balances WHERE user_id = ?", [targetUserId], (err, updatedRow) => {
                    if (err) {
                        console.error("Error getting updated balance:", err);
                        return interaction.reply("There was an error getting the updated balance.");
                    }

                    const newBalance = updatedRow ? updatedRow.balance : 0;

                    interaction.reply(`${targetUser} now has ${newBalance} chips.`);
                });
            });
        });
    },
};