# Jeopardy

A quiz night game I built to play with friends. One laptop hosts, the TV shows
the board, and everyone buzzes in from their own phone. No buzzer hardware, no
app to install.

Play it at jeopardy.danishali.dev.

## How a game works

1. The host signs in, picks a board template and sets up the teams.
2. The TV opens the game board. Players go to the join page on their phones,
   type the game code and pick a team.
3. The host opens a question. It shows on the TV, and the buzzers unlock.
4. Phones buzz in, and the host sees the order and the gap in seconds between
   each buzz, so arguments about who was first are over quickly.
5. The host reveals the answer and gives or takes the points. The board and the
   scores update everywhere at once.

## How it's built

- React, TypeScript and Tailwind on Vite, with Radix UI parts and Framer Motion
  for the board animations. Plus a buzzer sound, because it needed one.
- PocketBase (at pb.danishali.dev) holds users, teams, categories, questions,
  board templates and games. The host dashboard, the TV board and every phone
  subscribe to the same game record with PocketBase realtime, so they stay in
  sync without me writing any socket code.
- A script sets up the collections and access rules on a fresh PocketBase server
  and is safe to run again.
- It started with a Go (Fiber) backend in its own repo. I moved to PocketBase
  once realtime subscriptions turned out to do most of what I needed.

## Still to do

Boards are made in the PocketBase admin for now. A proper board editor in the
app is next.
