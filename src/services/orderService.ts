/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { PurchaseOrder, POTask, TNAEvent, PODocument, ActivityLog, ProductionStage, QualityReport, ChatMessage, MaterialStatus } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { notificationService } from './notificationService';

const ORDERS_COLLECTION = 'orders';
const TASKS_COLLECTION = 'po_tasks';
const TNA_COLLECTION = 'tna_events';
const DOCUMENTS_COLLECTION = 'po_documents';
const LOGS_COLLECTION = 'activity_logs';

export const orderService = {
  // --- Core Purchase Orders ---
  async getOrders(supplierCompanyId?: string): Promise<PurchaseOrder[]> {
    try {
      const q = collection(db, ORDERS_COLLECTION);
      const snapshot = await getDocs(q);
      const results: PurchaseOrder[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as PurchaseOrder;
        if (!supplierCompanyId || data.supplierCompanyId === supplierCompanyId) {
          results.push(data);
        }
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, ORDERS_COLLECTION);
    }
  },

  async getOrderById(id: string): Promise<PurchaseOrder | null> {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as PurchaseOrder;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${ORDERS_COLLECTION}/${id}`);
    }
  },

  async createOrder(order: PurchaseOrder, createdByUserId: string, createdByUserName: string): Promise<void> {
    try {
      // Save order top level doc
      await setDoc(doc(db, ORDERS_COLLECTION, order.id), order);

      // Create primary Tasks
      const defaultTasks: Omit<POTask, 'id'>[] = [
        { poId: order.id, title: 'Approve Lab Dip', assignedTo: 'Buyer', dueDate: order.orderDate, status: 'Completed' },
        { poId: order.id, title: 'Submit PP Sample', assignedTo: 'Supplier', dueDate: order.stages[0].plannedEnd, status: 'In Progress' },
        { poId: order.id, title: 'Upload final inspection report', assignedTo: 'QA', dueDate: order.stages[6].plannedStart, status: 'Pending' }
      ];

      for (const t of defaultTasks) {
        const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, TASKS_COLLECTION, taskId), { id: taskId, ...t });
      }

      // Create Time and Action (TNA) calendar events
      const defaultTNAEvents: Omit<TNAEvent, 'id'>[] = [
        { poId: order.id, name: 'Lab Dip Preparation', plannedDate: order.orderDate, status: 'Completed', owner: 'Supplier' },
        { poId: order.id, name: 'PP Sample Submission', plannedDate: order.stages[0].plannedEnd, status: 'On Track', owner: 'Supplier' },
        { poId: order.id, name: 'Fabric Booking', plannedDate: order.stages[1].plannedStart, status: 'Pending', owner: 'Supplier' },
        { poId: order.id, name: 'Bulk Fabric In-house', plannedDate: order.stages[1].plannedEnd, status: 'Pending', owner: 'Supplier' },
        { poId: order.id, name: 'Fabric Inspection', plannedDate: order.stages[1].plannedEnd, status: 'Pending', owner: 'Supplier' },
        { poId: order.id, name: 'Cutting Initiation', plannedDate: order.stages[2].plannedStart, status: 'Pending', owner: 'Supplier' },
        { poId: order.id, name: 'QA Pre-final Inspection', plannedDate: order.stages[6].plannedStart, status: 'Pending', owner: 'QA' },
        { poId: order.id, name: 'Ocean Shipment Load', plannedDate: order.deliveryDate, status: 'Pending', owner: 'Supplier' }
      ];

      for (const tna of defaultTNAEvents) {
        const eventId = `tna_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, TNA_COLLECTION, eventId), { id: eventId, ...tna });
      }

      // Create default PO Document in Document Center
      const poDocId = `doc_${Date.now()}`;
      const defaultDoc: PODocument = {
        id: poDocId,
        poId: order.id,
        type: 'PO',
        fileName: `${order.poNumber}_Sourcing_Doc.pdf`,
        fileUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
        uploadedBy: createdByUserName,
        uploadedAt: new Date().toISOString()
      };
      await setDoc(doc(db, DOCUMENTS_COLLECTION, poDocId), defaultDoc);

      // Record Activity Log
      await this.addActivityLog({
        id: `act_${Date.now()}`,
        poId: order.id,
        userId: createdByUserId,
        userName: createdByUserName,
        action: `Created Purchase Order contract ${order.poNumber} with style ${order.styleName}`,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${ORDERS_COLLECTION}/${order.id}`);
    }
  },

  async updateOrderMetadata(order: PurchaseOrder): Promise<void> {
    const delayedStagesCount = order.stages.filter(s => s.status === 'delayed').length;
    let score = 100;
    
    // Subtract for any delayed stages
    score -= (delayedStagesCount * 15);

    // Subtract for material delays
    if (order.materials.fabric === 'Delayed') score -= 15;
    if (order.materials.buttons === 'Delayed') score -= 5;
    if (order.materials.zippers === 'Delayed') score -= 5;
    if (order.materials.labels === 'Delayed') score -= 5;

    // Subtract heavily for failing inspection report
    const hasFailedInspection = order.qualityReports.some(r => r.result === 'Fail');
    if (hasFailedInspection) score -= 30;

    order.confidenceScore = Math.max(10, Math.min(100, score));

    // Calculate overall producedQty based on sewing progress
    const sewingStage = order.stages.find(s => s.name === 'Sewing');
    if (sewingStage) {
      order.producedQty = Math.round((sewingStage.progress / 100) * order.orderQty);
    }

    // Assign overall order status
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

    // Save back to Firestore
    try {
      await updateDoc(doc(db, ORDERS_COLLECTION, order.id), {
        producedQty: order.producedQty,
        confidenceScore: order.confidenceScore,
        status: order.status,
        stages: order.stages,
        materials: order.materials,
        vesselName: order.vesselName || null,
        containerNo: order.containerNo || null,
        etd: order.etd || null,
        eta: order.eta || null,
        shipmentStatus: order.shipmentStatus || null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${ORDERS_COLLECTION}/${order.id}`);
    }
  },

  async updateOrderStages(orderId: string, stageName: string, updates: Partial<ProductionStage>, userId: string, userName: string): Promise<PurchaseOrder> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const stage = order.stages.find(s => s.name === stageName);
    if (!stage) throw new Error('Stage not found');

    // Apply updates
    if (updates.status) stage.status = updates.status;
    if (updates.progress !== undefined) stage.progress = updates.progress;
    if (updates.completedQty !== undefined) stage.completedQty = updates.completedQty;
    if (updates.notes) stage.notes = updates.notes;
    if (updates.photoUrl) stage.photoUrl = updates.photoUrl;

    if (updates.status === 'in_progress' && !stage.actualStart) {
      stage.actualStart = new Date().toISOString().split('T')[0];
    }
    if (updates.status === 'completed') {
      stage.progress = 100;
      stage.actualEnd = new Date().toISOString().split('T')[0];
    }

    // Save and compute score
    await this.updateOrderMetadata(order);

    // Record Activity
    await this.addActivityLog({
      id: `act_${Date.now()}`,
      poId: orderId,
      userId,
      userName,
      action: `${userName} updated production stage [${stageName}] to status [${updates.status}] (${updates.progress || 0}% progress)`,
      timestamp: new Date().toISOString()
    });

    // Handle Alerts Trigger
    if (updates.status === 'delayed') {
      await notificationService.createNotification({
        id: `not_delay_${Date.now()}`,
        poId: orderId,
        poNumber: order.poNumber,
        type: 'delay',
        severity: 'warning',
        message: `${stageName} reported DELAYED on ${order.poNumber}. Supplier Note: ${updates.notes || 'No explanation provided.'}`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }

    return order;
  },

  async updateOrderMaterials(orderId: string, materials: Partial<MaterialStatus>, userId: string, userName: string): Promise<PurchaseOrder> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    order.materials = {
      ...order.materials,
      ...materials
    };

    await this.updateOrderMetadata(order);

    // Record activity
    const keysUpdated = Object.keys(materials).join(', ');
    await this.addActivityLog({
      id: `act_${Date.now()}`,
      poId: orderId,
      userId,
      userName,
      action: `${userName} updated physical materials status (${keysUpdated})`,
      timestamp: new Date().toISOString()
    });

    return order;
  },

  async addInspectionReport(orderId: string, report: Omit<QualityReport, 'id' | 'defectRate'>, userId: string, userName: string): Promise<PurchaseOrder> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const defectRate = parseFloat(((report.defectsCount / report.sampleSize) * 100).toFixed(2));
    const fullReport: QualityReport = {
      id: `rep_${Date.now()}`,
      defectRate,
      inspectionDate: new Date().toISOString().split('T')[0],
      ...report
    };

    order.qualityReports.unshift(fullReport);
    await this.updateOrderMetadata(order);

    // Record activity
    await this.addActivityLog({
      id: `act_${Date.now()}`,
      poId: orderId,
      userId,
      userName,
      action: `${userName} signed and uploaded a ${report.type} Quality Audit with result: [${report.result}] (defect rate: ${defectRate}%)`,
      timestamp: new Date().toISOString()
    });

    // Alert trigger
    if (report.result === 'Fail') {
      await notificationService.createNotification({
        id: `not_fail_${Date.now()}`,
        poId: orderId,
        poNumber: order.poNumber,
        type: 'quality',
        severity: 'critical',
        message: `CRITICAL: ${report.type} quality audit failed on ${order.poNumber}! Defect rate of ${defectRate}% exceeds AQL standard.`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }

    return order;
  },

  async addChatMessage(orderId: string, msg: ChatMessage): Promise<PurchaseOrder> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    order.chat.push(msg);
    
    // Save to Firestore
    try {
      await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
        chat: order.chat
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
    }

    return order;
  },

  // --- Sub-Collections: Activity Logs ---
  async getActivityLogs(poId: string): Promise<ActivityLog[]> {
    try {
      const q = query(
        collection(db, LOGS_COLLECTION),
        where('poId', '==', poId)
      );
      const snapshot = await getDocs(q);
      const results: ActivityLog[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as ActivityLog);
      });
      // Sort in-memory to avoid needing index during initial run
      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, LOGS_COLLECTION);
    }
  },

  async addActivityLog(log: ActivityLog): Promise<void> {
    try {
      await setDoc(doc(db, LOGS_COLLECTION, log.id), log);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${LOGS_COLLECTION}/${log.id}`);
    }
  },

  // --- Sub-Collections: PO Tasks ---
  async getTasksForOrder(poId: string): Promise<POTask[]> {
    try {
      const q = query(collection(db, TASKS_COLLECTION), where('poId', '==', poId));
      const snapshot = await getDocs(q);
      const results: POTask[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as POTask);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, TASKS_COLLECTION);
    }
  },

  async updateTaskStatus(taskId: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<void> {
    try {
      await updateDoc(doc(db, TASKS_COLLECTION, taskId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${TASKS_COLLECTION}/${taskId}`);
    }
  },

  async createTask(task: POTask): Promise<void> {
    try {
      await setDoc(doc(db, TASKS_COLLECTION, task.id), task);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${TASKS_COLLECTION}/${task.id}`);
    }
  },

  // --- Sub-Collections: TNA Event Calendar Calendar ---
  async getTNAEventsForOrder(poId: string): Promise<TNAEvent[]> {
    try {
      const q = query(collection(db, TNA_COLLECTION), where('poId', '==', poId));
      const snapshot = await getDocs(q);
      const results: TNAEvent[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as TNAEvent);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, TNA_COLLECTION);
    }
  },

  async updateTNAEvent(eventId: string, updates: Partial<TNAEvent>): Promise<void> {
    try {
      await updateDoc(doc(db, TNA_COLLECTION, eventId), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${TNA_COLLECTION}/${eventId}`);
    }
  },

  // --- Sub-Collections: Document Center Vault ---
  async getDocumentsForOrder(poId: string): Promise<PODocument[]> {
    try {
      const q = query(collection(db, DOCUMENTS_COLLECTION), where('poId', '==', poId));
      const snapshot = await getDocs(q);
      const results: PODocument[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as PODocument);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, DOCUMENTS_COLLECTION);
    }
  },

  async uploadDocument(document: PODocument): Promise<void> {
    try {
      await setDoc(doc(db, DOCUMENTS_COLLECTION, document.id), document);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${DOCUMENTS_COLLECTION}/${document.id}`);
    }
  },

  // --- Seeding helper ---
  async seedOrdersIfNeeded(companiesSeededRef: any): Promise<void> {
    const currentList = await this.getOrders();
    if (currentList.length > 0) return;

    console.log('[Seeding] Seeding default orders with TNA calendars, tasks, docs, and logs...');

    // Function to generate stages
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

    const mockOrders: PurchaseOrder[] = [
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
        stages: [],
        materials: { fabric: 'Received', buttons: 'Received', zippers: 'Received', labels: 'Received' },
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
          { id: 'm1', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hello Karthik, please share the pre-production sample photos for approval.', timestamp: '2026-05-03T10:00:00Z', messageType: 'text' },
          { id: 'm2', senderId: 'usr_supplier1', senderName: 'Karthik Subramanian', senderRole: 'supplier', message: 'Hi Rajneesh, I have uploaded the PP sample images. The fabric handfeel is extremely soft and matches your spec.', timestamp: '2026-05-03T11:45:00Z', attachmentName: 'pp_sample_front.jpg', attachmentUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500', messageType: 'image' },
          { id: 'm3', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Approved! Please proceed to cutting instantly. Keep us uploaded on fabric arrival status.', timestamp: '2026-05-04T08:30:00Z', messageType: 'approval' },
          { id: 'm4', senderId: 'usr_supplier1', senderName: 'Karthik Subramanian', senderRole: 'supplier', message: 'Perfect, fabric sourcing and inspection is 100% completed. We initiated bulk sewing today on Line 4.', timestamp: '2026-05-11T14:00:00Z', messageType: 'text' }
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
        materials: { fabric: 'Delayed', buttons: 'Received', zippers: 'Pending', labels: 'Received' },
        qualityReports: [],
        chat: [
          { id: 'c41', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hi Team, order tracking shows fabric sourcing remains delayed. What is the hold up?', timestamp: '2026-05-20T09:00:00Z', messageType: 'text' },
          { id: 'c42', senderId: 'usr_supplier1', senderName: 'Supplier Support', senderRole: 'supplier', message: 'Apologies Rajneesh, the imported Oxford weave fabric cargo is currently stuck at customs clearance in Mumbai port.', timestamp: '2026-05-20T11:20:00Z', messageType: 'text' }
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
        materials: { fabric: 'Received', buttons: 'Received', zippers: 'Received', labels: 'Received' },
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
            comments: 'Warning: Fabric tested poor color fastness score (Rating 2/5 under washing cycle). Color bled on white test patch.',
            defectBreakdown: { 'Color Bleeding': 9, 'Uneven stitching': 4, 'Label mismatch': 2 }
          }
        ],
        chat: [
          { id: 'c71', senderId: 'usr_buyer1', senderName: 'Rajneesh', senderRole: 'buyer', message: 'Hello, the Intertek report uploaded yesterday shows a Color Fastness failure!', timestamp: '2026-05-23T07:15:00Z', messageType: 'text' },
          { id: 'c72', senderId: 'usr_supplier1', senderName: 'Ramesh Sen', senderRole: 'supplier', message: 'Hi Rajneesh, yes we stopped stitching lines and are applying organic dye fixing agent.', timestamp: '2026-05-23T10:45:00Z', messageType: 'text' }
        ],
        confidenceScore: 55
      }
    ];

    for (const order of mockOrders) {
      order.stages = createDefaultStages(order.styleName, order.orderDate, order.deliveryDate);
      
      // Inject specific anomalies to seed correctly
      if (order.id === 'po_456') {
        order.stages[0].status = 'delayed';
        order.stages[0].notes = 'Held at customs clearance in Mumbai. Awaiting release certificate.';
        order.stages[1].status = 'pending';
        order.stages[2].status = 'pending';
        order.stages[3].status = 'pending';
        order.stages[4].status = 'pending';
      } else if (order.id === 'po_789') {
        order.stages[0].status = 'completed';
        order.stages[1].status = 'delayed';
        order.stages[1].notes = 'Initial batch failed Color Fastness wash. Specialized fixative treatment ongoing.';
        order.stages[2].status = 'pending';
        order.stages[3].status = 'pending';
        order.stages[4].status = 'pending';
      }

      await this.createOrder(order, 'usr_buyer1', 'Rajneesh Sengupta');
    }
  }
};
