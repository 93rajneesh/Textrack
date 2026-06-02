/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'buyer' | 'supplier' | 'qa' | 'admin';
export type CompanyType = 'buyer' | 'supplier' | 'lab' | 'logistics';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  createdAt: string;
}

export interface CompanyInfo {
  id: string;
  name: string;
  type: CompanyType;
  country: string;
  contactEmail: string;
  logo: string;
  rating: number;
  trustScore: number; // calculated automatically: (otd * 0.4) + (quality * 0.3) + (response * 0.2) + (repeat * 0.1)
  certifications: string[];
  productCategories: string[];
  stitchingCapacityPerDay: number;
  noOfMachines: number;
  moq: number;
  leadTimeDays: number;
  exportMarkets: string[];
  location: string;
  
  // Dynamic supplier capacity tracking
  monthlyCapacity?: number;
  currentBookedCapacity?: number;
  availableCapacity?: number;

  // Trust score parameters
  otd?: number; // On-Time Delivery % (0 - 100)
  qualityPerformance?: number; // QA inspection pass rate % (0 - 100)
  responseTime?: number; // Response time score (0 - 100)
  repeatOrdersRate?: number; // Repeat orders rate % (0 - 100)

  // Factory verification details
  auditStatus?: 'Verified' | 'Pending' | 'Not Audited';
  auditDate?: string;
  factoryPhotos?: string[];
  videos?: string[];
}

export type StageName = 
  | 'Fabric Sourcing' 
  | 'Fabric Inspection' 
  | 'Cutting' 
  | 'Printing / Embroidery' 
  | 'Sewing' 
  | 'Finishing' 
  | 'Quality Inspection' 
  | 'Packing' 
  | 'Shipment';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export interface ProductionStage {
  name: StageName;
  status: StageStatus;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  completedQty: number;
  progress: number; // 0 - 100
  photoUrl?: string; // Live production photo uploads
  notes?: string;
}

export type OrderStatus = 'In Production' | 'Ready to Ship' | 'On Water' | 'Completed' | 'Delayed';

export type ChatMessageType = 'text' | 'image' | 'document' | 'approval' | 'system';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  messageType?: ChatMessageType;
}

export interface QualityReport {
  id: string;
  inspectorName: string;
  inspectionDate: string;
  type: 'Inline' | 'Mid-line' | 'Final';
  sampleSize: number;
  defectsCount: number;
  defectRate: number; // percentage
  result: 'Pass' | 'Fail';
  comments: string;
  defectBreakdown: { [defectType: string]: number }; // e.g. { 'Stitching': 40, 'Oil stain': 20 }
}

export interface MaterialStatus {
  fabric: 'Received' | 'Delayed' | 'Pending';
  buttons: 'Received' | 'Delayed' | 'Pending';
  zippers: 'Received' | 'Delayed' | 'Pending';
  labels: 'Received' | 'Delayed' | 'Pending';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  styleName: string;
  buyerCompanyId: string;
  buyerCompanyName: string;
  supplierCompanyId: string;
  supplierCompanyName: string;
  orderQty: number;
  producedQty: number;
  unitPrice: number;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  fabricType: string;
  color: string;
  sizeRange: string; // e.g. "S-XXL"
  stages: ProductionStage[];
  chat: ChatMessage[];
  qualityReports: QualityReport[];
  materials: MaterialStatus;
  confidenceScore: number; // 0 to 100
  vesselName?: string;
  containerNo?: string;
  etd?: string;
  eta?: string;
  shipmentStatus?: string;
}

export interface AlertNotification {
  id: string;
  poId: string;
  poNumber: string;
  type: 'delay' | 'quality' | 'material' | 'info';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface RFQRequirement {
  id: string;
  styleName: string;
  productCategory: string;
  targetPrice: number;
  orderQty: number;
  fabricType: string;
  leadTimeDays: number;
  buyerCompanyName: string;
  createdAt: string;
  status: 'Open' | 'Quoted' | 'Accepted';
}

export interface SourcingAssistantResponse {
  answer: string;
  translatedMessage?: string;
  suggestedAction?: string;
}

// Global Activity / Audit trail collection
export interface ActivityLog {
  id: string;
  poId: string;
  userId: string;
  userName: string;
  action: string; // e.g. "Rajneesh uploaded PP sample"
  timestamp: string;
}

// Milestone action items per PO
export interface POTask {
  id: string;
  poId: string;
  title: string; // e.g. "Approve Lab Dip"
  assignedTo: string; // e.g. "Buyer" or "Supplier" or "QA"
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

// Time-and-Action Event for calendar
export interface TNAEvent {
  id: string;
  poId: string;
  name: string; // e.g. "Lab Dip", "PP Sample", etc.
  plannedDate: string;
  actualDate?: string;
  owner?: string; // "Buyer", "Supplier", "QA" etc.
  status: 'Pending' | 'On Track' | 'Completed' | 'Delayed';
}

// Document vault index per PO
export interface PODocument {
  id: string;
  poId: string;
  type: 'PO' | 'Tech Pack' | 'BOM' | 'Lab Dip' | 'PP Sample' | 'Inspection Report' | 'Invoice' | 'Packing List';
  fileUrl: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Supplier bids responding to active RFQs
export interface Quotation {
  id: string;
  rfqId: string;
  supplierCompanyId: string;
  supplierCompanyName: string;
  quotedPrice: number;
  promisedLeadTimeDays: number;
  notes: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
}

