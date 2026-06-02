/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertNotification } from '../types';
import { handleFirestoreError, OperationType } from './firebaseUtils';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  async getNotifications(): Promise<AlertNotification[]> {
    try {
      const q = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(q);
      const results: AlertNotification[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data() as AlertNotification);
      });
      // Sort in-memory by timestamp
      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    }
  },

  async createNotification(notification: AlertNotification): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTION_NAME, notification.id), notification);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${notification.id}`);
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async seedNotificationsIfNeeded(): Promise<void> {
    const current = await this.getNotifications();
    if (current.length > 0) return;

    console.log('[Seeding] Seeding initial alerts...');
    const defaultAlerts: AlertNotification[] = [
      {
        id: 'm_alert_1',
        poId: 'po_456',
        poNumber: 'PO-58241',
        type: 'delay',
        severity: 'warning',
        message: 'Fabric dispatch is delayed 10 days due to customs clearance hold @ Mumbai Port.',
        timestamp: new Date().toISOString(),
        isRead: false
      },
      {
        id: 'm_alert_2',
        poId: 'po_789',
        poNumber: 'PO-32149',
        type: 'quality',
        severity: 'critical',
        message: 'Intertek Inline Quality report failed with defect rate 7.5% (AQL standard max 2.5%)',
        timestamp: new Date().toISOString(),
        isRead: false
      }
    ];

    const batch = writeBatch(db);
    defaultAlerts.forEach(alert => {
      batch.set(doc(db, COLLECTION_NAME, alert.id), alert);
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error('Error seeding notifications: ', err);
    }
  }
};
