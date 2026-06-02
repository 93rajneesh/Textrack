/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TNAEvent, UserProfile } from '../types';
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, HelpCircle, Activity, ChevronRight, MessageSquareCode, PlusCircle, Edit } from 'lucide-react';

interface TNACalendarTabProps {
  poId: string;
  milestones: any[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

export default function TNACalendarTab({ poId, milestones = [], currentUser, onRefresh }: TNACalendarTabProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'table'>('timeline');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editActualDate, setEditActualDate] = useState<string>('');

  // Stats calculation
  const total = milestones.length;
  const completed = milestones.filter(m => m.calculatedStatus === 'Completed').length;
  const delayed = milestones.filter(m => m.calculatedStatus === 'Delayed').length;
  const pending = total - completed - delayed;

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${poId}/tna/${selectedEvent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          remarks: editRemarks,
          actualDate: editStatus === 'Completed' ? (editActualDate || new Date().toISOString().split('T')[0]) : ''
        })
      });

      if (response.ok) {
        setSelectedEvent(null);
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to update milestone: ' + err.error);
      }
    } catch (err: any) {
      alert('Network error updating milestone: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          text: 'Completed'
        };
      case 'Delayed':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
          dot: 'bg-rose-500',
          text: 'Delayed'
        };
      case 'On Track':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          text: 'On Track'
        };
      default: // Pending / Risk
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          text: 'Pending'
        };
    }
  };

  return (
    <div className="space-y-6" id="tna-calendar-module">
      {/* 1. Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div>
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-800" /> Time & Action (TNA) Critical Path Ledger
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Track production bottlenecks, calculated delay forecasting, and buyer-supplier checklists</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
          {[
            { id: 'timeline', label: 'Chronological Timeline' },
            { id: 'calendar', label: 'Month Grid' },
            { id: 'table', label: 'Tabular Checklist' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setViewMode(btn.id as any)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === btn.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. KPI Scorecard Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="tna-kpis-board">
        {[
          { label: 'Total Milestones', value: total, desc: 'Critical path touchpoints', labelColor: 'text-slate-400', valColor: 'text-slate-800' },
          { label: 'Completed Checks', value: completed, desc: `Success pass rate ${Math.round((completed / (total || 1)) * 100)}%`, labelColor: 'text-emerald-500', valColor: 'text-emerald-600' },
          { label: 'Pending Slots', value: pending, desc: 'Underway or upcoming', labelColor: 'text-amber-500', valColor: 'text-amber-600' },
          { label: 'Delay Deficiencies', value: delayed, desc: `${delayed} tasks require mitigation`, labelColor: 'text-rose-500', valColor: 'text-rose-600' }
        ].map((kpi, idx) => (
          <div key={idx} className="border border-slate-200 bg-white rounded-xl p-4 shadow-2xs">
            <span className={`text-[10px] font-mono leading-none block uppercase font-black uppercase ${kpi.labelColor}`}>{kpi.label}</span>
            <span className={`text-2xl font-black font-mono block mt-2 ${kpi.valColor}`}>{kpi.value}</span>
            <span className="text-[10px] text-slate-400 block mt-1">{kpi.desc}</span>
          </div>
        ))}
      </div>

      {/* 3. Editor Sidebar Modal/Drawer for Milestone Update */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4">
              <h4 className="font-bold text-sm">Update Checklist Milestone</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedEvent.name}</p>
            </div>
            <form onSubmit={handleUpdateMilestone} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">State Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Pending">Pending</option>
                  <option value="On Track">On Track (Clear)</option>
                  <option value="Completed">Completed (Passed)</option>
                  <option value="Delayed">Delayed (Stuck)</option>
                </select>
              </div>

              {editStatus === 'Completed' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Completion/Actual Date</label>
                  <input
                    type="date"
                    value={editActualDate}
                    onChange={(e) => setEditActualDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Remarks / Bottleneck updates</label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Fabric test lab report approved by Intertek, some minor GSM variances."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-20 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-6" id="tna-timeline-view">
          <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
            {milestones.map((item, index) => {
              const style = getStatusColor(item.calculatedStatus);
              const isOwner = currentUser.role === 'admin' || 
                (currentUser.role === 'buyer' && item.owner === 'Buyer') ||
                (currentUser.role === 'supplier' && item.owner === 'Supplier') ||
                (currentUser.role === 'qa' && item.owner === 'QA');

              return (
                <div key={item.id} className="relative group">
                  {/* Circle Node */}
                  <div className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white ${style.dot} ring-1 ring-slate-200 flex items-center justify-center shrink-0 shadow-2xs`} />

                  <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-wrap md:flex-nowrap justify-between gap-4 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-black tracking-wider border ${style.bg}`}>
                          {style.text}
                        </span>
                        {item.calculatedDelay > 0 && (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono border border-rose-200">
                            ⚠️ +{item.calculatedDelay} Days Late
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Target Date: <strong className="text-slate-600">{item.plannedDate}</strong>
                        </span>
                        {item.actualDate && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed At: <strong>{item.actualDate}</strong>
                          </span>
                        )}
                        <span>
                          Responsibility: <strong className="bg-slate-200/50 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase text-[9px]">{item.owner}</strong>
                        </span>
                      </div>

                      {item.remarks && (
                        <p className="text-[11px] text-slate-500 bg-white border border-slate-100 p-2 rounded-lg italic leading-relaxed">
                          "{item.remarks}"
                        </p>
                      )}
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => {
                          setSelectedEvent(item);
                          setEditStatus(item.status);
                          setEditRemarks(item.remarks || '');
                          setEditActualDate(item.actualDate || '');
                        }}
                        className="bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold font-mono text-[10px] flex items-center gap-1 self-center transition-all cursor-pointer shadow-3xs"
                      >
                        <Edit className="w-3 h-3" /> Update Check
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Calendar Grid View */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4" id="tna-calendar-view">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {milestones.map((item) => {
              const style = getStatusColor(item.calculatedStatus);
              return (
                <div key={item.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-34 hover:bg-slate-50 hover:border-slate-300 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 font-bold block">{item.plannedDate}</span>
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-extrabold uppercase shrink-0 border ${style.bg}`}>
                        {style.text}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-slate-800 block truncate">{item.name}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Role: <strong className="text-slate-600 uppercase text-[9px]">{item.owner}</strong></span>
                    {item.calculatedDelay > 0 && <span className="text-rose-600 font-bold">+{item.calculatedDelay}d deviation</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. List Checklist View */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden" id="tna-table-view">
          <table className="w-full text-left text-slate-600 text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono font-bold text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="p-4">Milestone Touchpoint</th>
                <th className="p-4">Responsibility</th>
                <th className="p-4">Target Date</th>
                <th className="p-4">Actual Completed</th>
                <th className="p-4">Calculated Slip</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {milestones.map((item) => {
                const style = getStatusColor(item.calculatedStatus);
                const isOwner = currentUser.role === 'admin' || 
                  (currentUser.role === 'buyer' && item.owner === 'Buyer') ||
                  (currentUser.role === 'supplier' && item.owner === 'Supplier') ||
                  (currentUser.role === 'qa' && item.owner === 'QA');

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-4 font-bold text-slate-950">
                      <div>{item.name}</div>
                      {item.remarks && <p className="text-[10px] text-slate-400 mt-0.5 italic">"{item.remarks}"</p>}
                    </td>
                    <td className="p-4 uppercase text-[10px] font-black text-slate-500 font-mono">{item.owner}</td>
                    <td className="p-4 font-mono font-bold text-slate-500">{item.plannedDate}</td>
                    <td className="p-4 font-mono text-emerald-600 font-semibold">{item.actualDate || '-'}</td>
                    <td className="p-4 font-mono font-black">
                      {item.calculatedDelay > 0 ? (
                        <span className="text-rose-600">+{item.calculatedDelay} days</span>
                      ) : (
                        <span className="text-slate-400">0 days</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border ${style.bg}`}>
                        {style.text}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {isOwner && (
                        <button
                          onClick={() => {
                            setSelectedEvent(item);
                            setEditStatus(item.status);
                            setEditRemarks(item.remarks || '');
                            setEditActualDate(item.actualDate || '');
                          }}
                          className="text-blue-600 hover:text-blue-900 font-mono font-bold uppercase text-[10px] hover:underline cursor-pointer"
                        >
                          Modify
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
