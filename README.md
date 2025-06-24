# alfred-js
Alfred rewritten in JS with the help of google gemini

I used google gemini to convert the python bot to node js and to help integrate /commands

To use it make a config.json in the main directory and include the following:

{
  "token": "",
  "clientId": ""
}

where token is equal to your bot token and clientId to your client id

I use a node module called pm2 to run the bot on a vps

TODO:

-check roulette logic, change the multiplier to 10x if you hit green
-if you can code a blackjack command yourself without using Gemini you earn a cookie
-add a CVE search command probably using exploitdb
-actually learn JavaScript 
