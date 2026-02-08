'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, Package, MapPin, Clock, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'

interface TrackingEvent {
  date: string
  location: string
  activity: string
  carrier: string
  trailer?: string
}

interface TrackingOrder {
  orderId: string
  carrier: string | null
  trackingNumber: string | null
  trackingStatus: string | null
  expectedDelivery: string | null
  billOfLading: string | null
  lastLocation: string | null
  pieces: number | null
  weight: number | null
}

interface TrackingTimelineProps {
  orderId: string
  onClose?: () => void
}

export function TrackingTimeline({ orderId, onClose }: TrackingTimelineProps) {
  const [order, setOrder] = useState<TrackingOrder | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/tracking?orderId=${orderId}`)
        const data = await res.json()
        if (data.success) {
          setOrder(data.order)
          setEvents(data.events || [])
        } else {
          setError(data.error || 'Failed to load tracking')
        }
      } catch (err) {
        setError('Failed to load tracking data')
      } finally {
        setLoading(false)
      }
    }
    fetchTracking()
  }, [orderId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-500'
    const s = status.toLowerCase()
    if (s.includes('delivered')) return 'bg-green-500'
    if (s.includes('transit') || s.includes('departure')) return 'bg-blue-500'
    if (s.includes('exception') || s.includes('delay') || s.includes('weather')) return 'bg-amber-500'
    if (s.includes('picked')) return 'bg-purple-500'
    return 'bg-gray-500'
  }

  const getActivityIcon = (activity: string) => {
    const a = activity.toLowerCase()
    if (a.includes('delivered')) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (a.includes('departure') || a.includes('transit')) return <Truck className="h-4 w-4 text-blue-500" />
    if (a.includes('arrived') || a.includes('location')) return <MapPin className="h-4 w-4 text-purple-500" />
    if (a.includes('picked')) return <Package className="h-4 w-4 text-indigo-500" />
    if (a.includes('weather') || a.includes('delay') || a.includes('exception')) return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <Circle className="h-4 w-4 text-gray-400" />
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Shipment Tracking</CardTitle>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Order ID</p>
            <p className="font-semibold">{order?.orderId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Carrier</p>
            <p className="font-semibold">{order?.carrier || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tracking #</p>
            <p className="font-mono text-sm">{order?.trackingNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">BOL #</p>
            <p className="font-mono text-sm">{order?.billOfLading || '-'}</p>
          </div>
        </div>

        {/* Status Badge */}
        {order?.trackingStatus && (
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(order.trackingStatus)}>
              {order.trackingStatus}
            </Badge>
            {order.expectedDelivery && (
              <span className="text-sm text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                ETA: {formatDate(order.expectedDelivery)}
              </span>
            )}
          </div>
        )}

        {/* Shipment Details */}
        {(order?.pieces || order?.weight || order?.lastLocation) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {order.pieces && (
              <span><Package className="inline h-3 w-3 mr-1" />{order.pieces} pieces</span>
            )}
            {order.weight && (
              <span>{order.weight} lbs</span>
            )}
            {order.lastLocation && (
              <span><MapPin className="inline h-3 w-3 mr-1" />{order.lastLocation}</span>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="mt-4">
          <h4 className="font-semibold mb-3">Shipment Progress</h4>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tracking events available</p>
          ) : (
            <div className="space-y-0">
              {events.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getActivityIcon(event.activity)}
                    </div>
                    {idx < events.length - 1 && (
                      <div className="w-0.5 h-full min-h-[40px] bg-border" />
                    )}
                  </div>
                  
                  {/* Event details */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">{event.activity}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDate(event.date)} {formatTime(event.date)}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">
                        <MapPin className="inline h-3 w-3 mr-1" />{event.location}
                      </p>
                    )}
                    {event.trailer && (
                      <p className="text-xs text-muted-foreground">
                        Trailer: {event.trailer}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
