/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompanyInfo, RFQRequirement } from '../types';
import { Search, MapPin, Layers, Award, Clock, ArrowRight, ShieldCheck, Mail, Send, CheckCircle2 } from 'lucide-react';

interface SupplierDirectoryProps {
  companies: CompanyInfo[];
  onSubmitRFQ: (rfq: any) => void;
  scorecards?: any[];
  capacities?: any[];
  currentUser?: any;
  onRefresh?: () => void;
}

export default function SupplierDirectory({ 
  companies, 
  onSubmitRFQ, 
  scorecards = [], 
  capacities = [], 
  currentUser, 
  onRefresh = () => {} 
}: SupplierDirectoryProps) {
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive capacity update state
  const [updatingCapId, setUpdatingCapId] = useState<string | null>(null);
  const [newBookedCap, setNewBookedCap] = useState<string>('');
  const [isCapSubmitting, setIsCapSubmitting] = useState(false);

  // Expanded card toggle state (interactive audit details)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const handleUpdateCapacitySubmit = async (supplierId: string, currentMonthlyCap: number) => {
    if (!newBookedCap || isNaN(Number(newBookedCap))) return;
    setIsCapSubmitting(true);
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookedCapacity: Number(newBookedCap),
          monthlyCapacity: currentMonthlyCap
        })
      });
      if (response.ok) {
        setUpdatingCapId(null);
        setNewBookedCap('');
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to save capacity limit: ' + err.error);
      }
    } catch(err: any) {
      alert('Network error updating capacity log: ' + err.message);
    } finally {
      setIsCapSubmitting(false);
    }
  };
  
  // RFQ dialog state
  const [targetCompany, setTargetCompany] = useState<CompanyInfo | null>(null);
  const [rfqStyle, setRfqStyle] = useState('');
  const [rfqPrice, setRfqPrice] = useState('');
  const [rfqQty, setRfqQty] = useState('');
  const [rfqFabric, setRfqFabric] = useState('');
  const [rfqLeadTime, setRfqLeadTime] = useState('45');
  const [rfqSuccess, setRfqSuccess] = useState(false);

  // List of regions based on supplier locations
  const regions = ['All', 'Tirupur', 'Delhi', 'Jaipur', 'Kolkata', 'Ludhiana'];
  const categories = ['All', 'Knits', 'Woven Dress', 'Ethnicwear', 'Kidswear', 'Sportswear'];

  const filteredSuppliers = companies.filter(company => {
    if (company.type !== 'supplier') return false;
    
    const matchesQuery = company.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          company.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRegion = filterRegion === 'All' || company.location.includes(filterRegion);
    
    const matchesCategory = filterCategory === 'All' || company.productCategories.some(cat => cat.includes(filterCategory));
    
    return matchesQuery && matchesRegion && matchesCategory;
  });

  const handleCreateRFQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompany) return;
    
    onSubmitRFQ({
      styleName: rfqStyle,
      productCategory: targetCompany.productCategories[0] || 'Knitwear',
      targetPrice: parseFloat(rfqPrice),
      orderQty: parseInt(rfqQty),
      fabricType: rfqFabric,
      leadTimeDays: parseInt(rfqLeadTime),
      buyerCompanyName: 'Target Sourcing Corp',
      createdAt: new Date().toISOString(),
      status: 'Open'
    });

    setRfqSuccess(true);
    setTimeout(() => {
      setRfqSuccess(false);
      setTargetCompany(null);
      // Reset inputs
      setRfqStyle('');
      setRfqPrice('');
      setRfqQty('');
      setRfqFabric('');
    }, 2000);
  };

  return (
    <div className="space-y-6" id="supplier-directory-container">
      {/* Sourcing Header */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden" id="directory-expo-banner">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="text-amber-400 font-mono font-bold text-xs uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full">
            Virtual Expo 24x7
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Discover Verified Garment Factories in India
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Directly connect with validated manufacturers. Eliminate mediator commissions, track capacity, and review audited standards (BSCI, Oeko-Tex, SEDEX) live.
          </p>
        </div>
        {/* Abstract background graphics */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* Sourcing Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4" id="directory-search-bar">
        {/* Search bar */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search factory by name, location or key fabric..."
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-250 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Region filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase hidden md:inline">Region:</span>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
          >
            {regions.map((reg) => (
              <option key={reg} value={reg}>{reg === 'All' ? 'All Indian Regions' : reg}</option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase hidden md:inline">Specialty:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Specialties' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Factories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="suppliers-grid-list">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white border border-slate-200 rounded-2xl hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col"
            id={`supplier-card-${supplier.id}`}
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-inner uppercase">
                  {supplier.logo || '🏭'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                    {supplier.name}
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="TexTrack Audited and Verified" />
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{supplier.location}</span>
                  </div>
                </div>
              </div>
              
              {/* Trust Index */}
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Trust Score</div>
                <div className="text-lg font-bold text-slate-900 font-mono flex items-center justify-end gap-1">
                  <span className="text-emerald-500">●</span> {supplier.trustScore}%
                </div>
              </div>
            </div>

            {/* Capability Parameters */}
            <div className="p-5 flex-1 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">Daily Stitch Capacity</span>
                <span className="font-semibold text-slate-800 font-mono">{supplier.stitchingCapacityPerDay.toLocaleString()} garments</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">No. of Machines</span>
                <span className="font-semibold text-slate-800 font-mono">{supplier.noOfMachines} Japanese Juki units</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">Minimum Order Qty (MOQ)</span>
                <span className="font-semibold text-slate-800 font-mono">{supplier.moq.toLocaleString()} pcs</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">Standard Lead Time</span>
                <span className="font-semibold text-slate-800 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {supplier.leadTimeDays} days
                </span>
              </div>

              {/* Product tags */}
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1.5 font-bold">Specialties</span>
                <div className="flex flex-wrap gap-1">
                  {supplier.productCategories.map((type, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium text-[10px]">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Certifications */}
              <div className="col-span-2 pt-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1.5 font-bold">Audited Certs</span>
                <div className="flex flex-wrap gap-1">
                  {supplier.certifications.map((cert, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-2 py-0.5 rounded-md font-mono text-[10px] flex items-center gap-1 font-semibold">
                      <Award className="w-3 h-3 text-emerald-600" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic Scorecard and Capacity Sub-Section */}
              {(() => {
                const card = scorecards.find(s => s.supplierId === supplier.id);
                const cap = capacities.find(c => c.supplierId === supplier.id);
                const isExpanded = expandedCardId === supplier.id;

                const utilPercent = cap && cap.monthlyCapacity > 0 
                  ? Math.round((cap.bookedCapacity / cap.monthlyCapacity) * 100) 
                  : 0;

                const isMyFactory = currentUser?.role === 'supplier' && currentUser?.companyId === supplier.id;

                return (
                  <div className="col-span-2 pt-3 border-t border-slate-100 space-y-3">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : supplier.id)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-900 font-mono uppercase bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      <span>📊 Audit Score & Capacity Planner</span>
                      <span>{isExpanded ? 'Hide Details ▲' : 'Inspect Analytics ▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4.5 space-y-4 animate-in fade-in duration-150">
                        {/* A. Quality Scorecard */}
                        {card ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase font-black text-slate-400">Quality Performance Summary</span>
                              <span className="text-xs font-mono font-black text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded">Composite: {card.overallScore}%</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              {[
                                { name: 'Quality assurance', val: card.qualityScore },
                                { name: 'Delivery precision', val: card.deliveryScore },
                                { name: 'Response index', val: card.responseScore },
                                { name: 'Social Compliance', val: card.complianceScore },
                                { name: 'Inspection Passrate', val: card.inspectionPassRate },
                                { name: 'Claim/Rejection rate', val: card.claimRate, isRed: true }
                              ].map((bar, bIdx) => (
                                <div key={bIdx} className="space-y-1">
                                  <div className="flex justify-between font-mono text-[9px] text-slate-500">
                                    <span className="font-bold truncate">{bar.name}</span>
                                    <span className="font-extrabold">{bar.val}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${bar.isRed ? 'bg-rose-500' : 'bg-slate-800'}`} 
                                      style={{ width: `${bar.val}%` }} 
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No quality scorecard available for this supplier yet.</p>
                        )}

                        {/* B. Capacity Matrix */}
                        {cap ? (
                          <div className="border-t border-slate-200 pt-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase font-black text-slate-400">Line Capacity planning</span>
                              <span className="text-[10px] font-mono text-slate-500">Lines: <strong>{cap.lineCount}</strong> • Crew: <strong>{cap.workforceCount}</strong></span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-slate-600">
                                <span>Utilization: <strong>{cap.bookedCapacity.toLocaleString()}</strong> / {cap.monthlyCapacity.toLocaleString()} pcs</span>
                                <strong className={utilPercent > 85 ? 'text-rose-600' : 'text-slate-700'}>{utilPercent}% loaded</strong>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${utilPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${Math.min(utilPercent, 100)}%` }} 
                                />
                              </div>
                            </div>

                            {/* C. Supplier updates capacity locally */}
                            {isMyFactory && (
                              <div className="border-t border-slate-200 pt-3">
                                {updatingCapId === supplier.id ? (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      placeholder="New Booked Qty"
                                      value={newBookedCap}
                                      onChange={(e) => setNewBookedCap(e.target.value)}
                                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] focus:outline-hidden"
                                    />
                                    <button
                                      type="button"
                                      disabled={isCapSubmitting}
                                      onClick={() => handleUpdateCapacitySubmit(supplier.id, cap.monthlyCapacity)}
                                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50"
                                    >
                                      Submit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUpdatingCapId(null)}
                                      className="text-slate-400 hover:text-slate-600 font-mono text-[10px] font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUpdatingCapId(supplier.id);
                                      setNewBookedCap(String(cap.bookedCapacity));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg py-1.5 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Update My Active Bookings
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No capacity planning logs found for this shopfloor.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-sans">
                Exports to: {supplier.exportMarkets.join(', ')}
              </span>
              <button
                onClick={() => setTargetCompany(supplier)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-sans"
              >
                Send Sourcing Inquiry
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sourcing RFQ Dialog Modal */}
      {targetCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="rfq-dialog-modal">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-scale-up">
            
            {rfqSuccess ? (
              <div className="text-center py-8 space-y-3">
                <div className="inline-flex w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Inquiry Sent Successfully!</h3>
                <p className="text-xs text-slate-500">
                  Your RFQ has been logged and matched to **{targetCompany.name}**. Sourcing team will coordinate sample details.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Submit RFQ</span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">Inquiry for {targetCompany.name}</h3>
                  </div>
                  <button
                    onClick={() => setTargetCompany(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateRFQ} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Style Name / Item</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 100% Cotton Ribbed Polo Shirts"
                      value={rfqStyle}
                      onChange={(e) => setRfqStyle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Order Quantity</label>
                      <input
                        type="number"
                        required
                        min={targetCompany.moq}
                        placeholder={`Min: ${targetCompany.moq.toLocaleString()}`}
                        value={rfqQty}
                        onChange={(e) => setRfqQty(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Target Price (USD/pc)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 4.50"
                        value={rfqPrice}
                        onChange={(e) => setRfqPrice(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Fabric Specifications / GSM</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ring Spun Cotton Interlock, 200 GSM, enzyme wash"
                      value={rfqFabric}
                      onChange={(e) => setRfqFabric(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Target Lead Time</label>
                    <select
                      value={rfqLeadTime}
                      onChange={(e) => setRfqLeadTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="30">30 Days (Fast Track)</option>
                      <option value="45">45 Days (Standard)</option>
                      <option value="60">60 Days (Volume)</option>
                    </select>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetCompany(null)}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-lg py-2.5 font-semibold text-slate-600 text-center transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 font-semibold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit RFQ
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
