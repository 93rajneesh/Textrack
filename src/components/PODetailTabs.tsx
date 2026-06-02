/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PurchaseOrder, ProductionStage, ChatMessage, QualityReport, UserProfile } from '../types';
import { 
  CheckCircle2, Clock, Play, AlertTriangle, FileText, Send, Paperclip, 
  Settings, Award, RefreshCw, BarChart2, Plus, Calendar, Camera, Info, ThumbsUp, Activity
} from 'lucide-react';
import TNACalendarTab from './TNACalendarTab';
import SampleTrackingTab from './SampleTrackingTab';
import DocumentCenterTab from './DocumentCenterTab';
import ActivityTimelineTab from './ActivityTimelineTab';

interface PODetailTabsProps {
  order: PurchaseOrder;
  currentUser: UserProfile;
  onUpdateStage: (stageName: string, updateData: any) => void;
  onUpdateMaterials: (materials: any) => void;
  onPostChatMessage: (msgText: string, filename?: string, url?: string) => void;
  onSubmitInspection: (report: any) => void;
  onRefresh?: () => void;
}

export default function PODetailTabs({ 
  order, 
  currentUser, 
  onUpdateStage, 
  onUpdateMaterials,
  onPostChatMessage,
  onSubmitInspection,
  onRefresh = () => {}
}: PODetailTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'tna' | 'samples' | 'chat' | 'quality' | 'documents_custom' | 'audit_feed'>('timeline');


  // Stage Update states
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageProgress, setStageProgress] = useState(0);
  const [stageQty, setStageQty] = useState(0);
  const [stageStatus, setStageStatus] = useState<'pending' | 'in_progress' | 'completed' | 'delayed'>('pending');
  const [stageNotes, setStageNotes] = useState('');
  const [stagePhoto, setStagePhoto] = useState('');

  // Chat/Attachment states
  const [msgText, setMsgText] = useState('');
  const [mockAttachment, setMockAttachment] = useState<string | null>(null);

  // QA Inspection Form states
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspType, setInspType] = useState<'Inline' | 'Mid-line' | 'Final'>('Inline');
  const [inspInspector, setInspInspector] = useState('Anil Gupta (Intertek)');
  const [inspSampleSize, setInspSampleSize] = useState(200);
  const [inspDefects, setInspDefects] = useState(0);
  const [inspResult, setInspResult] = useState<'Pass' | 'Fail'>('Pass');
  const [inspComments, setInspComments] = useState('');

  const handleStageEditOpen = (stage: ProductionStage) => {
    setEditingStage(stage.name);
    setStageProgress(stage.progress);
    setStageQty(stage.completedQty || 0);
    setStageStatus(stage.status);
    setStageNotes(stage.notes || '');
    setStagePhoto(stage.photoUrl || '');
  };

  const handleStageSave = () => {
    if (!editingStage) return;
    onUpdateStage(editingStage, {
      status: stageStatus,
      progress: stageProgress,
      completedQty: stageQty,
      notes: stageNotes,
      photoUrl: stagePhoto
    });
    setEditingStage(null);
  };

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() && !mockAttachment) return;
    
    if (mockAttachment) {
      onPostChatMessage(msgText || `Uploaded file: ${mockAttachment}`, mockAttachment, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500');
      setMockAttachment(null);
    } else {
      onPostChatMessage(msgText);
    }
    setMsgText('');
  };

  const handleQAFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defectBreakdown: any = {};
    if (inspDefects > 0) {
      defectBreakdown['Sewing irregular'] = Math.floor(inspDefects * 0.4);
      defectBreakdown['Measurement margin'] = Math.floor(inspDefects * 0.3);
      defectBreakdown['Broken needle / Stain'] = inspDefects - (defectBreakdown['Sewing irregular'] + defectBreakdown['Measurement margin']);
    }

    onSubmitInspection({
      inspectorName: inspInspector,
      type: inspType,
      sampleSize: inspSampleSize,
      defectsCount: inspDefects,
      result: inspResult,
      comments: inspComments,
      defectBreakdown
    });

    setInspectionOpen(false);
    // Reset parameters
    setInspDefects(0);
    setInspComments('');
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none">Completed</span>;
      case 'in_progress':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none">Activity: Live</span>;
      case 'delayed':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none animate-pulse">Delayed</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none">Pending</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="po-interactive-tabs">
      {/* Sub Tabs bar */}
      <div className="border-b border-slate-200 flex flex-wrap bg-slate-50/50">
        {[
          { key: 'timeline', label: 'Timeline & Tracking', count: order.stages.filter(s => s.status === 'completed').length + '/' + order.stages.length },
          { key: 'tna', label: 'TNA Calendar', count: (order as any).tnaEvents?.length ?? 0 },
          { key: 'samples', label: 'Style Samples', count: (order as any).samples?.length ?? 0 },
          { key: 'chat', label: 'Communication Hub', count: order.chat.length },
          { key: 'quality', label: 'QC & Inspections', count: order.qualityReports.length },
          { key: 'documents_custom', label: 'Document Vault', count: (order as any).documents?.length ?? 0 },
          { key: 'audit_feed', label: 'Audit Trail', count: (order as any).activityLogs?.length ?? 0 }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            className={`px-4.5 py-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === tab.key 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono leading-none ${activeSubTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/60 text-slate-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* ----------------- 1. TIMELINE & TRACKING VIEW ----------------- */}
        {activeSubTab === 'timeline' && (
          <div className="space-y-6" id="po-workspace-timeline">
            
            {/* Materials Status Bar */}
            <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100 flex items-center justify-between flex-wrap gap-4" id="mats-status-subcard">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pre-Production Raw Materials arrival</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Sourcing check of cargo inputs needed for cutting/stitching lines</p>
              </div>
              <div className="flex gap-4 font-mono text-[11px]">
                {Object.entries(order.materials).map(([mat, state]) => (
                  <div key={mat} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 capitalize">{mat}:</span>
                    {state === 'Received' ? (
                      <span className="text-emerald-600 font-bold">✔ Received</span>
                    ) : state === 'Delayed' ? (
                      <span className="text-rose-600 font-bold animate-pulse">⚠️ Delayed</span>
                    ) : (
                      <span className="text-amber-600 font-bold">● Pending</span>
                    )}
                    
                    {/* If supplier, allow quick toggle */}
                    {currentUser.role === 'supplier' && (
                      <button
                        onClick={() => {
                          const nextState = state === 'Received' ? 'Delayed' : state === 'Delayed' ? 'Pending' : 'Received';
                          onUpdateMaterials({ [mat]: nextState });
                        }}
                        className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded hover:bg-slate-200 font-semibold"
                        title="Change Status"
                      >
                        Change
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stages Stepper */}
            <div className="space-y-4" id="stages-chronology">
              {order.stages.map((stage, idx) => {
                const isEditing = editingStage === stage.name;
                return (
                  <div key={idx} className={`border rounded-xl p-4 transition-all ${stage.status === 'delayed' ? 'border-rose-200 bg-rose-50/10' : stage.status === 'completed' ? 'border-slate-150 bg-slate-50/20' : 'border-slate-200'}`}>
                    
                    {/* Normal stage layout */}
                    {!isEditing ? (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 md:max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-xs">{idx + 1}.</span>
                            <h5 className="font-bold text-xs text-slate-900">{stage.name}</h5>
                            {getStatusBadge(stage.status)}
                          </div>
                          
                          {stage.notes ? (
                            <p className="text-[11px] text-slate-600 pl-4 italic leading-relaxed">"{stage.notes}"</p>
                          ) : (
                            <span className="text-[11px] text-slate-400/90 pl-4 block">No shopfloor logs uploaded.</span>
                          )}

                          {stage.photoUrl && (
                            <div className="mt-2 pl-4 flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Camera className="w-3.5 h-3.5 text-slate-400" /> Live Evidence:
                              </span>
                              <a href={stage.photoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline font-medium">
                                view_fai_photo.jpg
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Timing and Progress wheel */}
                        <div className="flex items-center gap-6 text-xs text-slate-500 font-mono shrink-0">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-right border-r border-slate-100 pr-5">
                            <span className="text-[10px] text-slate-400 uppercase">Planned End:</span>
                            <span className="font-semibold text-slate-800">{stage.plannedEnd}</span>
                            <span className="text-[10px] text-slate-400 uppercase">Actual End:</span>
                            <span className="font-semibold text-slate-800">{stage.actualEnd || '—'}</span>
                          </div>

                          {/* Progress slider bar representation */}
                          <div className="w-32">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] uppercase text-slate-400">Yield %:</span>
                              <span className="font-bold text-slate-800">{stage.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${stage.status === 'delayed' ? 'bg-rose-500' : 'bg-blue-600'}`}
                                style={{ width: `${stage.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Supplier Actions */}
                          {currentUser.role === 'supplier' && (
                            <button
                              onClick={() => handleStageEditOpen(stage)}
                              className="text-xs bg-slate-950 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 font-sans font-semibold transition-all cursor-pointer shadow-xs"
                            >
                              Update Status
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Supplier inline edit form */
                      <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h5 className="font-bold text-sm text-blue-700">Updating Stage: {stage.name}</h5>
                          <button onClick={() => setEditingStage(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕ Close</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Status */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-500">Stage Status</label>
                            <select
                              value={stageStatus}
                              onChange={(e) => setStageStatus(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">Activity: Live (In Progress)</option>
                              <option value="completed">Completed</option>
                              <option value="delayed">Delayed</option>
                            </select>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-500">Completed Yield %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={stageProgress}
                              onChange={(e) => setStageProgress(parseInt(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                            />
                          </div>

                          {/* Completed Quantity */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-500">Completed Qty (Pcs)</label>
                            <input
                              type="number"
                              min="0"
                              max={order.orderQty}
                              value={stageQty}
                              onChange={(e) => setStageQty(parseInt(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                            />
                          </div>

                          {/* Mock Photo Upload */}
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-500 font-sans">Evidence photo</label>
                            <select
                              value={stagePhoto}
                              onChange={(e) => setStagePhoto(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                            >
                              <option value="">No Photo Upload</option>
                              <option value="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500">Sample Loom Front.jpg</option>
                              <option value="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500">Cutting Table CAD.jpg</option>
                              <option value="https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500">Pressing Finishing line.jpg</option>
                            </select>
                          </div>
                        </div>

                        {/* Note area */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Shopfloor Supervisor Logs/Note</label>
                          <textarea
                            rows={2}
                            value={stageNotes}
                            onChange={(e) => setStageNotes(e.target.value)}
                            placeholder="e.g. Yarn dyed in premium indigo. Cutting completed on lines 1 & 2..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingStage(null)}
                            className="border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 font-semibold text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleStageSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 font-semibold flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Save Milestone Updates
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------- 2. PO MESSAGE CHAT HUB & DOCUMENTS ----------------- */}
        {activeSubTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="po-chat-container">
            {/* Communication pane */}
            <div className="lg:col-span-3 border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[500px]" id="po-message-panel">
              
              {/* Chat Stream Header */}
              <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Thread: order_ref_{order.poNumber.toLowerCase()}</span>
                <span className="text-[10px] text-slate-400 font-mono">Archived & Secured (Audit Safe)</span>
              </div>

              {/* Chat messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50" id="chat-messages-stream">
                {order.chat.map((msg) => {
                  const isUser = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center font-mono font-bold text-xs uppercase text-slate-700 shrink-0">
                          {msg.senderName[0] || 'S'}
                        </div>
                      )}
                      
                      <div className={`rounded-xl p-3 max-w-[80%] text-xs shadow-xs space-y-1.5 ${isUser ? 'bg-blue-600 text-white' : 'bg-white border border-slate-250 text-slate-800'}`}>
                        {/* Name and Meta */}
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}>{msg.senderName}</span>
                          <span className={`text-[9px] font-mono capitalize ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                            {msg.senderRole}
                          </span>
                        </div>

                        {/* Log Text */}
                        <p className="leading-relaxed whitespace-pre-line">{msg.message}</p>

                        {/* File Attachment representation */}
                        {msg.attachmentUrl && (
                          <div className={`mt-2 p-2 rounded-lg border flex items-center justify-between gap-3 text-[10px] ${isUser ? 'bg-blue-700/50 border-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="font-semibold block truncate pr-2">{msg.attachmentName || 'attachmentPDF.pdf'}</span>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase">Uploaded</span>
                          </div>
                        )}

                        <span className={`block text-[9px] text-right font-mono mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input form */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <form onSubmit={handleChatSend} className="flex gap-2 items-center">
                  
                  {/* File attach dropdown mock */}
                  <select
                    value={mockAttachment || ''}
                    onChange={(e) => setMockAttachment(e.target.value || null)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono pr-5 cursor-pointer max-w-[120px] text-slate-500"
                    title="Mock file attaching"
                  >
                    <option value="">📎 Attach</option>
                    <option value="tech_pack_pacific.pdf">📐 TechPack.pdf</option>
                    <option value="lab_test_report_sgs.xlsx">🧪 LabReportSGS.xlsx</option>
                    <option value="invoice_draft_ABC.pdf">📂 DraftInvoice.pdf</option>
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Ask supplier about delays, or request sample status... (use '@ai' to trigger Sourcing Copilot)"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                  
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
                {mockAttachment && (
                  <div className="mt-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-flex items-center gap-1 font-mono font-bold animate-pulse">
                    📎 File attached: {mockAttachment} (Will upload with your next message)
                  </div>
                )}
              </div>

            </div>

            {/* Chat Document Side list */}
            <div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Document center</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quick download links for compliance audits</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="font-bold block text-slate-800 text-[11px] truncate">Tech_Pack_Pacfic_Aqua.pdf</span>
                      <span className="text-[10px] text-slate-400 font-mono">1.2 MB • Approved</span>
                    </div>
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="font-bold block text-slate-800 text-[11px] truncate">Purchase_Order_TGT_982.pdf</span>
                      <span className="text-[10px] text-slate-400 font-mono">540 KB • Signed</span>
                    </div>
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="font-bold block text-slate-800 text-[11px] truncate">SGS_Lab_Compliance_ISO.pdf</span>
                      <span className="text-[10px] text-slate-400 font-mono">2.4 MB • Verified Certificate</span>
                    </div>
                    <Award className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- 3. QUALITY REPORT & DIAGNOSTICS VIEW ----------------- */}
        {activeSubTab === 'quality' && (
          <div className="space-y-6" id="po-workspace-quality">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Defect Radial Wheel Dial */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center flex flex-col justify-center items-center space-y-3" id="defect-radial-dial">
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Yield Inspection Status</span>
                
                {/* SVG Dial representation */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                    {order.qualityReports[0] ? (
                      <circle cx="64" cy="64" r="50" fill="transparent" 
                              stroke={order.qualityReports[0].result === 'Fail' ? "#f43f5e" : "#10b981"} 
                              strokeWidth="10" 
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - (100 - order.qualityReports[0].defectRate) / 100)}`}
                      />
                    ) : (
                      <circle cx="64" cy="64" r="50" fill="transparent" stroke="#3b82f6" strokeWidth="10" strokeDasharray="314.15" strokeDashoffset="0" />
                    )}
                  </svg>
                  <div className="text-center space-y-0.5">
                    <span className="text-2xl font-black font-mono text-slate-800">
                      {order.qualityReports[0] ? (100 - order.qualityReports[0].defectRate).toFixed(1) : '100'}%
                    </span>
                    <span className="text-[9px] uppercase font-mono block text-slate-400 font-bold">AQL cleared</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h5 className="font-bold text-xs text-slate-800">
                    Latest result: {order.qualityReports[0] ? (
                      <span className={order.qualityReports[0].result === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}>{order.qualityReports[0].result}</span>
                    ) : 'Awaiting Audit'}
                  </h5>
                  <p className="text-[10px] text-slate-400">Allowed defect tolerance under AQL target: 2.5% max</p>
                </div>
              </div>

              {/* Defect breakdown chart (Custom premium SVG) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2 space-y-3" id="defect-trend-chart">
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">Inspected Defect Distribution Breakdown</span>
                
                {order.qualityReports[0] ? (
                  <div className="space-y-2.5 pt-1 text-xs">
                    {Object.entries(order.qualityReports[0].defectBreakdown).map(([def, count], idx) => {
                      const total: number = Object.values(order.qualityReports[0].defectBreakdown).reduce((a, b) => a + b, 0);
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="font-bold text-slate-700">{def}</span>
                            <span className="text-slate-500 font-semibold">{count} pcs ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-150 rounded-full h-2 overflow-hidden flex">
                            <div className="h-2 rounded-full bg-slate-900" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-slate-400 text-xs italic">
                     No inline inspections performed on this style yet. Enter QA mode to execute.
                  </div>
                )}
              </div>

            </div>

            {/* QA Audits Table log */}
            <div className="border border-slate-250 rounded-xl overflow-hidden" id="qa-reports-log-table">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-1">
                    <Activity className="w-4 h-4 text-slate-500" /> Factory Audits & Laboratory certificates history
                  </h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 font-sans">Official timeline list of onsite checks</p>
                </div>

                {/* Submit Audit button if role is QA or Admin */}
                {(currentUser.role === 'qa' || currentUser.role === 'admin') && (
                  <button
                    onClick={() => setInspectionOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    id="submit-audit-report-btn"
                  >
                    <Plus className="w-4 h-4" /> Submit onsite Audit Report
                  </button>
                )}
              </div>

              {order.qualityReports.length > 0 ? (
                <div className="overflow-x-auto text-xs font-sans">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 font-mono uppercase text-[9px] tracking-wider border-b border-slate-200">
                        <th className="p-3.5 pl-5">Date</th>
                        <th className="p-3.5">Audit Stage</th>
                        <th className="p-3.5">Inspector Organization</th>
                        <th className="p-3.5">SampleSize</th>
                        <th className="p-3.5 text-right">Defect Rate</th>
                        <th className="p-3.5 text-center">Result</th>
                        <th className="p-3.5 pr-5">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {order.qualityReports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3.5 pl-5 font-mono text-slate-600">{rep.inspectionDate}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{rep.type}</td>
                          <td className="p-3.5 text-slate-600">{rep.inspectorName}</td>
                          <td className="p-3.5 font-mono text-slate-600">{rep.sampleSize} units</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800">{rep.defectRate}%</td>
                          <td className="p-3.5 text-center">
                            {rep.result === 'Pass' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono leading-none">PASS</span>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-mono leading-none font-bold animate-pulse">FAIL</span>
                            )}
                          </td>
                          <td className="p-3.5 pr-5 text-slate-500 italic max-w-xs truncate leading-normal" title={rep.comments}>
                            "{rep.comments}"
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  Awaiting initial pre-production material or inline sewing audit reports from accredited labs.
                </div>
              )}
            </div>

            {/* In-app Onsite QA Inspector Entry Form dialog */}
            {inspectionOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="qa-entry-modal">
                <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-scale-up">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Inspection</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">Submit Onsite Inspection Report</h3>
                    </div>
                    <button
                      onClick={() => setInspectionOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleQAFormSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Inspector Organization</label>
                      <input
                        type="text"
                        required
                        value={inspInspector}
                        onChange={(e) => setInspInspector(e.target.value)}
                        placeholder="e.g. Suresh Kumar (SGS)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Inspection Level</label>
                        <select
                          value={inspType}
                          onChange={(e) => setInspType(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                        >
                          <option value="Inline">Inline Inspection</option>
                          <option value="Mid-line">Mid-line Inspection</option>
                          <option value="Final">Final Inspection (AQL)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Pass / Fail status</label>
                        <select
                          value={inspResult}
                          onChange={(e) => setInspResult(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Pass">Pass (Meets AQL tolerance)</option>
                          <option value="Fail">Fail (Rework required)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Total Inspected Pcs</label>
                        <input
                          type="number"
                          required
                          value={inspSampleSize}
                          onChange={(e) => setInspSampleSize(parseInt(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Defects Found (Pcs)</label>
                        <input
                          type="number"
                          required
                          value={inspDefects}
                          onChange={(e) => setInspDefects(parseInt(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Critical Comments</label>
                      <textarea
                        rows={3}
                        required
                        value={inspComments}
                        onChange={(e) => setInspComments(e.target.value)}
                        placeholder="Detail audit insights, stitch consistency, measurement values, and organic certifications cleared..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectionOpen(false)}
                        className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-lg py-2.5 font-semibold text-slate-600 outline-none transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit Audit Reports
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TNA CALENDAR VIEW ----------------- */}
        {activeSubTab === 'tna' && (
          <TNACalendarTab 
            poId={order.id} 
            milestones={(order as any).tnaEvents || []} 
            currentUser={currentUser} 
            onRefresh={onRefresh} 
          />
        )}

        {/* ----------------- STYLE SAMPLES PIPELINE VIEW ----------------- */}
        {activeSubTab === 'samples' && (
          <SampleTrackingTab 
            poId={order.id} 
            samples={(order as any).samples || []} 
            currentUser={currentUser} 
            onRefresh={onRefresh} 
          />
        )}

        {/* ----------------- DOCUMENT LOCKER REVISED VIEW ----------------- */}
        {activeSubTab === 'documents_custom' && (
          <DocumentCenterTab 
            poId={order.id} 
            documents={(order as any).documents || []} 
            currentUser={currentUser} 
            onRefresh={onRefresh} 
          />
        )}

        {/* ----------------- AUDIT FEED VIEW ----------------- */}
        {activeSubTab === 'audit_feed' && (
          <ActivityTimelineTab 
            poId={order.id} 
            logs={(order as any).activityLogs || []} 
            onRefresh={onRefresh} 
          />
        )}

      </div>
    </div>
  );
}
