/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { companyService } from './src/services/companyService';
import { orderService } from './src/services/orderService';
import { rfqService } from './src/services/rfqService';
import { notificationService } from './src/services/notificationService';
import { 
  UserProfile, 
  CompanyInfo, 
  PurchaseOrder, 
  AlertNotification, 
  ChatMessage, 
  ProductionStage, 
  QualityReport,
  RFQRequirement,
  POTask,
  TNAEvent,
  PODocument,
  Quotation
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
// STATE IN CLOUD (Users are resolved via Firestore)
// -----------------------------------------------------
let currentUser: UserProfile = {
  id: 'usr_buyer1',
  name: 'Rajneesh Sengupta',
  email: 'rajneesh9786@gmail.com',
  role: 'buyer',
  companyId: 'comp_target',
  companyName: 'Target Sourcing Corp',
  createdAt: '2026-01-10T12:00:00Z'
};

// Seed initial system users inside Firestore
async function seedUsersIfNeeded() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    if (snapshot.empty) {
      console.log('[Seeding] Seeding global mock users...');
      const defaultUsers: UserProfile[] = [
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
      for (const u of defaultUsers) {
        await setDoc(doc(db, 'users', u.id), u);
      }
    }
  } catch (err) {
    console.error('Error seeding users:', err);
  }
}

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { role } = req.body;
    const snapshot = await getDocs(collection(db, 'users'));
    const allUsers: UserProfile[] = [];
    snapshot.forEach(docSnap => {
      allUsers.push(docSnap.data() as UserProfile);
    });
    const user = allUsers.find(u => u.role === role) || allUsers[0];
    if (user) {
      currentUser = user;
    }
    res.json({ success: true, user: currentUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, role, companyName, companyId } = req.body;
    const finalCompId = companyId || 'comp_new_' + Date.now();
    
    const newUser: UserProfile = {
      id: 'usr_' + Date.now(),
      name,
      email,
      role,
      companyId: finalCompId,
      companyName: companyName || 'New Venture Ltd',
      createdAt: new Date().toISOString()
    };
    
    // Create profile
    await setDoc(doc(db, 'users', newUser.id), newUser);

    // Seed its company profile
    const comps = await companyService.getCompanies();
    if (!comps.find(c => c.id === finalCompId)) {
      const newComp: CompanyInfo = {
        id: finalCompId,
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
        location: 'New Delhi, India',
        monthlyCapacity: 100000,
        currentBookedCapacity: 20000,
        availableCapacity: 80000,
        otd: 90,
        qualityPerformance: 90,
        responseTime: 90,
        repeatOrdersRate: 90,
        auditStatus: 'Verified',
        auditDate: new Date().toISOString().split('T')[0]
      };
      await companyService.createCompany(newComp);
    }

    currentUser = newUser;
    res.json({ success: true, user: currentUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Companies Directory
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await companyService.getCompanies();
    res.json({ companies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// RFQs Sourcing Module
app.get('/api/rfqs', async (req, res) => {
  try {
    const rfqs = await rfqService.getRFQs();
    res.json({ rfqs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rfqs', async (req, res) => {
  try {
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
    await rfqService.createRFQ(newRfq);
    res.json({ success: true, rfq: newRfq });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Negotiations & Quotations
app.get('/api/rfqs/:rfqId/quotations', async (req, res) => {
  try {
    const quotations = await rfqService.getQuotationsForRFQ(req.params.rfqId);
    res.json({ quotations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rfqs/:rfqId/quotations', async (req, res) => {
  try {
    const { supplierCompanyId, supplierCompanyName, quotedPrice, promisedLeadTimeDays, notes } = req.body;
    const quote: Quotation = {
      id: 'quote_' + Date.now(),
      rfqId: req.params.rfqId,
      supplierCompanyId,
      supplierCompanyName,
      quotedPrice: parseFloat(quotedPrice),
      promisedLeadTimeDays: parseInt(promisedLeadTimeDays),
      notes: notes || '',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    await rfqService.addQuotation(quote);
    res.json({ success: true, quotation: quote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rfqs/:rfqId/quotations/:quoteId/award', async (req, res) => {
  try {
    const { rfqId, quoteId } = req.params;
    
    // Find RFQ details
    const rfqs = await rfqService.getRFQs();
    const rfq = rfqs.find(r => r.id === rfqId);
    
    // Find accepted quote details
    const quotes = await rfqService.getQuotationsForRFQ(rfqId);
    const quote = quotes.find(q => q.id === quoteId);

    if (!rfq || !quote) {
      return res.status(400).json({ error: 'RFQ or Quotation record not found' });
    }

    // Award quote
    await rfqService.awardQuotation(rfqId, quoteId);

    // Convert RFQ + Quote dynamically to PO
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + quote.promisedLeadTimeDays);
    const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

    const newOrder: PurchaseOrder = {
      id: 'po_' + Date.now(),
      poNumber: 'PO-' + Math.floor(10000 + Math.random() * 90000),
      styleName: rfq.styleName,
      buyerCompanyId: currentUser.companyId,
      buyerCompanyName: currentUser.companyName,
      supplierCompanyId: quote.supplierCompanyId,
      supplierCompanyName: quote.supplierCompanyName,
      orderQty: rfq.orderQty,
      producedQty: 0,
      unitPrice: quote.quotedPrice,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDateStr,
      status: 'In Production',
      fabricType: rfq.fabricType || 'Cotton Classic Knit',
      color: 'Custom Brand Hue',
      sizeRange: 'M - XL',
      stages: [],
      materials: {
        fabric: 'Pending',
        buttons: 'Pending',
        zippers: 'Pending',
        labels: 'Pending'
      },
      qualityReports: [],
      chat: [
        {
          id: 'msg_init',
          senderId: 'system',
          senderName: 'TexTrack Sourcing',
          senderRole: 'admin',
          message: `Sourcing contract activated! Awarded to ${quote.supplierCompanyName} @ $${quote.quotedPrice.toFixed(2)} units. Progress stages mapped.`,
          timestamp: new Date().toISOString()
        }
      ],
      confidenceScore: 100
    };

    // Construct stages duration segments
    const oDate = new Date(newOrder.orderDate);
    const dDate = new Date(deliveryDateStr);
    const totalDays = Math.ceil((dDate.getTime() - oDate.getTime()) / (1000 * 60 * 60 * 24));
    const addDays = (d: Date, days: number): string => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r.toISOString().split('T')[0];
    };
    const segment = Math.floor(totalDays / 8);

    newOrder.stages = [
      { name: 'Fabric Sourcing', status: 'pending', plannedStart: newOrder.orderDate, plannedEnd: addDays(oDate, segment), completedQty: 0, progress: 0 },
      { name: 'Fabric Inspection', status: 'pending', plannedStart: addDays(oDate, segment), plannedEnd: addDays(oDate, segment * 2), completedQty: 0, progress: 0 },
      { name: 'Cutting', status: 'pending', plannedStart: addDays(oDate, segment * 2), plannedEnd: addDays(oDate, segment * 3), completedQty: 0, progress: 0 },
      { name: 'Printing / Embroidery', status: 'pending', plannedStart: addDays(oDate, segment * 3), plannedEnd: addDays(oDate, segment * 4), completedQty: 0, progress: 0 },
      { name: 'Sewing', status: 'pending', plannedStart: addDays(oDate, segment * 4), plannedEnd: addDays(oDate, segment * 6), completedQty: 0, progress: 0 },
      { name: 'Finishing', status: 'pending', plannedStart: addDays(oDate, segment * 6), plannedEnd: addDays(oDate, segment * 7), completedQty: 0, progress: 0 },
      { name: 'Quality Inspection', status: 'pending', plannedStart: addDays(oDate, segment * 7), plannedEnd: addDays(oDate, segment * 7.5), completedQty: 0, progress: 0 },
      { name: 'Packing', status: 'pending', plannedStart: addDays(oDate, segment * 7.5), plannedEnd: addDays(oDate, segment * 8), completedQty: 0, progress: 0 },
      { name: 'Shipment', status: 'pending', plannedStart: addDays(oDate, segment * 8), plannedEnd: deliveryDateStr, completedQty: 0, progress: 0 }
    ];

    await orderService.createOrder(newOrder, currentUser.id, currentUser.name);

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase Orders endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const supplierId = currentUser.role === 'supplier' ? currentUser.companyId : undefined;
    const orders = await orderService.getOrders(supplierId);
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [tasks, tnaEvents, documents, activityLogs] = await Promise.all([
      orderService.getTasksForOrder(order.id),
      orderService.getTNAEventsForOrder(order.id),
      orderService.getDocumentsForOrder(order.id),
      orderService.getActivityLogs(order.id)
    ]);

    res.json({ 
      order: {
        ...order,
        tasks,
        tnaEvents,
        documents,
        activityLogs
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { styleName, supplierCompanyId, orderQty, unitPrice, fabricType, color, sizeRange, deliveryDate } = req.body;
    const comps = await companyService.getCompanies();
    const supplier = comps.find(c => c.id === supplierCompanyId);

    if (!supplier) {
      return res.status(400).json({ error: 'Selected supplier factoy not found' });
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
          message: `Purchase Order contract initiated by ${currentUser.name}. Calendar, task lines and document center generated.`,
          timestamp: new Date().toISOString()
        }
      ],
      confidenceScore: 100
    };

    // Calculate Stages Date ranges
    const oDate = new Date(newOrder.orderDate);
    const dDate = new Date(deliveryDate);
    const totalDays = Math.ceil((dDate.getTime() - oDate.getTime()) / (1000 * 60 * 60 * 24));
    const addDays = (d: Date, days: number): string => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r.toISOString().split('T')[0];
    };
    const segment = Math.floor(totalDays / 8);

    newOrder.stages = [
      { name: 'Fabric Sourcing', status: 'pending', plannedStart: newOrder.orderDate, plannedEnd: addDays(oDate, segment), completedQty: 0, progress: 0 },
      { name: 'Fabric Inspection', status: 'pending', plannedStart: addDays(oDate, segment), plannedEnd: addDays(oDate, segment * 2), completedQty: 0, progress: 0 },
      { name: 'Cutting', status: 'pending', plannedStart: addDays(oDate, segment * 2), plannedEnd: addDays(oDate, segment * 3), completedQty: 0, progress: 0 },
      { name: 'Printing / Embroidery', status: 'pending', plannedStart: addDays(oDate, segment * 3), plannedEnd: addDays(oDate, segment * 4), completedQty: 0, progress: 0 },
      { name: 'Sewing', status: 'pending', plannedStart: addDays(oDate, segment * 4), plannedEnd: addDays(oDate, segment * 6), completedQty: 0, progress: 0 },
      { name: 'Finishing', status: 'pending', plannedStart: addDays(oDate, segment * 6), plannedEnd: addDays(oDate, segment * 7), completedQty: 0, progress: 0 },
      { name: 'Quality Inspection', status: 'pending', plannedStart: addDays(oDate, segment * 7), plannedEnd: addDays(oDate, segment * 7.5), completedQty: 0, progress: 0 },
      { name: 'Packing', status: 'pending', plannedStart: addDays(oDate, segment * 7.5), plannedEnd: addDays(oDate, segment * 8), completedQty: 0, progress: 0 },
      { name: 'Shipment', status: 'pending', plannedStart: addDays(oDate, segment * 8), plannedEnd: deliveryDate, completedQty: 0, progress: 0 }
    ];

    await orderService.createOrder(newOrder, currentUser.id, currentUser.name);

    await notificationService.createNotification({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update order stages (Supplier Action)
app.post('/api/orders/:id/stages', async (req, res) => {
  try {
    const { stageName, status, progress, completedQty, notes, photoUrl } = req.body;
    const updated = await orderService.updateOrderStages(
      req.params.id, 
      stageName, 
      { status, progress: parseInt(progress), completedQty: parseInt(completedQty), notes, photoUrl },
      currentUser.id,
      currentUser.name
    );
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update material statuses (Supplier Action)
app.post('/api/orders/:id/materials', async (req, res) => {
  try {
    const { fabric, buttons, zippers, labels } = req.body;
    const updated = await orderService.updateOrderMaterials(
      req.params.id,
      { fabric, buttons, zippers, labels },
      currentUser.id,
      currentUser.name
    );
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submission of Quality Inspection (QA Action)
app.post('/api/orders/:id/inspections', async (req, res) => {
  try {
    const { inspectorName, type, sampleSize, defectsCount, result, comments, defectBreakdown } = req.body;
    const updated = await orderService.addInspectionReport(
      req.params.id,
      { 
        inspectorName, 
        type, 
        inspectionDate: new Date().toISOString().split('T')[0],
        sampleSize: parseInt(sampleSize), 
        defectsCount: parseInt(defectsCount), 
        result, 
        comments, 
        defectBreakdown: defectBreakdown || {} 
      },
      currentUser.id,
      currentUser.name
    );
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PO Tasks Center endpoints
app.post('/api/orders/:id/tasks', async (req, res) => {
  try {
    const { title, assignedTo, dueDate } = req.body;
    const task: POTask = {
      id: 'task_' + Date.now(),
      poId: req.params.id,
      title,
      assignedTo,
      dueDate,
      status: 'Pending'
    };
    await orderService.createTask(task);
    
    // Log Activity context
    await orderService.addActivityLog({
      id: 'act_' + Date.now(),
      poId: req.params.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `${currentUser.name} created Task: "${title}" (Assigned: ${assignedTo})`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/tasks/:taskId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await orderService.updateTaskStatus(req.params.taskId, status);

    // Record activity
    await orderService.addActivityLog({
      id: 'act_' + Date.now(),
      poId: req.params.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `${currentUser.name} updated task parameter status to [${status}]`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// TNA calendar Timeline Updates
app.post('/api/orders/:id/tna/:eventId', async (req, res) => {
  try {
    const { plannedDate, actualDate, status } = req.body;
    await orderService.updateTNAEvent(req.params.eventId, { plannedDate, actualDate, status });

    await orderService.addActivityLog({
      id: 'act_' + Date.now(),
      poId: req.params.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `${currentUser.name} updated TNA calendar checkpoint values`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Document Vault uploads
app.post('/api/orders/:id/documents', async (req, res) => {
  try {
    const { type, fileName, fileUrl } = req.body;
    const docMeta: PODocument = {
      id: 'doc_' + Date.now(),
      poId: req.params.id,
      type,
      fileName,
      fileUrl: fileUrl || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString()
    };
    await orderService.uploadDocument(docMeta);

    // Log Activity context
    await orderService.addActivityLog({
      id: 'act_' + Date.now(),
      poId: req.params.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `${currentUser.name} uploaded ${type}: "${fileName}" to the PO Document Center`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, document: docMeta });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Communication Chat routes per PO
app.get('/api/orders/:id/chat', async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ chat: order.chat });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/chat', async (req, res) => {
  try {
    const { message, attachmentName, attachmentUrl, messageType } = req.body;
    const order = await orderService.getOrderById(req.params.id);
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
      attachmentUrl,
      messageType: messageType || 'text'
    };

    await orderService.addChatMessage(req.params.id, newMsg);

    // Dynamic Sourcing assistant response in-chat
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

            Respond politely and professionally as the Indian supplier coordinator (e.g. Karthik or Ramesh). 
            Keep your answer concise (under 100 words), technical, reassuring, and realistic about Indian sourcing cycles. Be helpful.
          `;

          const aiResponse = await gemini.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: promptContext,
          });

          if (aiResponse.text) {
            const aiMsg: ChatMessage = {
              id: 'msg_ai_' + Date.now(),
              senderId: 'usr_supplier1',
              senderName: `${order.supplierCompanyName} Merchandise Lead`,
              senderRole: 'supplier',
              message: aiResponse.text.trim(),
              timestamp: new Date().toISOString(),
              messageType: 'text'
            };
            await orderService.addChatMessage(req.params.id, aiMsg);
          }
        } catch (err) {
          console.error("Gemini chat helper error:", err);
        }
      } else {
        // Simple automatic reply fallback
        setTimeout(async () => {
          const fbMsg: ChatMessage = {
            id: 'msg_auto_' + Date.now(),
            senderId: 'usr_supplier1',
            senderName: `${order.supplierCompanyName} Bot`,
            senderRole: 'supplier',
            message: `Thank you for your message. Sourcing team has received your comment: "${message}". We are analyzing with our shopfloor supervisors and will update the timeline or submit relevant approvals as soon as possible.`,
            timestamp: new Date().toISOString(),
            messageType: 'text'
          };
          await orderService.addChatMessage(req.params.id, fbMsg);
        }, 1500);
      }
    }

    // Refresh chat list
    const refreshed = await orderService.getOrderById(req.params.id);
    res.json({ success: true, chat: refreshed?.chat || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications();
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications();
    for (const n of notifications) {
      if (!n.isRead) {
        await notificationService.markAsRead(n.id);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------
// SOURCING GENIUS AI COMPANION / COPILOT ROUTE
// -----------------------------------------------------
app.post('/api/gen-ai/sourcing-assistant', async (req, res) => {
  const { prompt, currentContextPoId } = req.body;
  const gemini = getGemini();

  const suppliers = await companyService.getCompanies();
  const activeOrders = await orderService.getOrders();

  if (!gemini) {
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
      const order = activeOrders.find(o => o.id === currentContextPoId);
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
      ${JSON.stringify(suppliers.filter(c => c.type === 'supplier'))}
      
      Active Purchase Orders Context:
      ${JSON.stringify(activeOrders.map(o => ({ id: o.id, poNum: o.poNumber, style: o.styleName, status: o.status, score: o.confidenceScore, supplier: o.supplierCompanyName })))}
      
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
  console.log('[Startup] Grounding Cloud Data...');
  // Seed collections if empty
  await companyService.seedCompaniesIfNeeded();
  await seedUsersIfNeeded();
  await rfqService.seedRFQsIfNeeded();
  await notificationService.seedNotificationsIfNeeded();
  await orderService.seedOrdersIfNeeded({});
  
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

