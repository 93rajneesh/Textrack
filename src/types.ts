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
  trustScore: number;
  certifications: string[];
  productCategories: string[];
  stitchingCapacityPerDay: number;
  noOfMachines: number;
  moq: number;
  leadTimeDays: number;
  exportMarkets: string[];
  location: string;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
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
