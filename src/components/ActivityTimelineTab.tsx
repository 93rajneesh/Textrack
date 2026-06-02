/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivityLog } from '../types';
import { History, Search, CircleSlash, RefreshCw, Layers, FileText, CheckCircle2, TrendingUp } from 'lucide-react';

interface ActivityTimelineTabProps {
  poId: string;
  logs: ActivityLog[];
  onRefresh: () => void;
}

export default function ActivityTimelineTab({ poId, logs = [], onRefresh }: ActivityTimelineTabProps) {
  const [filter, setFilter] = useState<'ALL' | 'PRODUCTION' | 'QUALITY' | 'SHIPMENT' | 'DOCUMENT'>('ALL');
  const [search, setSearch] = useState('');

  // 1. Dynamic Tag/Category mapping based on action string analysis
  const getLogCategory = (log: ActivityLog): 'PRODUCTION' | 'QUALITY' | 'SHIPMENT' | 'DOCUMENT' | 'GENERAL' => {
    const act = log.action.toLowerCase();
    if (log.entityType === 'Document' || act.includes('document') || act.includes('tech pack') || act.includes('bom')) return 'DOCUMENT';
    if (log.entityType === 'Quality' || act.includes('inspection') || act.includes('quality') || act.includes('audit')) return 'QUALITY';
    if (log.entityType === 'Shipment' || act.includes('shipment') || act.includes('on water') || act.includes('packed') || act.includes('delivered')) return 'SHIPMENT';
    if (log.entityType === 'Milestone' || log.entityType === 'PO' || act.includes('production') || act.includes('progress') || act.includes('stage') || act.includes('milestone') || act.includes('sewing') || act.includes('stitching') || act.includes('cutting')) return 'PRODUCTION';
    return 'GENERAL';
  };

  // 2. Filter and search
  const filteredLogs = logs.filter(log => {
    const category = getLogCategory(log);
    const matchesFilter = filter === 'ALL' || category === filter;
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) || 
                          log.userName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'PRODUCTION':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Production', icon: <TrendingUp className="w-3.5 h-3.5" /> };
      case 'QUALITY':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'Quality', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case 'SHIPMENT':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', text: 'Shipping', icon: <History className="w-3.5 h-3.5" /> };
      case 'DOCUMENT':
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'General', icon: <Layers className="w-3.5 h-3.5" /> };
    }
  };

  return (
    <div className="space-y-6" id="activity-log-system">
      {/* Search and category filters */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-slate-800" /> Procurement & Shopfloor Activity Logs
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time unalterable record of contracts, approvals, revisions, audits and comments</p>
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer bg-white text-slate-600 hover:text-slate-950 flex items-center gap-1.5 font-mono text-[10px] font-black"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Live Feed
          </button>
        </div>

        {/* Filters and search panel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit actions, uploader names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-slate-950 placeholder:text-slate-400"
            />
          </div>

          {/* Quick categories selectors */}
          <div className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
            {['ALL', 'PRODUCTION', 'QUALITY', 'SHIPMENT', 'DOCUMENT'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat as any)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  filter === cat ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit timeline feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 max-w-sm mx-auto space-y-2">
            <CircleSlash className="w-8 h-8 text-slate-300 mx-auto" />
            <h5 className="font-bold text-xs text-slate-700 uppercase tracking-widest leading-none">No Activity Logs Found</h5>
            <p className="text-[11px] leading-relaxed">No actions match your current search queries or filter attributes.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-5">
            {filteredLogs.map((log) => {
              const category = getLogCategory(log);
              const theme = getCategoryTheme(category);

              return (
                <div key={log.id} className="relative group">
                  {/* Vertical line dot node */}
                  <div className="absolute -left-[27.5px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300 group-hover:border-slate-800 transition-colors shadow-3xs" />

                  <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 p-4.5 bg-slate-50/20 hover:bg-slate-50/70 border border-slate-100 rounded-2xl transition-all">
                    {/* Timestamp column */}
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <strong className="block text-slate-600 font-bold">{new Date(log.timestamp).toLocaleDateString()}</strong>
                      <span className="block">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Action Content column */}
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-xs text-slate-900 font-semibold leading-normal">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span>Initiated by: </span>
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase leading-none">
                          {log.userName}
                        </span>
                      </div>
                    </div>

                    {/* Label/Category Tag column */}
                    <div className="flex justify-start md:justify-end">
                      <span className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase font-mono tracking-wider flex items-center gap-1 ${theme.bg}`}>
                        {theme.icon}
                        {theme.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
