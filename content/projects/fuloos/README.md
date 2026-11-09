# Fuloos

Fuloos ("money" in Arabic) is the budgeting app I wanted and couldn't find: one
that understands UAE bank statements and SMS alerts, works in AED, and doesn't
need a paid AI service to tell me where my salary went.

Try it at fuloos.danishali.dev. "Explore the demo" opens a sample workspace that
runs entirely in your browser and is thrown away when you leave.

## What it does

- **Accounts, categories and transactions.** Current, savings, credit card and
  cash accounts. Balances are worked out from the transactions, and a transfer is
  a single row that moves money between two accounts, so a credit card payment
  never counts as spending.
- **Imports.** CSV statements with saved column mappings per bank, and pasted
  bank SMS alerts (Liv, Mashreq, ADCB, FAB and ADIB). OTPs, declined payments and
  card repayments are skipped, and anything that looks like a duplicate is held
  back for review.
- **Category suggestions.** SMS expenses get a suggested category from the model
  I built for Ledger, my NLP project at uni (it's in the University folder).
  If you switch it on, it also learns from the categories you pick. The SMS text
  is read in the browser and never uploaded.
- **Recurring payments.** Fuloos spots rent, bills and subscriptions in your
  history, matches new transactions to them, and forecasts the next 30, 60 and
  90 days. Forecasts never change your real balances.
- **Budgets and reports.** A monthly limit per category, with spending against
  it, and a budget-vs-actual view over any date range.

## How it's built

- React and TypeScript on Vite, deployed on Vercel.
- PocketBase (at pb.danishali.dev) for sign-in and storage. Every collection is
  owner-only, and SQLite triggers stop one user's records pointing at another's.
- Money is stored as whole fils, never floating point.
- Tests cover the money maths, transfers, recurring schedules, pattern detection,
  transaction matching, forecasts and the database triggers.

## What's next

Android SMS capture, PDF statements and savings goals are on the list. It only
does AED for now, on purpose: one currency means no silent exchange-rate maths.
