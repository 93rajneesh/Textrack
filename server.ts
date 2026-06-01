/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { 
  UserProfile, 
  CompanyInfo, 
  PurchaseOrder, 
  AlertNotification, 
  ChatMessage, 
  ProductionStage, 
  QualityReport,
  RFQRequirement
} from './src/types';

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini API
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// -----------------------------------------------------
// STATE & SEED DATA (Store in memory for simulation)
// -----------------------------------------------------

// Mock Companies (Factories and Sourcing Agents in India, and Buyers globally)
const mockCompanies: CompanyInfo[] = [
  {
    id: 'comp_tirupur',
    name: 'Tirupur Prime Knits',
    type: 'supplier',
    country: 'India',
    contactEmail: 'contact@tirupurknits.in',
    logo: '🧶',
    rating: 4.8,
    trustScore: 94,
    certifications: ['BSCI', 'Oeko-Tex Standard 100', 'WRAP', 'SEDEX'],
    productCategories: ['Knits', 'Sportswear', 'T-Shirts', 'Hoodies'],
    stitchingCapacityPerDay: 25000,
    noOfMachines: 450,
    moq: 1000,
    leadTimeDays: 30,
    exportMarkets: ['USA', 'Germany', 'France', 'UK'],
    location: 'Tirupur, Tamil Nadu'
  },
  {
    id: 'comp_delhi',
    name: 'Delhi Woven Mills Ltd.',
    type: 'supplier',
    country: 'India',
    contactEmail: 'sourcing@delhiwoven.com',
    logo: '🪡',
    rating: 4.5,
    trustScore: 89,
    certifications: ['BSCI', 'GOTS (Organic)', 'ISO 9001', 'SEDEX'],
    productCategories: ['Woven Dress', 'Shirts', 'Womenswear', 'Denim'],
    stitchingCapacityPerDay: 15000,
    noOfMachines: 320,
    moq: 1500,
    leadTimeDays: 45,
    exportMarkets: ['USA', 'Spain', 'Italy', 'Australia'],
    location: 'Noida (Delhi NCR), Uttar Pradesh'
  },
  {
    id: 'comp_jaipur',
    name: 'Jaipur Block & Ethnic wear',
    type: 'supplier',
    country: 'India',
    contactEmail: 'info@jaipurethnic.com',
    logo: '🎨',
    rating: 4.3,
    trustScore: 85,
    certifications: ['GOTS', 'Fair Trade', 'ISO 14001'],
    productCategories: ['Ethnicwear', 'Home Textiles', 'Hand Block Prints'],
    stitchingCapacityPerDay: 8000,
    noOfMachines: 120,
    moq: 500,
    leadTimeDays: 40,
    exportMarkets: ['France', 'Japan', 'USA'],
    location: 'Jaipur, Rajasthan'
  },
  {
    id: 'comp_kolkata',
    name: 'Kolkata Kidswear Ltd.',
    type: 'supplier',
    country: 'India',
    contactEmail: 'support@kolkatakids.in',
    logo: '👶',
    rating: 4.6,
    trustScore: 91,
    certifications: ['BSCI', 'OEKO-Tex', 'SEDEX'],
    productCategories: ['Kidswear', 'Knits', 'Baby Rompers'],
    stitchingCapacityPerDay: 18000,
    noOfMachines: 280,
    moq: 800,
    leadTimeDays: 35,
    exportMarkets: ['UK', 'USA', 'South America'],
    location: 'Kolkata, West Bengal'
  },
  {
    id: 'comp_ludhiana',
    name: 'Ludhiana Active Sportswear',
    type: 'supplier',
    country: 'India',
    contactEmail: 'sales@ludhianaactive.co.in',
    logo: '🏃',
    rating: 4.4,
    trustScore: 87,
    certifications: ['SEDEX', 'ISO 9001'],
    productCategories: ['Sportswear', 'Sweaters', 'Polyester Wear'],
    stitchingCapacityPerDay: 12000,
    noOfMachines: 210,
    moq: 1000,
    leadTimeDays: 30,
    exportMarkets: ['Europe', 'Canada'],
    location: 'Ludhiana, Punjab'
  },
  {
    id: 'comp_zara',
    name: 'Inditex (Zara Group)',
    type: 'buyer',
    country: 'Spain',
    contactEmail: 'sourcing@inditex.com',
    logo: '👗',
    rating: 5.0,
    trustScore: 98,
    certifications: [],
    productCategories: [],
    stitchingCapacityPerDay: 0,
    noOfMachines: 0,
    moq: 0,
    leadTimeDays: 0,
    exportMarkets: [],
    location: 'Arteixo, Spain'
  },
  {
    id: 'comp_target',
    name: 'Target Sourcing Corp',
    type: 'buyer',
    country: 'USA',
    contactEmail: 'apparel.sourcing@target.com',
    logo: '🎯',
    rating: 4.9,
    trustScore: 97,
    certifications: [],
    productCategories: [],
    stitchingCapacityPerDay: 0,
    noOfMachines: 0,
    moq: 0,
    leadTimeDays: 0,
    exportMarkets: [],
    location: 'Minneapolis, Minnesota, USA'
  }
];

// Mock Users
const mockUsers: UserProfile[] = [
  {
    id: 'usr_buyer1',
    name: 'Rajneesh Sengupta',
    email: 'rajneesh9786@gmail.com',
    role: 'buyer',
    companyId: 'comp_target',
    companyName: 'Target Sourcing Corp',
    createdAt: '2026-01-10T12:00:00Z'
  },
  {
    id: 'usr_supplier1',
    name: 'Karthik Subramanian',
    email: 'karthik@tirupurknits.in',
    role: 'supplier',
    companyId: 'comp_tirupur',
    companyName: 'Tirupur Prime Knits',
    createdAt: '2026-01-12T09:30:00Z'
  },
  {
    id: 'usr_qa1',
    name: 'Suresh Kumar',
    email: 'suresh@sgslab.in',
    role: 'qa',
    companyId: 'comp_sgs',
    companyName: 'SGS Inspection Services',
    createdAt: '2026-02-01T11:00:00Z'
  }
];

// Define Default standard stages
const createDefaultStages = (styleName: string, orderDateStr: string, deliveryDateStr: string): ProductionStage[] => {
  const oDate = new Date(orderDateStr);
  const dDate = new Date(deliveryDateStr);
  const totalDays = Math.ceil((dDate.getTime() - oDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const addDays = (d: Date, days: number): string => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res.toISOString().split('T')[0];
  };

  const segment = Math.floor(totalDays / 8);

  return [
    { name: 'Fabric Sourcing', status: 'completed', plannedStart: orderDateStr, plannedEnd: addDays(oDate, segment), actualStart: orderDateStr, actualEnd: addDays(oDate, segment - 1), completedQty: 100, progress: 100, notes: 'Yarn acquired; knitting completed on circular looms.' },
    { name: 'Fabric Inspection', status: 'completed', plannedStart: addDays(oDate, segment), plannedEnd: addDays(oDate, segment * 2), actualStart: addDays(oDate, segment), actualEnd: addDays(oDate, segment * 2 + 1), completedQty: 100, progress: 100, notes: 'Shrinkage test and shade band matching approved by team.' },
    { name: 'Cutting', status: 'completed', plannedStart: addDays(oDate, segment * 2), plannedEnd: addDays(oDate, segment * 3), actualStart: addDays(oDate, segment * 2 + 1), actualEnd: addDays(oDate, segment * 3 - 1), completedQty: 100, progress: 100, notes: 'Automated CAD cutting completed with zero nesting wastage.' },
    { name: 'Printing / Embroidery', status: 'completed', plannedStart: addDays(oDate, segment * 3), plannedEnd: addDays(oDate, segment * 4), actualStart: addDays(oDate, segment * 3 - 1), actualEnd: addDays(oDate, segment * 4), completedQty: 100, progress: 100, notes: 'Environment friendly pigment print applied.' },
    { name: 'Sewing', status: 'in_progress', plannedStart: addDays(oDate, segment * 4), plannedEnd: addDays(oDate, segment * 6), actualStart: addDays(oDate, segment * 4 + 1), completedQty: 45, progress: 45, notes: '4500 garments completed. Inline inspection ongoing on Line 4.' },
    { name: 'Finishing', status: 'pending', plannedStart: addDays(oDate, segment * 6), plannedEnd: addDays(oDate, segment * 7), completedQty: 0, progress: 0 },
    { name: 'Quality Inspection', status: 'pending', plannedStart: addDays(oDate, segment * 7), plannedEnd: addDays(oDate, segment * 7.5), completedQty: 0, progress: 0 },
    { name: 'Packing', status: 'pending', plannedStart: addDays(oDate, segment * 7.5), plannedEnd: addDays(oDate, segment * 8), completedQty: 0, progress: 0 },
    { name: 'Shipment', status: 'pending', plannedStart: addDays(oDate, segment * 8), plannedEnd: deliveryDateStr, completedQty: 0, progress: 0 }
  ];
};

// Initial Mock Purchase Orders
let mockOrders: PurchaseOrder[] = [
  {
    id: 'po_123',
    poNumber: 'PO-75912',
    styleName: "Women's Summer Dress",
    buyerCompanyId: 'comp_target',
    buyerCompanyName: 'Target Sourcing Corp',
    supplierCompanyId: 'comp_tirupur',
    supplierCompanyName: 'Tirupur Prime Knits',
    orderQty: 10000,
    producedQty: 4500,
    unitPrice: 5.50,
    orderDate: '2026-05-01',
    deliveryDate: '2026-06-15',
    status: 'In Production',
    fabricType: 'Single Jersey Organic Cotton (160 GSM)',
    color: 'Pacific Aqua Blue',
    sizeRange: 'S - XL',
    stages: [], // Will be filled below
    materials: {
      fabric: 'Received',
      buttons: 'Received',
      zippers: 'Received',
      labels: 'Received'
    },
    qualityReports: [
      {
        id: 'rep_1',
        inspectorName: 'Suresh Kumar (SGS)',
        inspectionDate: '2026-05-18',
        type: 'Inline',
        sampleSize: 500,
        defectsCount: 8,
        defectRate: 1.6,
        result: 'Pass',
        comments: 'Excellent stitch tension and clean side seams. Handled with good care. No major oil stains found.',
        defectBreakdown: { 'Stitching tension': 3, 'Measurement margin': 2, 'Loose thread': 3 }
      }
    ],
    chat: [
      { id: 'm1', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hello Karthik, please share the pre-production sample photos for approval.', timestamp: '2026-05-03T10:00:00Z' },
      { id: 'm2', senderId: 'usr_supplier1', senderName: 'Karthik Subramanian', senderRole: 'supplier', message: 'Hi Rajneesh, I have uploaded the PP sample images. The fabric handfeel is extremely soft and matches your custom Pantone color specification.', timestamp: '2026-05-03T11:45:00Z', attachmentName: 'pp_sample_front.jpg', attachmentUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop' },
      { id: 'm3', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Approved! Please proceed to cutting instantly. Keep us uploaded on fabric arrival status.', timestamp: '2026-05-04T08:30:00Z' },
      { id: 'm4', senderId: 'usr_supplier1', senderName: 'Karthik Subramanian', senderRole: 'supplier', message: 'Perfect, fabric sourcing and inspection is 100% completed. We initiated bulk sewing today on Line 4.', timestamp: '2026-05-11T14:00:00Z' }
    ],
    confidenceScore: 92
  },
  {
    id: 'po_456',
    poNumber: 'PO-58241',
    styleName: "Slimfit Mens Woven Shirt",
    buyerCompanyId: 'comp_target',
    buyerCompanyName: 'Target Sourcing Corp',
    supplierCompanyId: 'comp_delhi',
    supplierCompanyName: 'Delhi Woven Mills Ltd.',
    orderQty: 5000,
    producedQty: 0,
    unitPrice: 7.20,
    orderDate: '2026-05-10',
    deliveryDate: '2026-06-25',
    status: 'Delayed',
    fabricType: 'Oxford Weave Premium Cotton (130 GSM)',
    color: 'Classic White & Blue Stripes',
    sizeRange: 'M - XXL',
    stages: [],
    materials: {
      fabric: 'Delayed',
      buttons: 'Received',
      zippers: 'Pending',
      labels: 'Received'
    },
    qualityReports: [],
    chat: [
      { id: 'c41', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hi Team, order tracking shows fabric sourcing remains delayed. What is the hold up?', timestamp: '2026-05-20T09:00:00Z' },
      { id: 'c42', senderId: 'usr_supplier1', senderName: 'Supplier Support', senderRole: 'supplier', message: 'Apologies Rajneesh, the imported Oxford weave fabric cargo is currently stuck at customs clearance in Mumbai port. Sourcing team is working on expediting. We expect it to reach our Delhi Noida unit in 3 days.', timestamp: '2026-05-20T11:20:00Z' }
    ],
    confidenceScore: 68
  },
  {
    id: 'po_789',
    poNumber: 'PO-32149',
    styleName: "Organic Baby Rompers (Pack of 3)",
    buyerCompanyId: 'comp_target',
    buyerCompanyName: 'Target Sourcing Corp',
    supplierCompanyId: 'comp_kolkata',
    supplierCompanyName: 'Kolkata Kidswear Ltd.',
    orderQty: 8000,
    producedQty: 0,
    unitPrice: 4.80,
    orderDate: '2026-05-05',
    deliveryDate: '2026-06-20',
    status: 'In Production',
    fabricType: 'Organic Bamboo Cotton Knit (180 GSM)',
    color: 'Assorted Pastel Solids',
    sizeRange: '0 - 18 Months',
    stages: [],
    materials: {
      fabric: 'Received',
      buttons: 'Received',
      zippers: 'Received',
      labels: 'Received'
    },
    qualityReports: [
      {
        id: 'rep_789_1',
        inspectorName: 'Anil Gupta (Intertek)',
        inspectionDate: '2026-05-22',
        type: 'Inline',
        sampleSize: 200,
        defectsCount: 15,
        defectRate: 7.5,
        result: 'Fail',
        comments: 'Warning: Fabric tested poor color fastness score (Rating 2/5 under washing cycle). Color bled on white test patch. Supplier must do rework instantly.',
        defectBreakdown: { 'Color Bleeding': 9, 'Uneven stitching': 4, 'Label mismatch': 2 }
      }
    ],
    chat: [
      { id: 'c71', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hello, the Intertek report uploaded yesterday shows a Color Fastness failure! We cannot accept babies garments that bleed color.', timestamp: '2026-05-23T07:15:00Z' },
      { id: 'c72', senderId: 'usr_supplier1', senderName: 'Ramesh Sen', senderRole: 'supplier', message: 'Hi Rajneesh, yes we took immediate action. We stopped stitching lines, and are applying a specialized non-toxic organic dye fixing agent to wash and correct all bulk fabric rolls. This is 100% safe and will prevent both color bleeding and shrinkage. We will submit a fresh test report by next Tuesday.', timestamp: '2026-05-23T10:45:00Z' }
    ],
    confidenceScore: 55
  },
  {
    id: 'po_234',
    poNumber: 'PO-10903',
    styleName: "Classic Heavyweight Denim Jackets",
    buyerCompanyId: 'comp_target',
    buyerCompanyName: 'Target Sourcing Corp',
    supplierCompanyId: 'comp_delhi',
    supplierCompanyName: 'Delhi Woven Mills Ltd.',
    orderQty: 3000,
    producedQty: 3000,
    unitPrice: 12.50,
    orderDate: '2026-04-01',
    deliveryDate: '2026-05-30',
    status: 'On Water',
    fabricType: 'Heavy Denim Canvas (14 Oz)',
    color: 'Indigo Stone Wash',
    sizeRange: 'S - XXL',
    stages: [],
    materials: {
      fabric: 'Received',
      buttons: 'Received',
      zippers: 'Received',
      labels: 'Received'
    },
    qualityReports: [
      {
        id: 'rep_234_1',
        inspectorName: 'Bureau Veritas',
        inspectionDate: '2026-05-10',
        type: 'Final',
        sampleSize: 800,
        defectsCount: 5,
        defectRate: 0.625,
        result: 'Pass',
        comments: 'Excellent denim wash structure, stonewashed patina has natural variation. AQL level 1.5 strictly cleared. Goods packed in secure polythene containers.',
        defectBreakdown: { 'Measurement deviation': 3, 'Loose thread': 2 }
      }
    ],
    chat: [
      { id: 'c21', senderId: 'usr_supplier1', senderName: 'Delhi Mills Sales', senderRole: 'supplier', message: 'The container has been loaded in Vessel MSC Olivia and cleared Mumbai customs!', timestamp: '2026-05-18T11:00:00Z' }
    ],
    confidenceScore: 98,
    vesselName: 'MSC Olivia',
    containerNo: 'MSCU-981245-0',
    etd: '2026-05-20',
    eta: '2026-06-10',
    shipmentStatus: 'On Water - Transit normal in Arabian Sea'
  }
];

// Initialize mock PO stages
mockOrders.forEach(order => {
  order.stages = createDefaultStages(order.styleName, order.orderDate, order.deliveryDate);
  // Custom adjust state for specific POs
  if (order.id === 'po_456') {
    // Delhi mens shirt - delayed at fabric stage
    order.stages[0].status = 'delayed';
    order.stages[0].notes = 'Held at customs clearance in Mumbai. Awaiting release certificate.';
    order.stages[1].status = 'pending';
    order.stages[2].status = 'pending';
    order.stages[3].status = 'pending';
    order.stages[4].status = 'pending';
  } else if (order.id === 'po_789') {
    // Kolkata rompers - failed quality check at fabric testing
    order.stages[0].status = 'completed';
    order.stages[1].status = 'delayed'; // Fab inspection failed color fastness
    order.stages[1].notes = 'Initial batch failed Color Fastness wash. Specialized fixative treatment ongoing.';
    order.stages[2].status = 'pending';
    order.stages[3].status = 'pending';
    order.stages[4].status = 'pending';
  } else if (order.id === 'po_234') {
    // Denim jackets - shipped
    order.stages.forEach(st => {
      st.status = 'completed';
      st.progress = 100;
    });
    order.stages[8].status = 'in_progress';
    order.stages[8].notes = 'Shipped via Sea Cargo. Vessel heading to Port of Newark, USA.';
  }
});

// Mock Notifications / Alerts
let mockNotifications: AlertNotification[] = [
  {
    id: 'n_456',
    poId: 'po_456',
    poNumber: 'PO-58241',
    type: 'material',
    severity: 'critical',
    message: 'Fabric Delivery Delayed - Oxford cotton stuck at Mumbai customs port.',
    timestamp: '2026-05-20T11:20:00Z',
    isRead: false
  },
  {
    id: 'n_789',
    poId: 'po_789',
    poNumber: 'PO-32149',
    type: 'quality',
    severity: 'critical',
    message: 'Color Fastness Test Failed - Rompers batch bled in industrial wash check.',
    timestamp: '2026-05-22T07:15:00Z',
    isRead: false
  },
  {
    id: 'n_info1',
    poId: 'po_123',
    poNumber: 'PO-75912',
    type: 'info',
    severity: 'info',
    message: 'Inline inspection report uploaded successfully by Suresh Kumar (SGS) - Status Pass.',
    timestamp: '2026-05-18T16:45:00Z',
    isRead: true
  }
];

// Mock RFQs
let mockRFQs: RFQRequirement[] = [
  {
    id: 'rfq_1',
    styleName: 'Pique Cotton Summer Polo Shirts',
    productCategory: 'Knits',
    targetPrice: 3.80,
    orderQty: 15000,
    fabricType: 'Cotton Pique (220 GSM)',
    leadTimeDays: 35,
    buyerCompanyName: 'Target Sourcing Corp',
    createdAt: '2026-05-26T10:00:00Z',
    status: 'Open'
  },
  {
    id: 'rfq_2',
    styleName: 'Womens Boho Linen Trousers',
    productCategory: 'Woven Dress',
    targetPrice: 8.50,
    orderQty: 5000,
    fabricType: '100% Natural Linen (150 GSM)',
    leadTimeDays: 45,
    buyerCompanyName: 'Target Sourcing Corp',
    createdAt: '2026-05-28T14:30:00Z',
    status: 'Quoted'
  }
];

let currentUser: UserProfile = mockUsers[0]; // Rajneesh (Buyer) by default

// -----------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Auth / Profiles
app.get('/api/auth/profile', (req, res) => {
  res.json({ user: currentUser });
});

app.post('/api/auth/login', (req, res) => {
  const { role, email } = req.body;
  const user = mockUsers.find(u => u.role === role) || mockUsers[0];
  currentUser = user;
  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, companyName, companyId } = req.body;
  const newUser: UserProfile = {
    id: 'usr_' + Date.now(),
    name,
    email,
    role,
    companyId: companyId || 'comp_new',
    companyName: companyName || 'New Venture Ltd',
    createdAt: new Date().toISOString()
  };
  mockUsers.push(newUser);
  currentUser = newUser;
  
  // If company doesn't exist, create it
  if (!mockCompanies.find(c => c.id === companyId)) {
    const newComp: CompanyInfo = {
      id: companyId || 'comp_new',
      name: companyName,
      type: role === 'buyer' ? 'buyer' : 'supplier',
      country: role === 'buyer' ? 'USA' : 'India',
      contactEmail: email,
      logo: role === 'buyer' ? '💼' : '🏭',
      rating: 5.0,
      trustScore: 90,
      certifications: ['ISO 9001'],
      productCategories: ['General Apparels'],
      stitchingCapacityPerDay: role === 'buyer' ? 0 : 5000,
      noOfMachines: role === 'buyer' ? 0 : 50,
      moq: role === 'buyer' ? 0 : 500,
      leadTimeDays: role === 'buyer' ? 0 : 30,
      exportMarkets: ['Global'],
      location: 'New Delhi, India'
    };
    mockCompanies.push(newComp);
  }

  res.json({ success: true, user: currentUser });
});

// Companies / Factories Directory
app.get('/api/companies', (req, res) => {
  res.json({ companies: mockCompanies });
});

// RFQs Sourcing Module
app.get('/api/rfqs', (req, res) => {
  res.json({ rfqs: mockRFQs });
});

app.post('/api/rfqs', (req, res) => {
  const { styleName, productCategory, targetPrice, orderQty, fabricType, leadTimeDays } = req.body;
  const newRfq: RFQRequirement = {
    id: 'rfq_' + Date.now(),
    styleName,
    productCategory,
    targetPrice: parseFloat(targetPrice),
    orderQty: parseInt(orderQty),
    fabricType,
    leadTimeDays: parseInt(leadTimeDays),
    buyerCompanyName: currentUser.companyName,
    createdAt: new Date().toISOString(),
    status: 'Open'
  };
  mockRFQs.push(newRfq);
  res.json({ success: true, rfq: newRfq });
});

// Purchase Orders endpoints
app.get('/api/orders', (req, res) => {
  // If currentUser is supplier, only show POs for that supplier
  if (currentUser.role === 'supplier') {
    const supplierOrders = mockOrders.filter(o => o.supplierCompanyId === currentUser.companyId);
    return res.json({ orders: supplierOrders });
  }
  // Otherwise show all
  res.json({ orders: mockOrders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});

app.post('/api/orders', (req, res) => {
  const { styleName, supplierCompanyId, orderQty, unitPrice, fabricType, color, sizeRange, deliveryDate } = req.body;
  const supplier = mockCompanies.find(c => c.id === supplierCompanyId);
  if (!supplier) {
    return res.status(400).json({ error: 'Selected supplier not found' });
  }

  const newOrder: PurchaseOrder = {
    id: 'po_' + Date.now(),
    poNumber: 'PO-' + Math.floor(10000 + Math.random() * 90000),
    styleName,
    buyerCompanyId: currentUser.companyId,
    buyerCompanyName: currentUser.companyName,
    supplierCompanyId: supplier.id,
    supplierCompanyName: supplier.name,
    orderQty: parseInt(orderQty),
    producedQty: 0,
    unitPrice: parseFloat(unitPrice),
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate,
    status: 'In Production',
    fabricType,
    color,
    sizeRange,
    materials: {
      fabric: 'Pending',
      buttons: 'Pending',
      zippers: 'Pending',
      labels: 'Pending'
    },
    stages: [],
    qualityReports: [],
    chat: [
      {
        id: 'msg_init',
        senderId: 'system',
        senderName: 'TexTrack Sourcing',
        senderRole: 'admin',
        message: `Purchase Order created by ${currentUser.name}. Stage tracking initialized. Setup fabric sourcing parameters to proceed.`,
        timestamp: new Date().toISOString()
      }
    ],
    confidenceScore: 100
  };

  newOrder.stages = createDefaultStages(styleName, newOrder.orderDate, deliveryDate);
  mockOrders.push(newOrder);

  // Generate a system notification
  mockNotifications.unshift({
    id: 'not_' + Date.now(),
    poId: newOrder.id,
    poNumber: newOrder.poNumber,
    type: 'info',
    severity: 'info',
    message: `New Purchase Order ${newOrder.poNumber} created by ${currentUser.companyName}`,
    timestamp: new Date().toISOString(),
    isRead: false
  });

  res.json({ success: true, order: newOrder });
});

// Helper to recalculate order progress & confidence score
const updateOrderMetadata = (order: PurchaseOrder) => {
  // Progress is calculated as average progress of stages
  const activeStages = order.stages.filter(s => s.status === 'completed' || s.status === 'in_progress');
  const finishedStages = order.stages.filter(s => s.status === 'completed');
  
  let overallProgress = 0;
  if (order.stages.length > 0) {
    const totalProgressVal = order.stages.reduce((sum, st) => sum + st.progress, 0);
    overallProgress = Math.round(totalProgressVal / order.stages.length);
  }
  
  // Calculate producedQty based on sewing stage progress
  const sewingStage = order.stages.find(s => s.name === 'Sewing');
  if (sewingStage) {
    order.producedQty = Math.round((sewingStage.progress / 100) * order.orderQty);
  }

  // Calculate overall confidence score using our smart algorithm
  let score = 100;
  
  // Subtract for any delayed stages
  const delayedStagesCount = order.stages.filter(s => s.status === 'delayed').length;
  score -= (delayedStagesCount * 15);

  // Subtract for material delays
  if (order.materials.fabric === 'Delayed') score -= 15;
  if (order.materials.buttons === 'Delayed') score -= 5;
  if (order.materials.zippers === 'Delayed') score -= 5;
  if (order.materials.labels === 'Delayed') score -= 5;

  // Subtract heavily for failing inspection report
  const hasFailedInspection = order.qualityReports.some(r => r.result === 'Fail');
  if (hasFailedInspection) score -= 30;

  // Clamp score
  order.confidenceScore = Math.max(10, Math.min(100, score));

  // Auto set state if complete
  const packingStage = order.stages.find(s => s.name === 'Packing');
  const shipmentStage = order.stages.find(s => s.name === 'Shipment');
  
  if (shipmentStage?.status === 'completed') {
    order.status = 'Completed';
  } else if (shipmentStage?.status === 'in_progress') {
    order.status = 'On Water';
  } else if (packingStage?.status === 'completed') {
    order.status = 'Ready to Ship';
  } else if (delayedStagesCount > 0 || order.confidenceScore < 60) {
    order.status = 'Delayed';
  } else {
    order.status = 'In Production';
  }
};

// Update order stages (Supplier Action)
app.post('/api/orders/:id/stages', (req, res) => {
  const { stageName, status, progress, completedQty, notes, photoUrl } = req.body;
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const stage = order.stages.find(s => s.name === stageName);
  if (!stage) {
    return res.status(400).json({ error: 'Stage not found' });
  }

  // Update specific parameters
  stage.status = status;
  stage.progress = parseInt(progress);
  stage.completedQty = parseInt(completedQty);
  if (notes) stage.notes = notes;
  if (photoUrl) stage.photoUrl = photoUrl;

  // Handle timestamps
  if (status === 'in_progress' && !stage.actualStart) {
    stage.actualStart = new Date().toISOString().split('T')[0];
  }
  if (status === 'completed') {
    stage.progress = 100;
    stage.actualEnd = new Date().toISOString().split('T')[0];
  }

  updateOrderMetadata(order);

  // If status changed to delayed, trigger delay notification
  if (status === 'delayed') {
    mockNotifications.unshift({
      id: 'not_' + Date.now(),
      poId: order.id,
      poNumber: order.poNumber,
      type: 'delay',
      severity: 'warning',
      message: `${stageName} reported DELAYED on ${order.poNumber}. Supplier Note: ${notes || 'No notes provided.'}`,
      timestamp: new Date().toISOString(),
      isRead: false
    });
  }

  res.json({ success: true, order });
});

// Update material statuses
app.post('/api/orders/:id/materials', (req, res) => {
  const { fabric, buttons, zippers, labels } = req.body;
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (fabric) order.materials.fabric = fabric;
  if (buttons) order.materials.buttons = buttons;
  if (zippers) order.materials.zippers = zippers;
  if (labels) order.materials.labels = labels;

  updateOrderMetadata(order);
  res.json({ success: true, order });
});

// Submission of Quality Inspection (QA Action)
app.post('/api/orders/:id/inspections', (req, res) => {
  const { inspectorName, type, sampleSize, defectsCount, result, comments, defectBreakdown } = req.body;
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const defectRate = parseFloat(((defectsCount / sampleSize) * 100).toFixed(2));
  
  const newReport: QualityReport = {
    id: 'rep_' + Date.now(),
    inspectorName,
    inspectionDate: new Date().toISOString().split('T')[0],
    type,
    sampleSize: parseInt(sampleSize),
    defectsCount: parseInt(defectsCount),
    defectRate,
    result,
    comments,
    defectBreakdown: defectBreakdown || {}
  };

  order.qualityReports.unshift(newReport);
  updateOrderMetadata(order);

  // Generate warning notification if inspection failed
  if (result === 'Fail') {
    mockNotifications.unshift({
      id: 'not_' + Date.now(),
      poId: order.id,
      poNumber: order.poNumber,
      type: 'quality',
      severity: 'critical',
      message: `CRITICAL: ${type} Quality Inspection failed on ${order.poNumber}. Defect rate is ${defectRate}%!`,
      timestamp: new Date().toISOString(),
      isRead: false
    });
  } else {
    mockNotifications.unshift({
      id: 'not_' + Date.now(),
      poId: order.id,
      poNumber: order.poNumber,
      type: 'quality',
      severity: 'info',
      message: `${type} Quality Inspection successfully passed for ${order.poNumber}`,
      timestamp: new Date().toISOString(),
      isRead: false
    });
  }

  res.json({ success: true, order });
});

// Communication Chat routes per PO
app.get('/api/orders/:id/chat', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ chat: order.chat });
});

app.post('/api/orders/:id/chat', async (req, res) => {
  const { message, attachmentName, attachmentUrl } = req.body;
  const order = mockOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const newMsg: ChatMessage = {
    id: 'msg_' + Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    message,
    timestamp: new Date().toISOString(),
    attachmentName,
    attachmentUrl
  };

  order.chat.push(newMsg);

  // OPTIONAL AUTO-GEN AI REPLY IN CHAT!
  // If buyer sends a message, have Sourcing Genius AI or the factory supplier auto-reply with a smart Gemini powered answer!
  if (currentUser.role === 'buyer') {
    const gemini = getGemini();
    if (gemini) {
      try {
        const promptContext = `
          You are acting as the factory supplier coordinator / lead merchandiser at "${order.supplierCompanyName}" in India.
          You are in an order specific chatroom with the buyer group "${order.buyerCompanyName}".
          Order Style: "${order.styleName}"
          Order Details: Quantity: ${order.orderQty}, Fabric: ${order.fabricType}, Color: ${order.color}.
          Current status of garments completed: ${order.producedQty} items.
          The buyer rajneesh said: "${message}"

          Respond politely and professionally as the Indian supplier coordinator (e.g. Karthick or Ramesh). 
          Keep your answer concise (under 100 words), technical, reassuring, and realistic about Indian sourcing cycles. Be helpful.
        `;

        const aiResponse = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: promptContext,
        });

        if (aiResponse.text) {
          order.chat.push({
            id: 'msg_ai_' + Date.now(),
            senderId: 'usr_supplier1',
            senderName: `${order.supplierCompanyName} Merchandise Lead`,
            senderRole: 'supplier',
            message: aiResponse.text.trim(),
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Gemini chat helper error:", err);
      }
    } else {
      // Fallback simple automated reply
      setTimeout(() => {
        order.chat.push({
          id: 'msg_auto_' + Date.now(),
          senderId: 'usr_supplier1',
          senderName: `${order.supplierCompanyName} Bot`,
          senderRole: 'supplier',
          message: `Thank you for your message. Sourcing team has received your comment: "${message}". We are analyzing with our shopfloor supervisors and will update the timeline or submit relevant approvals as soon as possible.`,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    }
  }

  res.json({ success: true, chat: order.chat });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json({ notifications: mockNotifications });
});

app.post('/api/notifications/read-all', (req, res) => {
  mockNotifications.forEach(n => n.isRead = true);
  res.json({ success: true });
});

// -----------------------------------------------------
// SOURCING GENIUS AI COMPANION / COPILOT ROUTE
// -----------------------------------------------------
app.post('/api/gen-ai/sourcing-assistant', async (req, res) => {
  const { prompt, currentContextPoId } = req.body;
  const gemini = getGemini();

  if (!gemini) {
    // If no API key, return a mock response that demonstrates smartness but advises setup
    return res.json({
      answer: `### 🤖 Sourcing Genius AI Companion
      
      *No active GEMINI_API_KEY detected in Secrets panel. Running in offline demo mode.*
      
      Here is how I would recommend addressing your query based on built-in garment-sourcing rules:
      
      #### Recommendation on: "${prompt}"
      - **Supplier Matching**: For knits (like Polo/T-Shirts), **Tirupur Prime Knits** has the highest trustscore (**94%**), BSCI certification and 25k daily capacity. For woven garments (like oxford shirts), utilize **Delhi Woven Mills**.
      - **Lead times**: Indian cotton suppliers require on average **30-45 days** total execution timeline from PP sample approval.
      - **Action Checklist**:
        1. Establish precise tech-packs including GSM, shrinkage tolerance, and AQL limits (recommend AQL 1.5).
        2. Book inline QA audits around **60% completion stage** (during sewing) to catch any loose thread issues before cutting finishing thread.
        3. Release final commercial invoice funds only when pre-shipment container photos and Bill of Lading (BL) copies are uploaded.
        
      *To activate full AI integration with real-time analytics, configure your \`GEMINI_API_KEY\` in your local environments or AI Studio Secrets panel.*`
    });
  }

  try {
    let focusOrderContext = "";
    if (currentContextPoId) {
      const order = mockOrders.find(o => o.id === currentContextPoId);
      if (order) {
        focusOrderContext = `The buyer is currently viewing a specific Order: 
        PO Number: ${order.poNumber}
        Style: ${order.styleName}
        Supplier: ${order.supplierCompanyName}
        Color: ${order.color}, Fabric: ${order.fabricType}
        Qty: ${order.orderQty}, Current produced: ${order.producedQty}
        Current Status: ${order.status}
        Confidence Score: ${order.confidenceScore}%
        Current Material States: Fabric is ${order.materials.fabric}, Buttons: ${order.materials.buttons}, zippers: ${order.materials.zippers}
        Quality Inspection results count: ${order.qualityReports.length}`;
      }
    }

    const systemPrompt = `
      You are "Sourcing Genius AI", a brilliant apparel sourcing co-pilot and expert consultant on Indian clothing factories, textile testing, supply chain risk management, and international logistics.
      
      You assist both global buyers and Indian suppliers looking to run efficient B2B garment sourcing.
      You are highly technical, professional, objective, and understand Indian geographical hubs (e.g. Tirupur for Knits, Delhi NCR for Woven, Jaipur for Block Prints/Ethnic, Ludhiana for sportswear).
      
      Context data of currently onboarded Indian factories:
      ${JSON.stringify(mockCompanies.filter(c => c.type === 'supplier'))}
      
      Active Purchase Orders Context:
      ${JSON.stringify(mockOrders.map(o => ({ id: o.id, poNum: o.poNumber, style: o.styleName, status: o.status, score: o.confidenceScore, supplier: o.supplierCompanyName })))}
      
      ${focusOrderContext}
      
      Provide a highly detailed, beautifully structured markdown reply. Answer their query elegantly. Direct them towards specific factories or order interventions if relevant. Do not mention system-prompt variables or internal JSON formats.
    `;

    const response = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({
      answer: response.text || "Sorry, I spent too long thinking and couldn't formulate a suggestion. Let's retry!"
    });

  } catch (error: any) {
    console.error("Gemini API Error in Sourcing Assistant:", error);
    res.status(500).json({ error: 'AI Assistant failed: ' + error?.message });
  }
});


// -----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// -----------------------------------------------------

async function startServer() {
  // Setup Express + Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TexTrack Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
