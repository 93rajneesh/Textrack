/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sample, UserProfile } from '../types';
import { CheckCircle, AlertCircle, RefreshCw, PlusCircle, Clock, Camera, FolderCheck, Send, MessageSquare, ArrowUpRight } from 'lucide-react';

interface SampleTrackingTabProps {
  poId: string;
  samples: Sample[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

export default function SampleTrackingTab({ poId, samples = [], currentUser, onRefresh }: SampleTrackingTabProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Submit sample state
  const [sampleType, setSampleType] = useState<'Proto Sample' | 'Fit Sample' | 'Size Set Sample' | 'PP Sample' | 'Shipment Sample'>('Proto Sample');
  const [comments, setComments] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Evaluate sample state
  const [evalStatus, setEvalStatus] = useState<'Approved' | 'Rejected' | 'Revision Requested'>('Approved');
  const [evalComments, setEvalComments] = useState('');

  const handleSubmitSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${poId}/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleType,
          comments,
          photos: [photoUrl || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500']
        })
      });

      if (response.ok) {
        setShowSubmitModal(false);
        setComments('');
        setPhotoUrl('');
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to submit sample: ' + err.error);
      }
    } catch (err: any) {
      alert('Network error submitting sample: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSample) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${poId}/samples/${selectedSample.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: evalStatus,
          comments: evalComments
        })
      });

      if (response.ok) {
        setSelectedSample(null);
        setEvalComments('');
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to update evaluation: ' + err.error);
      }
    } catch (err: any) {
      alert('Network error evaluating sample: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] leading-none font-bold uppercase tracking-wider">Approved</span>;
      case 'Rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-[10px] leading-none font-bold uppercase tracking-wider">Rejected</span>;
      case 'Revision Requested':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] leading-none font-bold uppercase tracking-wider">Revision Req</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px] leading-none font-bold uppercase tracking-wider">Under Review</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="sample-tracking-module">
      {/* 1. Header Area with Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div>
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FolderCheck className="w-4 h-4 text-slate-800" /> Style Samples Pipeline & Approvals
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Submit Proto, Sew-by, Fit, and Size Set submissions for buyer validation logs</p>
        </div>
        
        {currentUser.role === 'supplier' && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Submit Brand Sample
          </button>
        )}
      </div>

      {/* 2. Samples Pipeline Cards Row */}
      {samples.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 max-w-lg mx-auto space-y-3 shadow-xs">
          <Camera className="w-8 h-8 text-slate-300 mx-auto" />
          <h5 className="font-bold text-xs text-slate-700 uppercase tracking-widest leading-none">No Sample Files Submitted</h5>
          <p className="text-[11px]">Suppliers will submit high-definition pre-production clothing proofs here for QA checklists.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="sample-cards-list">
          {samples.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
              <div>
                {/* Photo Preview Container */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                  <img
                    src={item.photos[0]}
                    alt={item.sampleType}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(item.status)}
                  </div>
                  <span className="absolute bottom-3 right-3 bg-black/75 text-white px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
                    {item.sampleType}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 font-bold block uppercase">Submitted: {item.submitDate}</span>
                    <p className="text-xs text-slate-700 leading-normal mt-1 italic">
                      "{item.comments}"
                    </p>
                  </div>

                  {/* Feedback History log */}
                  {item.feedbackHistory && item.feedbackHistory.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Approval History Check logs</span>
                      {item.feedbackHistory.slice(0, 2).map((h, hIdx) => (
                        <div key={hIdx} className="text-[10px] space-y-0.5 border-l-2 border-slate-300 pl-2">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{h.by} • {h.status}</span>
                            <span className="font-mono text-[8px] text-slate-400">{h.date.split('T')[0]}</span>
                          </div>
                          <p className="text-slate-500 leading-relaxed italic">"{h.comments}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {currentUser.role === 'buyer' && item.status === 'Pending' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => {
                      setSelectedSample(item);
                      setEvalStatus('Approved');
                    }}
                    className="w-full bg-white hover:bg-slate-950 hover:text-white text-slate-800 border border-slate-200 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Evaluate Submission
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Submit Sample Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4">
              <h4 className="font-bold text-sm">Submit Garment Sample Proof</h4>
              <p className="text-xs text-slate-400 mt-0.5">Release and upload pre-production sample measurements</p>
            </div>
            <form onSubmit={handleSubmitSample} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Sample Spec Type</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Proto Sample">Proto Sample</option>
                  <option value="Fit Sample">Fit Sample</option>
                  <option value="Size Set Sample">Size Set Sample</option>
                  <option value="PP Sample">PP Sample (Pre-Production)</option>
                  <option value="Shipment Sample">Shipment Sample</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Visual Mockup Photo URL (Optional)</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Remarks / Fabric specifications</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  required
                  placeholder="Include color shades (e.g. Pantone 18-4005), shrinkage values, seam count, weight, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-24 focus:ring-2 focus:ring-slate-900 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Upload Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Evaluate Sample Review Modal */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4">
              <h4 className="font-bold text-sm">Evaluate Garment Spec Submission</h4>
              <p className="text-xs text-slate-400 mt-0.5">{selectedSample.sampleType}</p>
            </div>
            <form onSubmit={handleEvaluateSample} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Approval Determination</label>
                <select
                  value={evalStatus}
                  onChange={(e) => setEvalStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="Approved">Approved (Lock PP shade & spec)</option>
                  <option value="Revision Requested">Revision Requested (Re-submit fix)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Feedback/Comments for Supplier Shopfloor</label>
                <textarea
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  required
                  placeholder="Detail dye-bleeding, seam-puckering, button placement tolerances or measurements deviations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs h-24 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSample(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
                >
                  {loading ? 'Evaluating...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
