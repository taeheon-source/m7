import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "M7 Stock Return Dashboard",
  description: "Simple dashboard for Magnificent 7 stock returns."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
