# Use an official Node.js runtime as a parent image
FROM node:22

# Patch Debian OS packages (bookworm) before anything else
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy package.json from the project root (this is the corrected line)
COPY package*.json ./

# Install dependencies — build sqlite3 from source so its native binary
# links against this image's glibc (prebuilt binaries require glibc 2.38+)
RUN npm install --build-from-source=sqlite3

# Copy the rest of the bot's code from the discord-bot subdirectory
COPY discord-bot/. .

# Define the command to run the app
CMD [ "node", "index.js" ]
