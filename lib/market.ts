const TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"] as const
export const metrics = ["1D", "7D", "MTD", "QTD", "YTD"] as const
export const chartColors = {
  AAPL: "#5c7cfa",
  MSFT: "#0f8a5f",
  NVDA: "#16a34a",
  AMZN: "#f59e0b",
  GOOGL: "#2563eb",
  META: "#c83b3b",
  TSLA: "#7c3aed"
} as const

type Metric = (typeof metrics)[number]

type PricePoint = {
  date: string
  close: number
  volume: number | null
}

type ReturnMap = Record<Metric, number | null>

type ChartPoint = {
  date: string
  value: number
}

type QuoteStats = {
  marketCap: number | null
  trailingPE: number | null
  priceToBook: number | null
  volume: number | null
  currentPrice: number | null
}

export type Row = {
  ticker: string
  currentPrice: number | null
  returns: ReturnMap
  stats: Omit<QuoteStats, "currentPrice">
}

export type DashboardData = {
  latestUpdateDate: string
  rows: Row[]
  ytdChart: Array<{
    ticker: string
    points: ChartPoint[]
  }>
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      meta?: {
        regularMarketPrice?: number
      }
      indicators?: {
        adjclose?: Array<{
          adjclose?: Array<number | null>
        }>
        quote?: Array<{
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
  }
}

type RawStat = {
  raw?: number
}

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: Array<{
      price?: {
        marketCap?: RawStat
        regularMarketPrice?: RawStat
      }
      summaryDetail?: {
        trailingPE?: RawStat
        volume?: RawStat
      }
      defaultKeyStatistics?: {
        priceToBook?: RawStat
      }
    }>
    error?: {
      description?: string
    } | null
  }
}

function formatDateInNewYork(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    throw new Error("Failed to format market date.")
  }

  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getMonthStart(dateString: string) {
  return `${dateString.slice(0, 7)}-01`
}

function getQuarterStart(dateString: string) {
  const year = Number(dateString.slice(0, 4))
  const month = Number(dateString.slice(5, 7))
  const quarterMonth = month <= 3 ? 1 : month <= 6 ? 4 : month <= 9 ? 7 : 10
  return `${year}-${String(quarterMonth).padStart(2, "0")}-01`
}

function getYearStart(dateString: string) {
  return `${dateString.slice(0, 4)}-01-01`
}

function findPreviousTradingPoint(points: PricePoint[], targetDate: string) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].date <= targetDate) {
      return points[index]
    }
  }

  return null
}

function calculateReturn(latestClose: number, baseClose: number | null) {
  if (baseClose === null || baseClose === 0) {
    return null
  }

  return ((latestClose - baseClose) / baseClose) * 100
}

async function fetchTickerHistory(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&includeAdjustedClose=true`
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch market data for ${ticker}.`)
  }

  const data = (await response.json()) as YahooChartResponse
  const result = data.chart?.result?.[0]
  const timestamps = result?.timestamp ?? []
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose
  const quote = result?.indicators?.quote?.[0]
  const closes = quote?.close ?? []
  const volumes = quote?.volume ?? []
  const prices = adjusted ?? closes

  const points = timestamps
    .map((timestamp, index) => {
      const close = prices[index]
      if (close === null || close === undefined) {
        return null
      }

      return {
        date: formatDateInNewYork(new Date(timestamp * 1000)),
        close,
        volume: volumes[index] ?? null
      }
    })
    .filter((point): point is PricePoint => point !== null)

  if (points.length === 0) {
    throw new Error(`No price history available for ${ticker}.`)
  }

  return {
    points,
    regularMarketPrice: result?.meta?.regularMarketPrice ?? null
  }
}

async function fetchOverviewForTicker(ticker: string): Promise<QuoteStats> {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}` +
    "?modules=price,summaryDetail,defaultKeyStatistics"

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    })

    if (!response.ok) {
      return {
        marketCap: null,
        trailingPE: null,
        priceToBook: null,
        volume: null,
        currentPrice: null
      }
    }

    const data = (await response.json()) as YahooQuoteSummaryResponse
    const result = data.quoteSummary?.result?.[0]

    return {
      marketCap: result?.price?.marketCap?.raw ?? null,
      trailingPE: result?.summaryDetail?.trailingPE?.raw ?? null,
      priceToBook: result?.defaultKeyStatistics?.priceToBook?.raw ?? null,
      volume: result?.summaryDetail?.volume?.raw ?? null,
      currentPrice: result?.price?.regularMarketPrice?.raw ?? null
    }
  } catch {
    return {
      marketCap: null,
      trailingPE: null,
      priceToBook: null,
      volume: null,
      currentPrice: null
    }
  }
}

function buildReturns(points: PricePoint[]): ReturnMap {
  const latest = points[points.length - 1]
  const anchors: Record<Metric, string> = {
    "1D": addDays(latest.date, -1),
    "7D": addDays(latest.date, -7),
    MTD: getMonthStart(latest.date),
    QTD: getQuarterStart(latest.date),
    YTD: getYearStart(latest.date)
  }

  return metrics.reduce((accumulator, metric) => {
    const basePoint = findPreviousTradingPoint(points, anchors[metric])
    accumulator[metric] = calculateReturn(latest.close, basePoint?.close ?? null)
    return accumulator
  }, {} as ReturnMap)
}

function buildYtdSeries(points: PricePoint[]) {
  const latest = points[points.length - 1]
  const basePoint = findPreviousTradingPoint(points, getYearStart(latest.date))

  if (!basePoint) {
    return []
  }

  return points
    .filter((point) => point.date >= basePoint.date)
    .map((point) => ({
      date: point.date,
      value: calculateReturn(point.close, basePoint.close) ?? 0
    }))
}

export async function getDashboardData(): Promise<DashboardData> {
  const histories = await Promise.all(
    TICKERS.map(async (ticker) => {
      const [history, stats] = await Promise.all([
        fetchTickerHistory(ticker),
        fetchOverviewForTicker(ticker)
      ])

      return {
        ticker,
        points: history.points,
        regularMarketPrice: history.regularMarketPrice,
        stats
      }
    })
  )

  const latestUpdateDate = histories
    .map((item) => item.points[item.points.length - 1].date)
    .sort()[0]

  return {
    latestUpdateDate,
    rows: histories.map((item) => ({
      ticker: item.ticker,
      currentPrice:
        item.stats.currentPrice ??
        item.regularMarketPrice ??
        item.points[item.points.length - 1].close,
      returns: buildReturns(item.points),
      stats: {
        marketCap: item.stats.marketCap,
        trailingPE: item.stats.trailingPE,
        priceToBook: item.stats.priceToBook,
        volume: item.stats.volume ?? item.points[item.points.length - 1].volume
      }
    })),
    ytdChart: histories.map((item) => ({
      ticker: item.ticker,
      points: buildYtdSeries(item.points)
    }))
  }
}
