import { getDashboardData, metrics } from "@/lib/market"

export const revalidate = 3600

function formatPercent(value: number | null) {
  if (value === null) {
    return "-"
  }

  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
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
                    <td className="ticker">{row.ticker}</td>
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
