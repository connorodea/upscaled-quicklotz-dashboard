import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, MessageCircle, Mail } from "lucide-react"

const faqs = [
  {
    question: "How is the All-in Cost calculated?",
    answer: "All-in Cost = Lot Price + Allocated Shipping. The shipping allocation is calculated based on the proportion of each line item's MSRP relative to the total order MSRP.",
  },
  {
    question: "What does '% of MSRP' mean?",
    answer: "% of MSRP represents the All-in Cost divided by the total MSRP. This metric helps you understand how much you're paying relative to the retail value of the goods.",
  },
  {
    question: "How are Recovery Scenarios calculated?",
    answer: "Expected Recovery = Total MSRP × Recovery Rate. Gross Profit = Expected Recovery - Total All-in (COGS). The recovery rate represents the percentage of MSRP you expect to achieve when reselling the goods.",
  },
  {
    question: "How often does data sync from suppliers?",
    answer: "By default, data syncs every 15 minutes. You can manually trigger a sync from the Settings page or by clicking the refresh indicator in the sidebar.",
  },
  {
    question: "How do I mark an invoice as paid?",
    answer: "Navigate to the Invoices page, find the invoice you want to update, and click the checkmark icon in the Actions column. You can also open the order detail drawer and update the invoice status from there.",
  },
  {
    question: "What carriers are supported for tracking?",
    answer: "Currently, we support TForce and XPO Logistics. Tracking information is updated automatically when shipments are created and periodically throughout delivery.",
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Find answers and learn how to use the Sourcing Platform
            </p>
          </div>

          {/* Search */}
          <div className="relative mx-auto max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              className="pl-9 bg-input border-border"
            />
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card transition-colors hover:bg-muted/50 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/15 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">Documentation</p>
                  <p className="text-sm text-muted-foreground">Learn the platform</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card transition-colors hover:bg-muted/50 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-success/15 p-3">
                  <MessageCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">Live Chat</p>
                  <p className="text-sm text-muted-foreground">Get instant help</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card transition-colors hover:bg-muted/50 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-warning/15 p-3">
                  <Mail className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">Email Support</p>
                  <p className="text-sm text-muted-foreground">Send us a message</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQs */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-card-foreground">
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-border">
                    <AccordionTrigger className="text-left text-card-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Glossary */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-card-foreground">
                Glossary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-medium text-primary">All-in Cost</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lot price + allocated shipping cost
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-medium text-primary">% of MSRP</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All-in cost / MSRP (your cost relative to retail)
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-medium text-primary">Recovery Rate</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Expected resale price as a % of MSRP
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-medium text-primary">COGS</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cost of Goods Sold (your total all-in cost)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
