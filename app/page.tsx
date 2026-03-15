import { chartColors, getDashboardData, metrics, type DashboardData } from "@/lib/market"

export const revalidate = 3600

function formatPercent(value: number | null) {
  if (value === null) {
    return "-"
  }

  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

function formatPrice(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `$${value.toFixed(2)}`
}

function formatCompactNumber(value: number | null) {
  if (value === null) {
    return "-"
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value)
}

function formatMultiple(value: number | null) {
  if (value === null) {
    return "-"
  }

  return value.toFixed(2)
}

function buildChartModel(chart: DashboardData["ytdChart"]) {
  const width = 620
  const height = 320
  const padding = { top: 18, right: 18, bottom: 30, left: 46 }
  const allPoints = chart.flatMap((series) => series.points)
  const allValues = allPoints.map((point) => point.value)

  const minValue = Math.min(...allValues, 0)
  const maxValue = Math.max(...allValues, 0)
  const valueRange = maxValue - minValue || 1

  const allDates = allPoints.map((point) => new Date(`${point.date}T00:00:00Z`).getTime())
  const minDate = Math.min(...allDates)
  const maxDate = Math.max(...allDates)
  const dateRange = maxDate - minDate || 1

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const yPosition = (value: number) =>
    padding.top + ((maxValue - value) / valueRange) * plotHeight

  const xPosition = (date: string) =>
    padding.left +
    ((new Date(`${date}T00:00:00Z`).getTime() - minDate) / dateRange) * plotWidth

  const lines = chart.map((series) => ({
    ticker: series.ticker,
    color: chartColors[series.ticker as keyof typeof chartColors],
    path: series.points
      .map((point, index) => {
        const x = xPosition(point.date).toFixed(2)
        const y = yPosition(point.value).toFixed(2)
        return `${index === 0 ? "M" : "L"} ${x} ${y}`
      })
      .join(" "),
    latest:
      series.points.length > 0
        ? {
            x: xPosition(series.points[series.points.length - 1].date),
            y: yPosition(series.points[series.points.length - 1].value),
            value: series.points[series.points.length - 1].value
          }
        : null
  }))

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - (valueRange / 4) * index
    return {
      value,
      y: yPosition(value)
    }
  })

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(minDate))

  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(maxDate))

  return {
    width,
    height,
    padding,
    yTicks,
    zeroLineY: yPosition(0),
    lines,
    startLabel,
    endLabel
  }
}

function YtdChart({ chart }: { chart: DashboardData["ytdChart"] }) {
  const model = buildChartModel(chart)

  return (
    <div className="subpanel chart-panel">
      <div className="subpanel-header">
        <div>
          <p className="eyebrow">Trend</p>
          <h2>YTD return chart</h2>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        className="chart-svg"
        role="img"
        aria-label="Year-to-date return lines for the Magnificent 7 stocks"
      >
        {model.yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={model.padding.left}
              x2={model.width - model.padding.right}
              y1={tick.y}
              y2={tick.y}
              className="chart-grid"
            />
            <text x={12} y={tick.y + 4} className="chart-axis">
              {formatPercent(tick.value)}
            </text>
          </g>
        ))}

        <line
          x1={model.padding.left}
          x2={model.width - model.padding.right}
          y1={model.zeroLineY}
          y2={model.zeroLineY}
          className="chart-zero"
        />

        {model.lines.map((line) => (
          <g key={line.ticker}>
            <path d={line.path} fill="none" stroke={line.color} strokeWidth="2.5" />
            {line.latest ? (
              <>
                <circle cx={line.latest.x} cy={line.latest.y} r="4" fill={line.color} />
                <text x={line.latest.x + 8} y={line.latest.y + 4} className="chart-label">
                  {line.ticker}
                </text>
              </>
            ) : null}
          </g>
        ))}

        <text x={model.padding.left} y={model.height - 8} className="chart-axis">
          {model.startLabel}
        </text>
        <text
          x={model.width - model.padding.right}
          y={model.height - 8}
          textAnchor="end"
          className="chart-axis"
        >
          {model.endLabel}
        </text>
      </svg>
    </div>
  )
}

export default async function HomePage() {
  try {
    const data = await getDashboardData()

    return (
      <main className="page-shell">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">M7 dashboard</p>
              <h1>Stock returns at a glance</h1>
            </div>
            <p className="timestamp">
              Latest update date: <strong>{data.latestUpdateDate}</strong>
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  {metrics.map((metric) => (
                    <th key={metric}>{metric}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.ticker}>
                    <td className="ticker-cell">
                      <div className="ticker">{row.ticker}</div>
                      <div className="stock-price">{formatPrice(row.currentPrice)}</div>
                    </td>
                    {metrics.map((metric) => {
                      const value = row.returns[metric]
                      const tone =
                        value === null ? "neutral" : value >= 0 ? "positive" : "negative"

                      return (
                        <td key={metric} className={tone}>
                          {formatPercent(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="footnote">
            Non-trading days fall back to the nearest previous trading day.
          </p>

          <div className="lower-grid">
            <YtdChart chart={data.ytdChart} />

            <div className="subpanel">
              <div className="subpanel-header">
                <div>
                  <p className="eyebrow">Overview</p>
                  <h2>Market snapshot</h2>
                </div>
              </div>

              <div className="table-wrap compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Market Cap</th>
                      <th>PER</th>
                      <th>PBR</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.ticker}>
                        <td className="ticker">{row.ticker}</td>
                        <td>{formatCompactNumber(row.stats.marketCap)}</td>
                        <td>{formatMultiple(row.stats.trailingPE)}</td>
                        <td>{formatMultiple(row.stats.priceToBook)}</td>
                        <td>{formatCompactNumber(row.stats.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard data right now."

    return (
      <main className="page-shell">
        <section className="panel">
          <p className="eyebrow">M7 dashboard</p>
          <h1>Stock returns at a glance</h1>
          <p className="error-message">{message}</p>
        </section>
      </main>
    )
  }
}
