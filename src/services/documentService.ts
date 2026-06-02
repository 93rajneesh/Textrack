/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PODocument } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { orderService } from './orderService';

const DOCUMENTS_COLLECTION = 'po_documents';

export const documentService = {
  async getDocumentsForOrder(orderId: string): Promise<PODocument[]> {
    try {
      const q = query(collection(db, DOCUMENTS_COLLECTION), where('poId', '==', orderId));
      const snapshot = await getDocs(q);
      const results: PODocument[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as PODocument;
        results.push({
          ...data,
          orderId: data.orderId || data.poId,
          documentType: data.documentType || data.type,
          uploadDate: data.uploadDate || data.uploadedAt,
          version: data.version || 1,
          approvalStatus: data.approvalStatus || 'Pending'
        });
      });
      // Sort: newest uploaded first
      return results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, DOCUMENTS_COLLECTION);
    }
  },

  async getDocumentById(id: string): Promise<PODocument | null> {
    try {
      const docRef = doc(db, DOCUMENTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as PODocument;
        return {
          ...data,
          orderId: data.orderId || data.poId,
          documentType: data.documentType || data.type,
          uploadDate: data.uploadDate || data.uploadedAt,
          version: data.version || 1,
          approvalStatus: data.approvalStatus || 'Pending'
        };
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${DOCUMENTS_COLLECTION}/${id}`);
    }
  },

  async uploadDocument(document: PODocument, userId: string, userName: string): Promise<void> {
    try {
      // Find same document type to auto-increment version
      const allDocs = await this.getDocumentsForOrder(document.poId);
      const similarDocs = allDocs.filter(d => d.type === document.type);
      const nextVersion = similarDocs.length > 0 ? Math.max(...similarDocs.map(d => d.version || 1)) + 1 : 1;

      const finalDoc: PODocument = {
        ...document,
        orderId: document.poId,
        version: nextVersion,
        approvalStatus: document.approvalStatus || 'Pending',
        uploadDate: document.uploadedAt
      };

      await setDoc(doc(db, DOCUMENTS_COLLECTION, finalDoc.id), finalDoc);

      // Log activity
      await orderService.addActivityLog({
        id: `act_doc_${Date.now()}`,
        orderId: document.poId,
        poId: document.poId,
        companyId: document.companyId || 'comp_tirupur',
        userId,
        userName,
        entityType: 'Document',
        entityId: finalDoc.id,
        newValue: `v${nextVersion}`,
        action: `${userName} uploaded ${document.type} [v${nextVersion}]: "${document.fileName}" to Document Center`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${DOCUMENTS_COLLECTION}/${document.id}`);
    }
  },

  async approveOrRejectDocument(
    docId: string,
    status: 'Approved' | 'Rejected',
    userId: string,
    userName: string
  ): Promise<PODocument> {
    try {
      const docMeta = await this.getDocumentById(docId);
      if (!docMeta) throw new Error('Document not found');

      const oldStatus = docMeta.approvalStatus || 'Pending';
      docMeta.approvalStatus = status;

      await updateDoc(doc(db, DOCUMENTS_COLLECTION, docId), {
        approvalStatus: status
      });

      // Log activity
      await orderService.addActivityLog({
        id: `act_doc_app_${Date.now()}`,
        orderId: docMeta.poId,
        poId: docMeta.poId,
        companyId: 'comp_target', // Buyer
        userId,
        userName,
        entityType: 'Document',
        entityId: docId,
        oldValue: oldStatus,
        newValue: status,
        action: `${userName} updated approval state of "${docMeta.fileName}" to [${status}]`,
        timestamp: new Date().toISOString()
      });

      return docMeta;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${DOCUMENTS_COLLECTION}/${docId}`);
    }
  },

  async seedDocumentsIfNeeded(): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, DOCUMENTS_COLLECTION));
      // Standard docs are seeded by orderService seed, let's verify if more specific version test ones are helpful
      if (!snapshot.empty) return;
      
      console.log('[Seeding] Seeding comprehensive document attachments...');
      const seedDocs: PODocument[] = [
        {
          id: 'doc_seed_1',
          poId: 'po_123',
          orderId: 'po_123',
          companyId: 'comp_tirupur',
          type: 'Tech Pack',
          documentType: 'Tech Pack',
          fileName: 'Apparel_TechPack_Pacific_Blue.pdf',
          fileUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
          version: 1,
          approvalStatus: 'Approved',
          uploadedBy: 'Rajneesh Sengupta',
          uploadedAt: '2026-05-02T09:00:00Z',
          uploadDate: '2026-05-02'
        },
        {
          id: 'doc_seed_2',
          poId: 'po_123',
          orderId: 'po_123',
          companyId: 'comp_tirupur',
          type: 'BOM',
          documentType: 'BOM',
          fileName: 'BOM_Accessories_Spec_v2.xlsx',
          fileUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
          version: 2,
          approvalStatus: 'Approved',
          uploadedBy: 'Karthik Subramanian',
          uploadedAt: '2026-05-08T14:30:00Z',
          uploadDate: '2026-05-08'
        },
        {
          id: 'doc_seed_3',
          poId: 'po_123',
          orderId: 'po_123',
          companyId: 'comp_tirupur',
          type: 'Fabric Test Report',
          documentType: 'Fabric Test Report',
          fileName: 'Fabric_Formaldehyde_Ph_Test_SGS.pdf',
          fileUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
          version: 1,
          approvalStatus: 'Pending',
          uploadedBy: 'Karthik Subramanian',
          uploadedAt: '2026-05-18T10:15:00Z',
          uploadDate: '2026-05-18'
        }
      ];

      for (const docMeta of seedDocs) {
        await setDoc(doc(db, DOCUMENTS_COLLECTION, docMeta.id), docMeta);
      }
    } catch (err) {
      console.error('Error seeding documents:', err);
    }
  }
};
