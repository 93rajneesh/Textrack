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
  orderId: string; // same as poId
  poId?: string; // backward compatibility
  companyId: string;
  userId: string;
  userName: string;
  action: string; // e.g. "Rajneesh updated Sewing Progress from 60% to 72%."
  entityType?: string; // "PO" | "Document" | "RFQ" | "Sample" | "Milestone"
  entityId?: string;
  oldValue?: string;
  newValue?: string;
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
  orderId?: string; // mapping convenience
  name: string; // e.g. "Fabric Booking", "Lab Dip Approval", etc.
  eventName?: string; // alias of name for compatibility
  owner: string; // e.g. "Buyer", "Supplier", "QA"
  plannedDate: string;
  actualDate?: string;
  status: 'Pending' | 'On Track' | 'Completed' | 'Delayed';
  remarks?: string;
}

// Document vault index per PO
export interface PODocument {
  id: string;
  poId: string;
  orderId?: string; // same as poId
  companyId?: string;
  type: 'PO' | 'Tech Pack' | 'BOM' | 'Lab Dip' | 'PP Sample' | 'Inspection Report' | 'Invoice' | 'Packing List' | 'Fabric Test Report' | 'PP Sample Approval' | 'Shipping Documents';
  documentType?: string; // alternative name
  fileUrl: string;
  fileName: string;
  version?: number;
  uploadedBy: string;
  uploadedAt: string;
  uploadDate?: string; // alternative name
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
}

// Garment Sample Sourcing Tracking
export interface Sample {
  id: string;
  orderId: string;
  sampleType: 'Proto Sample' | 'Fit Sample' | 'Size Set Sample' | 'PP Sample' | 'Shipment Sample';
  submitDate: string;
  approvalDate?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revision Requested';
  comments: string;
  photos: string[];
  feedbackHistory?: {
    date: string;
    by: string;
    status: string;
    comments: string;
  }[];
}

// Supplier Performance Scorecard Engine
export interface SupplierScorecard {
  id: string; // firestore id
  supplierId: string; // companyId
  qualityScore: number; // 0 - 100
  deliveryScore: number; // 0 - 100
  responseScore: number; // 0 - 100
  complianceScore: number; // 0 - 100
  repeatOrderScore: number; // 0 - 100
  inspectionPassRate: number; // 0 - 100
  claimRate: number; // 0 - 100
  overallScore: number; // Quality*30% + Delivery*30% + Response*15% + Compliance*15% + Repeat*10%
}

// Factory Capacity Planning
export interface FactoryCapacity {
  id: string;
  supplierId: string;
  monthlyCapacity: number;
  bookedCapacity: number;
  availableCapacity: number;
  lineCount: number;
  workforceCount: number;
  bookings?: {
    month: string; // e.g. "2026-06", "2026-07"
    bookedQty: number;
    notes?: string;
  }[];
}

// Enterprise App Notification Engine
export interface AppNotification {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  message: string;
  category: 'Production' | 'Quality' | 'Shipment' | 'Document' | 'RFQ' | 'General';
  severity: 'info' | 'warning' | 'critical';
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
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

