import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Path to scraped data file
    const dataPath = process.env.AVAILABLE_LISTINGS_PATH || '/root/upscaled-tl-data/data/techliquidators/available_listings.json'

    // Try to read existing scraped data
    let listings = []
    try {
      const fileContent = await fs.readFile(dataPath, 'utf-8')
      const data = JSON.parse(fileContent)
      if (data.success && data.listings) {
        listings = data.listings
      }
    } catch (error) {
      console.log('No cached listings found, returning empty array')
    }

    return NextResponse.json({
      success: true,
      listings,
      scrapedAt: new Date().toISOString(),
      message: listings.length === 0 ? 'No listings available. Run scraper on VPS to populate data.' : undefined,
    })

  } catch (error) {
    console.error('Scraping API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Scraping failed',
        success: false
      },
      { status: 500 }
    )
  }
}
