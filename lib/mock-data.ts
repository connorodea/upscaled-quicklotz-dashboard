// Mock data for Sourcing Platform

export interface Order {
  id: string
  date: string
  orderId: string
  status: "Processing" | "Shipped" | "Delivered" | "Pending"
  shipTo: string
  totalAllIn: number
  totalMSRP: number
  percentOfMSRP: number
  totalItems: number
  totalPallets: number
  trackingStatus: "In Transit" | "Delivered" | "Pending Pickup" | "Out for Delivery"
  carrier?: string
  trackingNumber?: string
  eta?: string
}

export interface LineItem {
  id: string
  orderId: string
  category: string
  title: string
  msrp: number
  allInCost: number
  itemsCount: number
  palletCount: number
  percentOfMSRP: number
  dollarPerItem: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  amount: number
  status: "Paid" | "Pending" | "Overdue"
  paidDate?: string
  dueDate: string
}

export interface Shipment {
  id: string
  orderId: string
  carrier: string
  trackingNumber: string
  status: "In Transit" | "Delivered" | "Pending Pickup" | "Out for Delivery"
  eta: string
  events: { date: string; description: string; location: string }[]
}

// Orders data
export const orders: Order[] = [
  {
    id: "1",
    date: "2026-01-20",
    orderId: "ORD-2026-0120",
    status: "Delivered",
    shipTo: "Phoenix Warehouse",
    totalAllIn: 28450,
    totalMSRP: 142250,
    percentOfMSRP: 20.0,
    totalItems: 847,
    totalPallets: 12,
    trackingStatus: "Delivered",
    carrier: "TForce",
    trackingNumber: "TF-892341",
    eta: "2026-01-22",
  },
  {
    id: "2",
    date: "2026-01-18",
    orderId: "ORD-2026-0118",
    status: "Shipped",
    shipTo: "Dallas Distribution",
    totalAllIn: 35200,
    totalMSRP: 176000,
    percentOfMSRP: 20.0,
    totalItems: 1042,
    totalPallets: 16,
    trackingStatus: "In Transit",
    carrier: "XPO",
    trackingNumber: "XPO-445521",
    eta: "2026-01-25",
  },
  {
    id: "3",
    date: "2026-01-15",
    orderId: "ORD-2026-0115",
    status: "Delivered",
    shipTo: "Phoenix Warehouse",
    totalAllIn: 22100,
    totalMSRP: 126286,
    percentOfMSRP: 17.5,
    totalItems: 634,
    totalPallets: 9,
    trackingStatus: "Delivered",
    carrier: "TForce",
    trackingNumber: "TF-892102",
    eta: "2026-01-17",
  },
  {
    id: "4",
    date: "2026-01-12",
    orderId: "ORD-2026-0112",
    status: "Delivered",
    shipTo: "Atlanta Hub",
    totalAllIn: 41500,
    totalMSRP: 207500,
    percentOfMSRP: 20.0,
    totalItems: 1356,
    totalPallets: 20,
    trackingStatus: "Delivered",
    carrier: "XPO",
    trackingNumber: "XPO-443891",
    eta: "2026-01-15",
  },
  {
    id: "5",
    date: "2026-01-10",
    orderId: "ORD-2026-0110",
    status: "Processing",
    shipTo: "Phoenix Warehouse",
    totalAllIn: 18750,
    totalMSRP: 104167,
    percentOfMSRP: 18.0,
    totalItems: 512,
    totalPallets: 8,
    trackingStatus: "Pending Pickup",
    carrier: "TForce",
    trackingNumber: "TF-pending",
    eta: "2026-01-27",
  },
  {
    id: "6",
    date: "2026-01-08",
    orderId: "ORD-2026-0108",
    status: "Delivered",
    shipTo: "Dallas Distribution",
    totalAllIn: 29800,
    totalMSRP: 165556,
    percentOfMSRP: 18.0,
    totalItems: 892,
    totalPallets: 14,
    trackingStatus: "Delivered",
    carrier: "XPO",
    trackingNumber: "XPO-441234",
    eta: "2026-01-11",
  },
]

// Line Items data
export const lineItems: LineItem[] = [
  { id: "1", orderId: "ORD-2026-0120", category: "Electronics", title: "Samsung 65\" 4K Smart TV", msrp: 1299.99, allInCost: 259.99, itemsCount: 24, palletCount: 2, percentOfMSRP: 20.0, dollarPerItem: 10.83 },
  { id: "2", orderId: "ORD-2026-0120", category: "Computers", title: "HP Pavilion Laptop 15\"", msrp: 749.99, allInCost: 149.99, itemsCount: 48, palletCount: 1, percentOfMSRP: 20.0, dollarPerItem: 3.12 },
  { id: "3", orderId: "ORD-2026-0120", category: "Small Appliances", title: "Ninja Blender Pro", msrp: 179.99, allInCost: 31.50, itemsCount: 120, palletCount: 2, percentOfMSRP: 17.5, dollarPerItem: 0.26 },
  { id: "4", orderId: "ORD-2026-0118", category: "Electronics", title: "LG 55\" OLED TV", msrp: 1499.99, allInCost: 299.99, itemsCount: 18, palletCount: 2, percentOfMSRP: 20.0, dollarPerItem: 16.67 },
  { id: "5", orderId: "ORD-2026-0118", category: "Audio", title: "JBL Bluetooth Speaker", msrp: 199.99, allInCost: 35.99, itemsCount: 200, palletCount: 1, percentOfMSRP: 18.0, dollarPerItem: 0.18 },
  { id: "6", orderId: "ORD-2026-0115", category: "Kitchen", title: "KitchenAid Stand Mixer", msrp: 449.99, allInCost: 78.75, itemsCount: 36, palletCount: 1, percentOfMSRP: 17.5, dollarPerItem: 2.19 },
  { id: "7", orderId: "ORD-2026-0115", category: "Home", title: "Dyson V15 Vacuum", msrp: 749.99, allInCost: 131.25, itemsCount: 24, palletCount: 1, percentOfMSRP: 17.5, dollarPerItem: 5.47 },
  { id: "8", orderId: "ORD-2026-0112", category: "Electronics", title: "Sony 75\" Bravia XR", msrp: 2299.99, allInCost: 459.99, itemsCount: 12, palletCount: 2, percentOfMSRP: 20.0, dollarPerItem: 38.33 },
  { id: "9", orderId: "ORD-2026-0112", category: "Gaming", title: "PlayStation 5 Console", msrp: 499.99, allInCost: 99.99, itemsCount: 72, palletCount: 2, percentOfMSRP: 20.0, dollarPerItem: 1.39 },
  { id: "10", orderId: "ORD-2026-0110", category: "Computers", title: "Dell XPS 13 Laptop", msrp: 1299.99, allInCost: 233.99, itemsCount: 30, palletCount: 1, percentOfMSRP: 18.0, dollarPerItem: 7.80 },
]

// Invoices data
export const invoices: Invoice[] = [
  { id: "1", invoiceNumber: "INV-2026-0120-A", orderId: "ORD-2026-0120", amount: 28450, status: "Paid", paidDate: "2026-01-21", dueDate: "2026-01-27" },
  { id: "2", invoiceNumber: "INV-2026-0118-A", orderId: "ORD-2026-0118", amount: 35200, status: "Pending", dueDate: "2026-01-28" },
  { id: "3", invoiceNumber: "INV-2026-0115-A", orderId: "ORD-2026-0115", amount: 22100, status: "Paid", paidDate: "2026-01-16", dueDate: "2026-01-22" },
  { id: "4", invoiceNumber: "INV-2026-0112-A", orderId: "ORD-2026-0112", amount: 41500, status: "Paid", paidDate: "2026-01-14", dueDate: "2026-01-19" },
  { id: "5", invoiceNumber: "INV-2026-0110-A", orderId: "ORD-2026-0110", amount: 18750, status: "Pending", dueDate: "2026-01-30" },
  { id: "6", invoiceNumber: "INV-2026-0108-A", orderId: "ORD-2026-0108", amount: 29800, status: "Paid", paidDate: "2026-01-10", dueDate: "2026-01-15" },
]

// Shipments data
export const shipments: Shipment[] = [
  {
    id: "1",
    orderId: "ORD-2026-0120",
    carrier: "TForce",
    trackingNumber: "TF-892341",
    status: "Delivered",
    eta: "2026-01-22",
    events: [
      { date: "2026-01-22 14:30", description: "Delivered", location: "Phoenix, AZ" },
      { date: "2026-01-22 08:15", description: "Out for Delivery", location: "Phoenix, AZ" },
      { date: "2026-01-21 18:00", description: "Arrived at Local Facility", location: "Phoenix, AZ" },
      { date: "2026-01-20 10:00", description: "Shipped", location: "Dallas, TX" },
    ],
  },
  {
    id: "2",
    orderId: "ORD-2026-0118",
    carrier: "XPO",
    trackingNumber: "XPO-445521",
    status: "In Transit",
    eta: "2026-01-25",
    events: [
      { date: "2026-01-23 16:00", description: "In Transit", location: "Albuquerque, NM" },
      { date: "2026-01-22 09:00", description: "Departed Facility", location: "El Paso, TX" },
      { date: "2026-01-18 14:00", description: "Shipped", location: "Houston, TX" },
    ],
  },
  {
    id: "3",
    orderId: "ORD-2026-0115",
    carrier: "TForce",
    trackingNumber: "TF-892102",
    status: "Delivered",
    eta: "2026-01-17",
    events: [
      { date: "2026-01-17 11:45", description: "Delivered", location: "Phoenix, AZ" },
      { date: "2026-01-17 07:30", description: "Out for Delivery", location: "Phoenix, AZ" },
      { date: "2026-01-15 12:00", description: "Shipped", location: "Dallas, TX" },
    ],
  },
]

// Category breakdown for charts
export const categoryBreakdown = [
  { category: "Electronics", totalMSRP: 285000, totalAllIn: 57000 },
  { category: "Computers", totalMSRP: 156000, totalAllIn: 28080 },
  { category: "Small Appliances", totalMSRP: 98500, totalAllIn: 17730 },
  { category: "Audio", totalMSRP: 72000, totalAllIn: 12960 },
  { category: "Kitchen", totalMSRP: 64000, totalAllIn: 11200 },
  { category: "Home", totalMSRP: 45000, totalAllIn: 7875 },
  { category: "Gaming", totalMSRP: 78500, totalAllIn: 15700 },
]

// Orders over time for trend chart
export const ordersOverTime = [
  { date: "2026-01-01", totalMSRP: 85000, totalAllIn: 15300 },
  { date: "2026-01-05", totalMSRP: 120000, totalAllIn: 21600 },
  { date: "2026-01-08", totalMSRP: 165556, totalAllIn: 29800 },
  { date: "2026-01-10", totalMSRP: 104167, totalAllIn: 18750 },
  { date: "2026-01-12", totalMSRP: 207500, totalAllIn: 41500 },
  { date: "2026-01-15", totalMSRP: 126286, totalAllIn: 22100 },
  { date: "2026-01-18", totalMSRP: 176000, totalAllIn: 35200 },
  { date: "2026-01-20", totalMSRP: 142250, totalAllIn: 28450 },
]

// Recovery scenarios
export const recoveryScenarios = [
  { rate: 15, expectedRecovery: 138384, grossProfit: 64584 },
  { rate: 18, expectedRecovery: 166061, grossProfit: 92261 },
  { rate: 20, expectedRecovery: 184512, grossProfit: 110712 },
  { rate: 22, expectedRecovery: 202963, grossProfit: 129163 },
  { rate: 25, expectedRecovery: 230640, grossProfit: 156840 },
]

// Order status breakdown
export const orderStatusBreakdown = [
  { status: "Delivered", count: 4, percentage: 66.7 },
  { status: "Shipped", count: 1, percentage: 16.7 },
  { status: "Processing", count: 1, percentage: 16.6 },
]

// Aggregate metrics
export const aggregateMetrics = {
  totalMSRP: 921759,
  totalAllIn: 175800,
  blendedPercentOfMSRP: 19.07,
  ordersCount: 6,
  totalPallets: 79,
  totalItems: 5283,
  paidInvoices: 4,
  pendingInvoices: 2,
  deliveredShipments: 4,
  inTransitShipments: 2,
}

// Sparkline data for KPIs
export const sparklineData = {
  msrp: [85000, 120000, 165556, 104167, 207500, 126286, 176000, 142250],
  allIn: [15300, 21600, 29800, 18750, 41500, 22100, 35200, 28450],
  orders: [1, 1, 1, 1, 1, 1, 1, 1],
  items: [423, 521, 892, 512, 1356, 634, 1042, 847],
  pallets: [6, 8, 14, 8, 20, 9, 16, 12],
}
