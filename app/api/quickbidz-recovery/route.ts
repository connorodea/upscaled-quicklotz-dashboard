import { NextRequest, NextResponse } from 'next/server'
import getPool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    // Get overall statistics
    const overallResult = await pool.query(`
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(retail_price), 0) as total_retail,
        COALESCE(SUM(total_with_premium), 0) as total_with_premium,
        COALESCE(AVG(recovery_pct), 0) as avg_recovery,
        COALESCE(AVG(final_bid), 0) as avg_final_bid,
        MIN(scraped_at) as oldest_scrape,
        MAX(scraped_at) as latest_scrape
      FROM quickbidz_past_auctions
    `)
    
    // Get category breakdown
    const categoryResult = await pool.query(`
      SELECT
        category,
        COUNT(*) as item_count,
        COALESCE(SUM(retail_price), 0) as total_retail,
        COALESCE(SUM(total_with_premium), 0) as total_with_premium,
        COALESCE(AVG(recovery_pct), 0) as avg_recovery,
        COALESCE(AVG(final_bid), 0) as avg_final_bid
      FROM quickbidz_past_auctions
      GROUP BY category
      ORDER BY item_count DESC
    `)
    
    // Get recent auctions (most recent 100 items)
    const recentResult = await pool.query(`
      SELECT
        listing_id,
        title,
        category,
        retail_price,
        final_bid,
        total_with_premium,
        recovery_pct,
        condition,
        bid_count,
        auction_url,
        scraped_at
      FROM quickbidz_past_auctions
      ORDER BY scraped_at DESC
      LIMIT 100
    `)
    
    // Get recovery distribution (for histogram)
    const distributionResult = await pool.query(`
      SELECT
        CASE
          WHEN recovery_pct < 10 THEN '0-10%'
          WHEN recovery_pct < 20 THEN '10-20%'
          WHEN recovery_pct < 30 THEN '20-30%'
          WHEN recovery_pct < 40 THEN '30-40%'
          WHEN recovery_pct < 50 THEN '40-50%'
          ELSE '50%+'
        END as recovery_range,
        COUNT(*) as count
      FROM quickbidz_past_auctions
      GROUP BY 
        CASE
          WHEN recovery_pct < 10 THEN '0-10%'
          WHEN recovery_pct < 20 THEN '10-20%'
          WHEN recovery_pct < 30 THEN '20-30%'
          WHEN recovery_pct < 40 THEN '30-40%'
          WHEN recovery_pct < 50 THEN '40-50%'
          ELSE '50%+'
        END
      ORDER BY recovery_range
    `)
    
    const overall = overallResult.rows[0]
    const blendedRecovery = overall.total_retail > 0 
      ? (parseFloat(overall.total_with_premium) / parseFloat(overall.total_retail) * 100)
      : 0
    
    return NextResponse.json({
      success: true,
      source: 'postgresql',
      overview: {
        totalItems: parseInt(overall.total_items) || 0,
        totalRetail: parseFloat(overall.total_retail) || 0,
        totalWithPremium: parseFloat(overall.total_with_premium) || 0,
        blendedRecovery: blendedRecovery,
        avgRecovery: parseFloat(overall.avg_recovery) || 0,
        avgFinalBid: parseFloat(overall.avg_final_bid) || 0,
        oldestScrape: overall.oldest_scrape,
        latestScrape: overall.latest_scrape
      },
      categories: categoryResult.rows.map(row => ({
        category: row.category,
        itemCount: parseInt(row.item_count) || 0,
        totalRetail: parseFloat(row.total_retail) || 0,
        totalWithPremium: parseFloat(row.total_with_premium) || 0,
        avgRecovery: parseFloat(row.avg_recovery) || 0,
        avgFinalBid: parseFloat(row.avg_final_bid) || 0,
        blendedRecovery: row.total_retail > 0 
          ? (parseFloat(row.total_with_premium) / parseFloat(row.total_retail) * 100)
          : 0
      })),
      recentAuctions: recentResult.rows.map(row => ({
        listingId: row.listing_id,
        title: row.title,
        category: row.category,
        retailPrice: parseFloat(row.retail_price) || 0,
        finalBid: parseFloat(row.final_bid) || 0,
        totalWithPremium: parseFloat(row.total_with_premium) || 0,
        recoveryPct: parseFloat(row.recovery_pct) || 0,
        condition: row.condition,
        bidCount: parseInt(row.bid_count) || 0,
        auctionUrl: row.auction_url,
        scrapedAt: row.scraped_at
      })),
      distribution: distributionResult.rows.map(row => ({
        range: row.recovery_range,
        count: parseInt(row.count) || 0
      }))
    })
    
  } catch (error) {
    console.error('QuickBidz Recovery API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    )
  }
}
