'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TrackingTimeline } from './tracking-timeline'

interface TrackingDrawerProps {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrackingDrawer({ orderId, open, onOpenChange }: TrackingDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tracking Details</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {orderId && <TrackingTimeline orderId={orderId} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
