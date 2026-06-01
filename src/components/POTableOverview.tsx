/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PurchaseOrder, AlertNotification } from '../types';
import { 
  Plus, AlertTriangle, AlertCircle, Info, Calendar, ArrowRight,
  TrendingUp, Truck, CheckCircle2, ShieldCheck, ShoppingBag
} from 'lucide-react';

interface POTableOverviewProps {
  orders: PurchaseOrder[];
  alerts: AlertNotification[];
  onSelectOrder: (poId: string) => void;
  onOpenCreateOrder: () => void;
}

export default function POTableOverview({ 
  orders, 
  alerts, 
  onSelectOrder, 
  onOpenCreateOrder 
}: POTableOverviewProps) {

  // Overall counters
  const totalPO = orders.length;
  const inProduction = orders.filter(o => o.status === 'In Production').length;
  const delayedPO = orders.filter(o => o.status === 'Delayed').length;
  const readyToShip = orders.filter(o => o.status === 'Ready to Ship' || o.status === 'On Water').length;
  const completed = orders.filter(o => o.status === 'Completed').length;

  const getConfidenceBadge = (score: number) => {
    if (score >= 85) {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs leading-none font-bold font-mono">
          🏆 {score}% High
        </span>
      );
    } else if (score >= 65) {
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-xs leading-none font-bold font-mono">
          ⚡ {score}% Stable
        </span>
      );
    } else {
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs leading-none font-bold font-mono animate-pulse">
          🚨 {score}% At Risk
        </span>
      );
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch(status) {
      case 'Completed':
        return <span className="bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Shipped / Completed</span>;
      case 'On Water':
        return <span className="bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">🚢 Cargo On Water</span>;
      case 'Ready to Ship':
        return <span className="bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">📦 Packed & Ready</span>;
      case 'Delayed':
        return <span className="bg-rose-100/70 text-rose-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold animate-pulse">⚠️ Delayed</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Stitching Live</span>;
    }
  };

  return (
    <div className="space-y-6" id="overview-tabs-contents">
      {/* 1. Metric Counter Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="overview-counters">
        {[
          { label: 'Total active contracts', val: totalPO, icon: <ShoppingBag className="w-4 h-4 text-blue-500" />, bg: 'bg-white' },
          { label: 'Live production lines', val: inProduction, icon: <TrendingUp className="w-4 h-4 text-blue-500 animate-pulse" />, bg: 'bg-white' },
          { label: 'Critical delays reported', val: delayedPO, icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, bg: delayedPO > 0 ? 'bg-rose-50/20 border-rose-200 shadow-rose-100/10' : 'bg-white' },
          { label: 'Packed / Ocean cargo', val: readyToShip, icon: <Truck className="w-4 h-4 text-amber-500" />, bg: 'bg-white' },
          { label: 'Delivered historical logs', val: completed, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, bg: 'bg-white' }
        ].map((card, idx) => (
          <div key={idx} className={`border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs ${card.bg}`}>
            <span className="text-slate-400 font-mono text-[10px] uppercase block leading-none">{card.label}</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl font-black font-mono text-slate-800">{card.val}</span>
              <div className="p-1.5 rounded-lg bg-slate-100">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Critical Alerts Notification bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="alerts-board">
        <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest text-slate-400 mb-3.5 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-slate-500" /> Critical Shopfloor Alerts & Escalations
        </h4>
        
        {alerts.length > 0 ? (
          <div className="space-y-2.5">
            {alerts.filter(a => !a.isRead || a.severity === 'critical').slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                onClick={() => onSelectOrder(alert.poId)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs ${
                  alert.severity === 'critical'
                    ? 'border-rose-200 bg-rose-50/20'
                    : alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-blue-200 bg-blue-50/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 ${alert.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 text-xs block leading-normal">{alert.message}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block uppercase font-bold text-blue-600">{alert.poNumber} • Onsite Audit Alerts</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-xs italic py-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sourcing flow is completely clear of delay predictions.
          </div>
        )}
      </div>

      {/* 3. Primary Purchase Orders List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" id="pom-master-table">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 flex-wrap gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              Sourcing Procurement Agreements (PO Tracking list)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time stitching stages, AQL pass-rate profiles, and delay-proofing matrix</p>
          </div>
          
          <button
            onClick={onOpenCreateOrder}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            id="issue-new-po-btn"
          >
            <Plus className="w-4 h-4" /> Create New Sourcing PO
          </button>
        </div>

        {orders.length > 0 ? (
          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-mono uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <th className="p-4 pl-5">PO Number</th>
                  <th className="p-4">Fabric style specs</th>
                  <th className="p-4">Indian manufacturer</th>
                  <th className="p-4">Amount & Quantity</th>
                  <th className="p-4">Track Progress status</th>
                  <th className="p-4 text-center">AQL Confidence</th>
                  <th className="p-4 text-right pr-5 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {orders.map((po) => {
                  // Get active stage
                  const currentActiveStageIndex = po.stages.findIndex(s => s.status === 'in_progress' || s.status === 'delayed');
                  const lastCompletedStageIndex = po.stages.reduce((last, s, i) => s.status === 'completed' ? i : last, -1);
                  const activeStageName = currentActiveStageIndex !== -1 
                    ? po.stages[currentActiveStageIndex].name 
                    : lastCompletedStageIndex !== -1 
                    ? po.stages[lastCompletedStageIndex].name 
                    : 'Fabric Sourcing';

                  // Calc completed yield
                  const overallProgress = Math.round(
                    po.stages.reduce((sum, st) => sum + st.progress, 0) / po.stages.length
                  );

                  return (
                    <tr 
                      key={po.id} 
                      className="hover:bg-slate-50/50 transition-all group"
                      id={`po-row-${po.id}`}
                    >
                      {/* PO Number */}
                      <td className="p-4 pl-5 font-mono text-slate-800 font-bold block mt-1.5 group-hover:text-blue-600">
                        {po.poNumber}
                      </td>

                      {/* Style specs */}
                      <td className="p-4">
                        <div>
                          <span className="font-bold block text-slate-900 group-hover:text-blue-600 font-sans">{po.styleName}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{po.color} • {po.fabricType}</span>
                        </div>
                      </td>

                      {/* Manufacturer */}
                      <td className="p-4 font-semibold text-slate-700">
                        {po.supplierCompanyName}
                      </td>

                      {/* Amount & Qty */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 font-mono">
                          {po.orderQty.toLocaleString()} units @ ${po.unitPrice.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Total: ${(po.orderQty * po.unitPrice).toLocaleString()} USD</span>
                      </td>

                      {/* Progress linear map */}
                      <td className="p-4">
                        <div className="space-y-1 w-44">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-800">{activeStageName}</span>
                            <span className="font-mono text-slate-500 font-semibold">{overallProgress}%</span>
                          </div>
                          
                          {/* Visual map bubble stepper */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${po.status === 'Delayed' ? 'bg-rose-500' : 'bg-blue-600 animate-pulse'}`}
                              style={{ width: `${overallProgress}%` }}
                            ></div>
                          </div>
                          <span className="block text-[10px] text-slate-400">{getOrderStatusBadge(po.status)}</span>
                        </div>
                      </td>

                      {/* Trust index Confidence Badge */}
                      <td className="p-4 text-center">
                        {getConfidenceBadge(po.confidenceScore)}
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right pr-5">
                        <button
                          onClick={() => onSelectOrder(po.id)}
                          className="bg-slate-50 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white rounded-xl px-3 py-1.5 font-bold transition-all text-slate-700 cursor-pointer shadow-2xs"
                        >
                          Workspace
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            No active sourcing contracts created yet. Initiate a new PO using target factory specs!
          </div>
        )}
      </div>
    </div>
  );
}
