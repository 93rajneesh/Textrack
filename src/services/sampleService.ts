/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Sample } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { orderService } from './orderService';

const SAMPLES_COLLECTION = 'samples';

export const sampleService = {
  async getSamplesForOrder(orderId: string): Promise<Sample[]> {
    try {
      const q = query(collection(db, SAMPLES_COLLECTION), where('orderId', '==', orderId));
      const snapshot = await getDocs(q);
      const results: Sample[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as Sample);
      });
      // Sort in-memory: newest submitted first
      return results.sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, SAMPLES_COLLECTION);
    }
  },

  async getSampleById(id: string): Promise<Sample | null> {
    try {
      const docRef = doc(db, SAMPLES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Sample;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${SAMPLES_COLLECTION}/${id}`);
    }
  },

  async submitSample(sample: Sample, userId: string, userName: string): Promise<void> {
    try {
      await setDoc(doc(db, SAMPLES_COLLECTION, sample.id), sample);

      // Log activity
      await orderService.addActivityLog({
        id: `act_sample_${Date.now()}`,
        orderId: sample.orderId,
        poId: sample.orderId,
        companyId: 'comp_tirupur', // default supplier company ID
        userId,
        userName,
        entityType: 'Sample',
        entityId: sample.id,
        newValue: sample.status,
        action: `${userName} submitted a new ${sample.sampleType} for approval. Notes: "${sample.comments}"`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${SAMPLES_COLLECTION}/${sample.id}`);
    }
  },

  async updateSampleStatus(
    sampleId: string,
    status: 'Approved' | 'Rejected' | 'Revision Requested',
    comments: string,
    userId: string,
    userName: string
  ): Promise<Sample> {
    try {
      const sample = await this.getSampleById(sampleId);
      if (!sample) throw new Error('Sample not found');

      const oldStatus = sample.status;
      sample.status = status;
      sample.comments = comments;
      
      if (status === 'Approved') {
        sample.approvalDate = new Date().toISOString().split('T')[0];
      }

      // Add feedback history
      if (!sample.feedbackHistory) sample.feedbackHistory = [];
      sample.feedbackHistory.unshift({
        date: new Date().toISOString(),
        by: userName,
        status,
        comments
      });

      await updateDoc(doc(db, SAMPLES_COLLECTION, sampleId), {
        status,
        comments,
        approvalDate: sample.approvalDate || null,
        feedbackHistory: sample.feedbackHistory
      });

      // Log activity
      await orderService.addActivityLog({
        id: `act_sample_eval_${Date.now()}`,
        orderId: sample.orderId,
        poId: sample.orderId,
        companyId: 'comp_target', // default buyer company ID
        userId,
        userName,
        entityType: 'Sample',
        entityId: sampleId,
        oldValue: oldStatus,
        newValue: status,
        action: `${userName} ${status.toUpperCase()} the [${sample.sampleType}]. Comments: "${comments}"`,
        timestamp: new Date().toISOString()
      });

      return sample;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${SAMPLES_COLLECTION}/${sampleId}`);
    }
  },

  async seedSamplesIfNeeded(): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, SAMPLES_COLLECTION));
      if (!snapshot.empty) return;

      console.log('[Seeding] Seeding initial garment samples...');
      
      const defaultSamples: Sample[] = [
        {
          id: 'samp_1',
          orderId: 'po_123',
          sampleType: 'Proto Sample',
          submitDate: '2026-05-02',
          approvalDate: '2026-05-03',
          status: 'Approved',
          comments: 'The initial draft style pattern matches specs beautifully. Fabric GSM verified.',
          photos: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500'],
          feedbackHistory: [
            {
              date: '2026-05-03T11:45:00Z',
              by: 'Rajneesh Sengupta',
              status: 'Approved',
              comments: 'Pattern drape is excellent. Organic single-knit jersey approved for pre-production.'
            }
          ]
        },
        {
          id: 'samp_2',
          orderId: 'po_123',
          sampleType: 'PP Sample',
          submitDate: '2026-05-10',
          status: 'Pending',
          comments: 'Submitted PP sample with Pacific Aqua Blue shade band and eco-friendly dye fixing.',
          photos: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500'],
          feedbackHistory: []
        },
        {
          id: 'samp_3',
          orderId: 'po_456',
          sampleType: 'Proto Sample',
          submitDate: '2026-05-15',
          status: 'Revision Requested',
          comments: 'Classic White & Blue stripe alignment on cuff sleeve joints deviates by 5mm.',
          photos: ['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500'],
          feedbackHistory: [
            {
              date: '2026-05-18T14:30:00Z',
              by: 'Merchandiser (Buyer)',
              status: 'Revision Requested',
              comments: 'Please align the stripe patterns exactly along the sleeve hem line. Re-submit fresh fit sample.'
            }
          ]
        }
      ];

      for (const sample of defaultSamples) {
        await setDoc(doc(db, SAMPLES_COLLECTION, sample.id), sample);
      }
    } catch (err) {
      console.error('Error seeding samples:', err);
    }
  }
};
