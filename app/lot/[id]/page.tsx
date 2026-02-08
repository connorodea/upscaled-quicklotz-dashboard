"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Package,
  MapPin,
  Truck,
  Clock,
  Star,
  Tag,
  DollarSign,
  FileSpreadsheet,
  ExternalLink,
  ChevronLeft,
  Box,
  BarChart3,
  ShoppingBag,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
} from "lucide-react"
import Link from "next/link"

interface Deal {
  auction_id: string
  marketplace: string
  title: string
  category: string
  condition: string
  current_bid: number
  msrp_total: number
  msrp_pct: number
  unit_count: number
  deal_score: number
  time_remaining: string
  auction_url: string
  seller: string
  location: string
  retailer_name: string
  retailer_color: string
  seller_rating: number | null
  seller_reviews: number
  lot_type: string
  pallet_count: number
  weight_lbs: number | null
  thumbnail_url: string | null
  images: string[]
  top_brands: string[]
  manifest_url: string | null
  manifest_item_count: number
  shipping_type: string
  bid_count: number
  projected_profit: number
  roi_estimate: number
  priority: "urgent" | "high" | "medium" | "low"
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

function PriorityBadge({ priority }: { priority: Deal["priority"] }) {
  const styles = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-blue-100 text-blue-800 border-blue-200",
    low: "bg-gray-100 text-gray-800 border-gray-200",
  }
  const labels = {
    urgent: "Hot Deal",
    high: "Great Value",
    medium: "Good Deal",
    low: "Standard",
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${styles[priority]}`}>
      <CheckCircle2 className="h-4 w-4" />
      {labels[priority]}
    </span>
  )
}

export default function LotPage() {
  const params = useParams()
  const lotId = params?.id as string
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    if (!lotId) return

    const fetchDeal = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/bst-etl?endpoint=deals/${lotId}`)
        if (response.ok) {
          const data = await response.json()
          setDeal(data)
        } else if (response.status === 404) {
          setError("Lot not found")
        } else {
          setError("Failed to load lot details")
        }
      } catch (err) {
        setError("Failed to connect to server")
      } finally {
        setLoading(false)
      }
    }

    fetchDeal()
  }, [lotId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading lot details...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">{error || "Lot not found"}</h2>
          <p className="mt-2 text-gray-600">The requested lot could not be found.</p>
          <Link
            href="/bst-etl"
            className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Deal Finder
          </Link>
        </div>
      </div>
    )
  }

  const images = deal.images.length > 0 ? deal.images : deal.thumbnail_url ? [deal.thumbnail_url] : []

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/bst-etl"
              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Lot Details
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            Lot ID: {deal.auction_id}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Images */}
          <div className="col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              {images.length > 0 ? (
                <>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                    <img
                      src={images[selectedImage]}
                      alt={deal.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = ""
                        e.currentTarget.className = "hidden"
                      }}
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                            selectedImage === i ? "border-amber-500" : "border-gray-200"
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Manifest Download */}
            {deal.manifest_url && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Manifest Available
                </h3>
                <p className="text-sm text-emerald-600 mt-1">
                  {deal.manifest_item_count > 0
                    ? `${deal.manifest_item_count} items listed`
                    : "Full item list available"}
                </p>
                <a
                  href={deal.manifest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 w-full justify-center"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Manifest
                </a>
              </div>
            )}
          </div>

          {/* Right column - Details */}
          <div className="col-span-2 space-y-6">
            {/* Title and badges */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <PriorityBadge priority={deal.priority} />
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-white"
                      style={{ backgroundColor: deal.retailer_color }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {deal.retailer_name}
                    </span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {deal.lot_type}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
                  <div className="flex items-center gap-4 mt-3 text-gray-500">
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      {deal.category}
                    </span>
                    <span>•</span>
                    <span>{deal.condition}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {deal.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price section */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Current Bid</p>
                    <p className="text-4xl font-bold text-gray-900">{formatCurrency(deal.current_bid)}</p>
                    <p className="text-lg text-amber-600 font-semibold mt-1">
                      {deal.msrp_pct.toFixed(1)}% of MSRP ({formatCurrency(deal.msrp_total)})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-5 w-5" />
                      <span className="text-lg font-medium">{deal.time_remaining}</span>
                    </div>
                    {deal.bid_count > 0 && (
                      <p className="text-sm text-gray-400 mt-1">{deal.bid_count} bids</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-6">
                <a
                  href={deal.auction_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-lg font-semibold text-gray-900 hover:bg-amber-400 w-full"
                >
                  Place Bid <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="h-4 w-4 text-blue-500" />
                  Units
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{deal.unit_count}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Box className="h-4 w-4 text-purple-500" />
                  Pallets
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{deal.pallet_count}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Deal Score
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{deal.deal_score}/100</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Est. ROI
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-600">{deal.roi_estimate}%</p>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Lot Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Seller</span>
                  <span className="font-medium text-gray-900">{deal.seller}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {deal.shipping_type}
                  </span>
                </div>
                {deal.weight_lbs && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Weight</span>
                    <span className="font-medium text-gray-900">{deal.weight_lbs.toLocaleString()} lbs</span>
                  </div>
                )}
                {deal.seller_rating && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Seller Rating</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {deal.seller_rating.toFixed(1)}
                      {deal.seller_reviews > 0 && (
                        <span className="text-gray-400">({deal.seller_reviews} reviews)</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Est. Profit</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(deal.projected_profit)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">MSRP Value</span>
                  <span className="font-medium text-gray-900">{formatCurrency(deal.msrp_total)}</span>
                </div>
              </div>

              {/* Top brands */}
              {deal.top_brands.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Top Brands in This Lot</h3>
                  <div className="flex gap-2 flex-wrap">
                    {deal.top_brands.map((brand, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
