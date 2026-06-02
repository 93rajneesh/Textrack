/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { RFQRequirement, Quotation } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';

const RFQ_COLLECTION = 'rfqs';
const QUOTATION_COLLECTION = 'quotations';

export const rfqService = {
  async getRFQs(): Promise<RFQRequirement[]> {
    try {
      const q = collection(db, RFQ_COLLECTION);
      const snapshot = await getDocs(q);
      const results: RFQRequirement[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as RFQRequirement);
      });
      // Sort in-memory by date descending
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, RFQ_COLLECTION);
    }
  },

  async createRFQ(rfq: RFQRequirement): Promise<void> {
    try {
      await setDoc(doc(db, RFQ_COLLECTION, rfq.id), rfq);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${RFQ_COLLECTION}/${rfq.id}`);
    }
  },

  async getQuotationsForRFQ(rfqId: string): Promise<Quotation[]> {
    try {
      const q = query(collection(db, QUOTATION_COLLECTION), where('rfqId', '==', rfqId));
      const snapshot = await getDocs(q);
      const results: Quotation[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as Quotation);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, QUOTATION_COLLECTION);
    }
  },

  async addQuotation(quote: Quotation): Promise<void> {
    try {
      await setDoc(doc(db, QUOTATION_COLLECTION, quote.id), quote);
      
      // Update RFQ status to 'Quoted' if it is currently 'Open'
      const rfqRef = doc(db, RFQ_COLLECTION, quote.rfqId);
      await updateDoc(rfqRef, { status: 'Quoted' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${QUOTATION_COLLECTION}/${quote.id}`);
    }
  },

  async awardQuotation(rfqId: string, acceptedQuoteId: string): Promise<void> {
    try {
      const quotations = await this.getQuotationsForRFQ(rfqId);
      const batch = writeBatch(db);

      for (const q of quotations) {
        const docRef = doc(db, QUOTATION_COLLECTION, q.id);
        if (q.id === acceptedQuoteId) {
          batch.update(docRef, { status: 'Accepted' });
        } else {
          batch.update(docRef, { status: 'Rejected' });
        }
      }

      // Update Parent RFQ Status as Accepted
      const rfqRef = doc(db, RFQ_COLLECTION, rfqId);
      batch.update(rfqRef, { status: 'Accepted' });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${QUOTATION_COLLECTION}/${acceptedQuoteId}`);
    }
  },

  async seedRFQsIfNeeded(): Promise<void> {
    const currentList = await this.getRFQs();
    if (currentList.length > 0) return;

    console.log('[Seeding] Seeding initial RFQs & Supplier Bid quotes...');
    const defaultRFQs: RFQRequirement[] = [
      {
        id: 'rfq_101',
        styleName: 'Organic Cotton Classic Polo',
        productCategory: 'Knits',
        targetPrice: 4.50,
        orderQty: 12000,
        fabricType: 'Pique Knit Organic Cotton (210 GSM)',
        leadTimeDays: 45,
        buyerCompanyName: 'Target Sourcing Corp',
        createdAt: '2026-05-12T09:00:00Z',
        status: 'Quoted'
      },
      {
        id: 'rfq_102',
        styleName: 'Performance Cargo Cycling Bibs',
        productCategory: 'Sportswear',
        targetPrice: 9.50,
        orderQty: 4000,
        fabricType: 'Lycra compression fabric with Coolmax chamois',
        leadTimeDays: 35,
        buyerCompanyName: 'Target Sourcing Corp',
        createdAt: '2026-05-18T14:30:00Z',
        status: 'Open'
      }
    ];

    const defaultQuotes: Quotation[] = [
      {
        id: 'quote_101_1',
        rfqId: 'rfq_101',
        supplierCompanyId: 'comp_tirupur',
        supplierCompanyName: 'Tirupur Prime Knits',
        quotedPrice: 4.25,
        promisedLeadTimeDays: 40,
        notes: 'Can source organic yarn in 7 days. Standard dyes certified Oeko-Tex. Sample can be dispatched within 4 days.',
        status: 'Pending',
        createdAt: '2026-05-14T11:00:00Z'
      },
      {
        id: 'quote_101_2',
        rfqId: 'rfq_101',
        supplierCompanyId: 'comp_delhi',
        supplierCompanyName: 'Delhi Woven Mills Ltd.',
        quotedPrice: 4.60,
        promisedLeadTimeDays: 45,
        notes: 'Price includes custom labelling and packing. Solid stitches guaranteed.',
        status: 'Pending',
        createdAt: '2026-05-15T15:20:00Z'
      },
      {
        id: 'quote_102_1',
        rfqId: 'rfq_102',
        supplierCompanyId: 'comp_ludhiana',
        supplierCompanyName: 'Ludhiana Active Sportswear',
        quotedPrice: 9.20,
        promisedLeadTimeDays: 30,
        notes: 'We hold active booked compression spandex stock in blue. Quick startup possible.',
        status: 'Pending',
        createdAt: '2026-05-20T10:00:00Z'
      }
    ];

    const batch = writeBatch(db);
    defaultRFQs.forEach(rfq => {
      batch.set(doc(db, RFQ_COLLECTION, rfq.id), rfq);
    });
    defaultQuotes.forEach(quote => {
      batch.set(doc(db, QUOTATION_COLLECTION, quote.id), quote);
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error('Error seeding RFQs: ', err);
    }
  }
};
