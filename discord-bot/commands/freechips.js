const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// This part remains the same: it opens the database connection and creates the table if it doesn't exist.
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

    // This is the new, corrected execute function
    async execute(interaction) {
        const userId = interaction.user.id;
        const today = new Date().toLocaleDateString();

        try {
            // First, try to get the user's data
            const row = await new Promise((resolve, reject) => {
                db.get("SELECT last_claim_date FROM balances WHERE user_id = ?", [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // CASE 1: The user exists in the database
            if (row) {
                if (row.last_claim_date === today) {
                    return interaction.reply({ content: "You have already claimed your free chips today!", ephemeral: true });
                } else {
                    // User has claimed before, but not today. UPDATE their record.
                    await new Promise((resolve, reject) => {
                        db.run("UPDATE balances SET balance = balance + 1000, last_claim_date = ? WHERE user_id = ?", [today, userId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    return interaction.reply("You have claimed your 1000 free chips!");
                }
            }
            // CASE 2: The user is new. INSERT a new record.
            else {
                await new Promise((resolve, reject) => {
                    db.run("INSERT INTO balances (user_id, balance, last_claim_date) VALUES (?, 1000, ?)", [userId, today], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return interaction.reply("Welcome! You have received your first 1000 free chips!");
            }

        } catch (error) {
            console.error("Error executing /freechips:", error);
            return interaction.reply({ content: "There was an error processing your request. Please try again later.", ephemeral: true });
        }
    },
};