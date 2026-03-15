# M7 Stock Return Dashboard

A minimal Next.js dashboard for Magnificent 7 stock returns.

## Tickers

- AAPL
- MSFT
- NVDA
- AMZN
- GOOGL
- META
- TSLA

## Metrics

- 1D
- 7D
- MTD
- QTD
- YTD

## How it works

- Fetches daily market data on the server
- Uses the nearest previous trading day for non-trading dates
- Shows the latest available market date in the UI
- Renders a simple responsive table

## Local development

Requires Node.js 18.17 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Keep the default Next.js framework preset.
4. Set the Node.js version to 18.x or 20.x.
5. Deploy.

No environment variables are required.
