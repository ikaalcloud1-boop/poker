# Kazento Poker — mobile practice MVP

A mobile-first Texas Hold'em **practice-room starter**. It uses free practice points only; points have no cash value and there are no deposits, withdrawals, cash prizes, or real-money wagering.

## Included
- Mobile-first responsive interface
- Create private room and join with room code / invite URL
- Owner can deal a practice hand, reveal at showdown, and reset
- Server sends each player's hole cards only to that player's socket
- Up to 8 seats; minimum 2 players to deal

## Deploy backend to Railway
1. Create a GitHub repository and upload this project.
2. In Railway, create a project from that GitHub repository.
3. Railway detects Node.js. The start command is `npm start`.
4. Copy the deployed Railway domain, e.g. `https://your-app.up.railway.app`.

## Deploy frontend to Vercel
1. Import the same GitHub repository into Vercel.
2. Set the project Root Directory to `public` only if deploying the static folder separately. Easiest: create a second Vercel project using the `public` folder as its root.
3. In `public/app.js`, change `const BACKEND = window.BACKEND_URL || location.origin;` to your Railway URL, for example:
   `const BACKEND = "https://your-app.up.railway.app";`
4. Deploy. For local testing, serve the `public` folder with any static server and run the backend separately.

## Local test
```bash
npm install
npm start
```
Open `http://localhost:3000` on your computer. For testing from a phone on the same Wi-Fi, use your computer's LAN IP and port 3000.

## Important MVP limitations
This is a room / private-card networking starter, not a complete poker engine. It does not yet implement betting turns, blinds, hand ranking, pot settlement, or mathematically calculated win probabilities. The community cards are dealt for a practice showdown demo. Do not use it for real-money play.
