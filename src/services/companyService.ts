/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { CompanyInfo } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';

const COLLECTION_NAME = 'companies';

export function calculateTrustScore(company: CompanyInfo): number {
  const otd = company.otd ?? 90;
  const quality = company.qualityPerformance ?? 90;
  const response = company.responseTime ?? 90;
  const repeat = company.repeatOrdersRate ?? 90;

  // Formula: trustScore = (otd * 0.4) + (quality * 0.3) + (response * 0.2) + (repeatOrders * 0.1)
  const score = (otd * 0.4) + (quality * 0.3) + (response * 0.2) + (repeat * 0.1);
  return Math.round(score);
}

export const companyService = {
  async getCompanies(): Promise<CompanyInfo[]> {
    try {
      const q = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(q);
      const results: CompanyInfo[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as CompanyInfo);
      });
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    }
  },

  async createCompany(company: CompanyInfo): Promise<void> {
    const updated = { ...company };
    updated.trustScore = calculateTrustScore(updated);
    if (updated.monthlyCapacity !== undefined && updated.currentBookedCapacity !== undefined) {
      updated.availableCapacity = Math.max(0, updated.monthlyCapacity - updated.currentBookedCapacity);
    }
    try {
      await setDoc(doc(db, COLLECTION_NAME, updated.id), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${updated.id}`);
    }
  },

  async updateCompany(id: string, updates: Partial<CompanyInfo>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const toSend = { ...updates };
      
      // If we are updating any quality metrics, recalculate score
      if (
        updates.otd !== undefined ||
        updates.qualityPerformance !== undefined ||
        updates.responseTime !== undefined ||
        updates.repeatOrdersRate !== undefined
      ) {
        // We calculate score based on partial values fallback
        const otd = updates.otd ?? 90;
        const quality = updates.qualityPerformance ?? 90;
        const response = updates.responseTime ?? 90;
        const repeat = updates.repeatOrdersRate ?? 95;
        toSend.trustScore = Math.round((otd * 0.4) + (quality * 0.3) + (response * 0.2) + (repeat * 0.1));
      }

      // Handle capacity calculations
      if (updates.monthlyCapacity !== undefined || updates.currentBookedCapacity !== undefined) {
        const monthly = updates.monthlyCapacity ?? 100000;
        const booked = updates.currentBookedCapacity ?? 0;
        toSend.availableCapacity = Math.max(0, monthly - booked);
      }

      await updateDoc(docRef, toSend);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async seedCompaniesIfNeeded(): Promise<void> {
    const currentList = await this.getCompanies();
    if (currentList.length > 0) return;

    console.log('[Seeding] Feeding default factory directory...');
    const defaultCompanies: CompanyInfo[] = [
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
        location: 'Tirupur, Tamil Nadu',
        monthlyCapacity: 500000,
        currentBookedCapacity: 420000,
        availableCapacity: 80000,
        otd: 95,
        qualityPerformance: 96,
        responseTime: 93,
        repeatOrdersRate: 90,
        auditStatus: 'Verified',
        auditDate: '2026-04-12',
        factoryPhotos: [
          'https://images.unsplash.com/photo-1558441719-ff34b0524a24?w=500',
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500'
        ],
        videos: []
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
        location: 'Noida (Delhi NCR), Uttar Pradesh',
        monthlyCapacity: 300000,
        currentBookedCapacity: 250000,
        availableCapacity: 50000,
        otd: 90,
        qualityPerformance: 92,
        responseTime: 85,
        repeatOrdersRate: 88,
        auditStatus: 'Verified',
        auditDate: '2026-02-18',
        factoryPhotos: [
          'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=500'
        ],
        videos: []
      },
      {
        id: 'comp_jaipur',
        name: 'Jaipur Block & Ethnic wear',
        type: 'supplier',
        country: 'India',
        contactEmail: 'info@jaipurethnic.com',
        logo: '🎨',
        rating: 4.3,
        trustScore: 83,
        certifications: ['GOTS', 'Fair Trade', 'ISO 14001'],
        productCategories: ['Ethnicwear', 'Home Textiles', 'Hand Block Prints'],
        stitchingCapacityPerDay: 8000,
        noOfMachines: 120,
        moq: 500,
        leadTimeDays: 40,
        exportMarkets: ['France', 'Japan', 'USA'],
        location: 'Jaipur, Rajasthan',
        monthlyCapacity: 150000,
        currentBookedCapacity: 110000,
        availableCapacity: 40000,
        otd: 85,
        qualityPerformance: 80,
        responseTime: 88,
        repeatOrdersRate: 82,
        auditStatus: 'Pending',
        auditDate: '2026-05-01',
        factoryPhotos: [
          'https://images.unsplash.com/photo-1513829096999-4978602297af?w=500'
        ],
        videos: []
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
        location: 'Kolkata, West Bengal',
        monthlyCapacity: 250000,
        currentBookedCapacity: 200000,
        availableCapacity: 50000,
        otd: 92,
        qualityPerformance: 94,
        responseTime: 88,
        repeatOrdersRate: 90,
        auditStatus: 'Verified',
        auditDate: '2026-03-25',
        factoryPhotos: [],
        videos: []
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
        location: 'Ludhiana, Punjab',
        monthlyCapacity: 200000,
        currentBookedCapacity: 170000,
        availableCapacity: 30000,
        otd: 88,
        qualityPerformance: 87,
        responseTime: 85,
        repeatOrdersRate: 85,
        auditStatus: 'Not Audited',
        factoryPhotos: [],
        videos: []
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

    const batch = writeBatch(db);
    defaultCompanies.forEach(comp => {
      batch.set(doc(db, COLLECTION_NAME, comp.id), comp);
    });
    try {
      await batch.commit();
      console.log('[Seeding] Successfully loaded factories to Firestore!');
    } catch (err) {
      console.error('Error seeding companies: ', err);
    }
  }
};
