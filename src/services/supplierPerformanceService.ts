/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SupplierScorecard, FactoryCapacity } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';

const SCORECARD_COLLECTION = 'supplier_scorecards';
const CAPACITY_COLLECTION = 'factory_capacities';

export const supplierPerformanceService = {
  // Scorecard operations
  async getSupplierScorecard(supplierId: string): Promise<SupplierScorecard | null> {
    try {
      const docRef = doc(db, SCORECARD_COLLECTION, supplierId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as SupplierScorecard;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${SCORECARD_COLLECTION}/${supplierId}`);
    }
  },

  async getSupplierScorecards(): Promise<SupplierScorecard[]> {
    try {
      const snapshot = await getDocs(collection(db, SCORECARD_COLLECTION));
      const results: SupplierScorecard[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as SupplierScorecard);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, SCORECARD_COLLECTION);
    }
  },

  calculateOverallScore(metrics: Omit<SupplierScorecard, 'id' | 'overallScore'>): number {
    const { qualityScore, deliveryScore, responseScore, complianceScore, repeatOrderScore } = metrics;
    // Weighted formula:
    // Quality 30%, Delivery 30%, Response 15%, Compliance 15%, Repeat Orders 10%
    const score = (qualityScore * 0.3) 
                + (deliveryScore * 0.3) 
                + (responseScore * 0.15) 
                + (complianceScore * 0.15) 
                + (repeatOrderScore * 0.1);
    return Math.round(score * 10) / 10;
  },

  async saveScorecard(supplierId: string, scorecard: SupplierScorecard): Promise<void> {
    try {
      scorecard.overallScore = this.calculateOverallScore(scorecard);
      await setDoc(doc(db, SCORECARD_COLLECTION, supplierId), scorecard);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${SCORECARD_COLLECTION}/${supplierId}`);
    }
  },

  // Capacity operations
  async getFactoryCapacity(supplierId: string): Promise<FactoryCapacity | null> {
    try {
      const docRef = doc(db, CAPACITY_COLLECTION, supplierId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FactoryCapacity;
        return {
          ...data,
          availableCapacity: data.monthlyCapacity - data.bookedCapacity
        };
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${CAPACITY_COLLECTION}/${supplierId}`);
    }
  },

  async getFactoryCapacities(): Promise<FactoryCapacity[]> {
    try {
      const snapshot = await getDocs(collection(db, CAPACITY_COLLECTION));
      const results: FactoryCapacity[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as FactoryCapacity;
        results.push({
          ...data,
          availableCapacity: data.monthlyCapacity - data.bookedCapacity
        });
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, CAPACITY_COLLECTION);
    }
  },

  async updateFactoryCapacity(supplierId: string, updates: Partial<FactoryCapacity>): Promise<void> {
    try {
      const existing = await this.getFactoryCapacity(supplierId);
      if (!existing) throw new Error('Capacity profile not found');

      const nextMonthly = updates.monthlyCapacity !== undefined ? updates.monthlyCapacity : existing.monthlyCapacity;
      const nextBooked = updates.bookedCapacity !== undefined ? updates.bookedCapacity : existing.bookedCapacity;
      const nextAvailable = nextMonthly - nextBooked;

      await updateDoc(doc(db, CAPACITY_COLLECTION, supplierId), {
        ...updates,
        availableCapacity: nextAvailable
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${CAPACITY_COLLECTION}/${supplierId}`);
    }
  },

  async seedPerformanceIfNeeded(): Promise<void> {
    try {
      // 1. Seed scorecards
      const cardSnap = await getDocs(collection(db, SCORECARD_COLLECTION));
      if (cardSnap.empty) {
        console.log('[Seeding] Seeding supplier metrics performance scorecards...');
        const seedCards: SupplierScorecard[] = [
          {
            id: 'comp_tirupur',
            supplierId: 'comp_tirupur',
            qualityScore: 95,
            deliveryScore: 92,
            responseScore: 96,
            complianceScore: 98,
            repeatOrderScore: 90,
            inspectionPassRate: 98.4,
            claimRate: 0.5,
            overallScore: 94.3 // precalculated
          },
          {
            id: 'comp_delhi',
            supplierId: 'comp_delhi',
            qualityScore: 88,
            deliveryScore: 84,
            responseScore: 90,
            complianceScore: 95,
            repeatOrderScore: 85,
            inspectionPassRate: 92.1,
            claimRate: 1.2,
            overallScore: 87.4
          },
          {
            id: 'comp_kolkata',
            supplierId: 'comp_kolkata',
            qualityScore: 78,
            deliveryScore: 75,
            responseScore: 84,
            complianceScore: 90,
            repeatOrderScore: 80,
            inspectionPassRate: 85.5,
            claimRate: 2.8,
            overallScore: 79.5
          }
        ];

        for (const card of seedCards) {
          card.overallScore = this.calculateOverallScore(card);
          await setDoc(doc(db, SCORECARD_COLLECTION, card.id), card);
        }
      }

      // 2. Seed Capacities
      const capSnap = await getDocs(collection(db, CAPACITY_COLLECTION));
      if (capSnap.empty) {
        console.log('[Seeding] Seeding factory capacity bookings...');
        const seedCapacities: FactoryCapacity[] = [
          {
            id: 'comp_tirupur',
            supplierId: 'comp_tirupur',
            monthlyCapacity: 500000,
            bookedCapacity: 385000,
            availableCapacity: 115000,
            lineCount: 24,
            workforceCount: 450,
            bookings: [
              { month: '2026-06', bookedQty: 185000, notes: 'Target Corp summer dresses + Kohl active knit lines active.' },
              { month: '2026-07', bookedQty: 120000, notes: 'Reserved for Macy bulk autumn knit tees.' },
              { month: '2026-08', bookedQty: 80000, notes: 'In-house yarn dyed hoodies bookings.' }
            ]
          },
          {
            id: 'comp_delhi',
            supplierId: 'comp_delhi',
            monthlyCapacity: 250000,
            bookedCapacity: 180000,
            availableCapacity: 70000,
            lineCount: 12,
            workforceCount: 220,
            bookings: [
              { month: '2026-06', bookedQty: 110000, notes: 'Premium slimfit mens shirts stitching.' },
              { month: '2026-07', bookedQty: 70000, notes: 'Woven corporate apparel lines booked.' }
            ]
          },
          {
            id: 'comp_kolkata',
            supplierId: 'comp_kolkata',
            monthlyCapacity: 150000,
            bookedCapacity: 135000,
            availableCapacity: 15000,
            lineCount: 8,
            workforceCount: 150,
            bookings: [
              { month: '2026-06', bookedQty: 85000, notes: 'Kids romper lines fully integrated.' },
              { month: '2026-07', bookedQty: 50000, notes: 'Limited capacity slots left.' }
            ]
          }
        ];

        for (const cap of seedCapacities) {
          cap.availableCapacity = cap.monthlyCapacity - cap.bookedCapacity;
          await setDoc(doc(db, CAPACITY_COLLECTION, cap.id), cap);
        }
      }
    } catch (err) {
      console.error('Error seeding supplier performance details:', err);
    }
  }
};
