import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/market"

export const revalidate = 3600

export async function GET() {
  try {
    const data = await getDashboardData()
    return NextResponse.json(data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch dashboard data."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
