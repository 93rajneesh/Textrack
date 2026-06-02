/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TNAEvent } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { orderService } from './orderService';

const TNA_COLLECTION = 'tna_events';

export const DEFAULT_TNA_MILESTONES = [
  'Order Confirmation',
  'Fabric Booking',
  'Lab Dip Approval',
  'PP Sample',
  'Fabric In-House',
  'Cutting Start',
  'Sewing Start',
  'Inline Inspection',
  'Final Inspection',
  'Packing',
  'Shipment'
];

export const tnaService = {
  async getTNAEventsForOrder(poId: string): Promise<TNAEvent[]> {
    try {
      const q = query(collection(db, TNA_COLLECTION), where('poId', '==', poId));
      const snapshot = await getDocs(q);
      const results: TNAEvent[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as TNAEvent;
        // Map fields to guarantee compatibility
        results.push({
          ...data,
          eventName: data.eventName || data.name,
          orderId: data.orderId || data.poId
        });
      });
      
      // Sort chronologically by plannedDate
      return results.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, TNA_COLLECTION);
    }
  },

  async updateTNAEvent(eventId: string, updates: Partial<TNAEvent>, userId: string, userName: string): Promise<void> {
    try {
      await updateDoc(doc(db, TNA_COLLECTION, eventId), updates);

      // Fetch the updated doc to log its order activity
      const docRef = doc(db, TNA_COLLECTION, eventId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const tna = snap.data() as TNAEvent;
        const details = [];
        if (updates.status) details.push(`status: [${updates.status}]`);
        if (updates.actualDate) details.push(`actualDate: [${updates.actualDate}]`);
        if (updates.remarks) details.push(`remarks: "${updates.remarks}"`);

        await orderService.addActivityLog({
          id: `act_tna_${Date.now()}`,
          orderId: tna.poId,
          poId: tna.poId,
          companyId: tna.owner === 'Buyer' ? 'comp_target' : 'comp_tirupur',
          userId,
          userName,
          entityType: 'Milestone',
          entityId: eventId,
          action: `${userName} updated TNA milestone checkpoint [${tna.name}] to ${details.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${TNA_COLLECTION}/${eventId}`);
    }
  },

  async generateDefaultTNAEvents(poId: string, orderDateStr: string, deliveryDateStr: string): Promise<void> {
    try {
      const oDate = new Date(orderDateStr);
      const dDate = new Date(deliveryDateStr);
      const totalDays = Math.max(10, Math.ceil((dDate.getTime() - oDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const addDays = (d: Date, days: number): string => {
        const res = new Date(d);
        res.setDate(res.getDate() + days);
        return res.toISOString().split('T')[0];
      };

      // Distribute milestones beautifully over the lead time percentage
      const segments: { name: string; pct: number; owner: string }[] = [
        { name: 'Order Confirmation', pct: 0, owner: 'Buyer' },
        { name: 'Fabric Booking', pct: 0.1, owner: 'Supplier' },
        { name: 'Lab Dip Approval', pct: 0.2, owner: 'Buyer' },
        { name: 'PP Sample', pct: 0.35, owner: 'Buyer' },
        { name: 'Fabric In-House', pct: 0.5, owner: 'Supplier' },
        { name: 'Cutting Start', pct: 0.55, owner: 'Supplier' },
        { name: 'Sewing Start', pct: 0.65, owner: 'Supplier' },
        { name: 'Inline Inspection', pct: 0.75, owner: 'QA' },
        { name: 'Final Inspection', pct: 0.85, owner: 'QA' },
        { name: 'Packing', pct: 0.92, owner: 'Supplier' },
        { name: 'Shipment', pct: 1.0, owner: 'Supplier' }
      ];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const eventId = `tna_${poId}_${i}`;
        const plannedDate = addDays(oDate, Math.floor(totalDays * seg.pct));
        
        let initialStatus: 'Completed' | 'On Track' | 'Pending' | 'Delayed' = 'Pending';
        let actualDate: string | undefined = undefined;

        if (seg.pct === 0) {
          initialStatus = 'Completed';
          actualDate = orderDateStr;
        }

        const newTna: TNAEvent = {
          id: eventId,
          poId,
          orderId: poId,
          name: seg.name,
          eventName: seg.name,
          owner: seg.owner,
          plannedDate,
          actualDate,
          status: initialStatus,
          remarks: seg.pct === 0 ? 'Bulk order terms confirmed and locked.' : undefined
        };

        await setDoc(doc(db, TNA_COLLECTION, eventId), newTna);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${TNA_COLLECTION}/generate_${poId}`);
    }
  },

  /**
   * Auto calculates delays and states for TNA milestones dynamically.
   * Returns stats: { total, completed, pending, delayed, listWithDelays }
   */
  processTNAEvents(events: TNAEvent[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let completed = 0;
    let pending = 0;
    let delayed = 0;

    const listWithDelays = events.map(ev => {
      // delay in days
      let calculatedDelay = 0;
      let calculatedStatus: 'Completed' | 'On Track' | 'Delayed' | 'Pending' = ev.status;

      const planned = new Date(ev.plannedDate);

      if (ev.status === 'Completed' || ev.status === 'On Track' && ev.actualDate) {
        completed++;
        const actual = ev.actualDate ? new Date(ev.actualDate) : planned;
        calculatedDelay = Math.max(0, Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)));
        if (calculatedDelay > 0) {
          calculatedStatus = 'Delayed';
        } else {
          calculatedStatus = 'Completed';
        }
      } else {
        // Not completed yet
        if (today > planned) {
          calculatedDelay = Math.ceil((today.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
          calculatedStatus = 'Delayed';
          delayed++;
        } else {
          // If close within 3 days and not completed, its at risk ("Pending" but yellow "Risk" coded)
          const diffDays = Math.ceil((planned.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 3) {
            calculatedStatus = 'Pending'; // We'll represent this as Risk (Yellow) in UI
          } else {
            calculatedStatus = 'Pending';
          }
          pending++;
        }
      }

      return {
        ...ev,
        calculatedDelay,
        calculatedStatus
      };
    });

    return {
      total: events.length,
      completed,
      pending,
      delayed,
      milestones: listWithDelays
    };
  },

  async seedTNAEventsIfNeeded(): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, TNA_COLLECTION));
      if (!snapshot.empty) return;

      console.log('[Seeding] Seeding Time & Action calendar milestones for seed orders...');
      // Generate for po_123, po_456, and po_789
      await this.generateDefaultTNAEvents('po_123', '2026-05-01', '2026-06-15');
      await this.generateDefaultTNAEvents('po_456', '2026-05-10', '2026-06-25');
      await this.generateDefaultTNAEvents('po_789', '2026-05-05', '2026-06-20');

      // Add actual dates or specific anomalies manually to reflect real delays!
      // po_456 is delayed on "Fabric Booking" and "Lab Dip Approval" due to customs stuck cargo!
      const items456 = await this.getTNAEventsForOrder('po_456');
      const fabricBooking = items456.find(t => t.name === 'Fabric Booking');
      if (fabricBooking) {
        await this.updateTNAEvent(fabricBooking.id, {
          status: 'Delayed',
          remarks: 'Cargo held up under Customs Inspection release queries at JNPT Mumbai.'
        }, 'usr_supplier1', 'Mumbai Customs Clearance Coordinator');
      }

    } catch (err) {
      console.error('Error seeding TNA events:', err);
    }
  }
};
