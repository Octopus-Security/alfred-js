const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('balances.db', (err) => {
    if (err) {
        console.error("Error opening database:", err);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS balances (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            last_claim_date TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating table:", err);
            }
        });
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('freechips')
        .setDescription('Get your daily free chips!'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const today = new Date().toLocaleDateString();
        db.get("SELECT last_claim_date FROM balances WHERE user_id = ?", [userId], async (err, row) => {
            if (err) {
                console.error("Error checking last claim date:", err);
                return interaction.reply("There was an error processing your request. Please try again later.");
            }

            if (row && row.last_claim_date === today) {
                return interaction.reply("You have already claimed your free chips today!");
            }

            try {
                await new Promise((resolve, reject) => {
                    db.run("UPDATE balances SET balance = balance + 1000, last_claim_date = ? WHERE user_id = ?", [today, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return interaction.reply("You have claimed your 1000 free chips!");
            } catch (error) {
                console.error("Error updating balance and claim date:", error);
                return interaction.reply("There was an error processing your request. Please try again later.");
            }
        });
    },
};