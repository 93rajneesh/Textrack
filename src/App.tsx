/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserProfile, CompanyInfo, PurchaseOrder, AlertNotification, RFQRequirement 
} from './types';
import POTableOverview from './components/POTableOverview';
import SupplierDirectory from './components/SupplierDirectory';
import PODetailTabs from './components/PODetailTabs';
import AIAssistantTab from './components/AIAssistantTab';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, ShoppingBag, 
  MapPin, HelpCircle, Bell, ArrowLeft, RefreshCw, Cpu, Layers, Sparkles
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'overview' | 'workspace' | 'directory' | 'ai'>('overview');
  
  // App state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [rfqs, setRfqs] = useState<RFQRequirement[]>([]);

  // Advanced modules stats
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [detailedOrder, setDetailedOrder] = useState<PurchaseOrder | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  
  // Navigation detail
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  
  // Dialog Open states
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states (Create PO)
  const [newPoStyle, setNewPoStyle] = useState('');
  const [newPoSupplierId, setNewPoSupplierId] = useState('comp_tirupur');
  const [newPoQty, setNewPoQty] = useState('5000');
  const [newPoPrice, setNewPoPrice] = useState('6.00');
  const [newPoFabric, setNewPoFabric] = useState('Knitted Ring-Spun Cotton (180 GSM)');
  const [newPoColor, setNewPoColor] = useState('Pacific Navy Teal');
  const [newPoSize, setNewPoSize] = useState('S - XL');
  const [newPoDelivery, setNewPoDelivery] = useState('2026-07-25');

  // Primative effect triggers to prevent loops
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeRoleName, setActiveRoleName] = useState('buyer'); // trigger profile sync on role toggles

  // 1. Fetch initial profile, orders, notifications, and company directories
  useEffect(() => {
    async function initPlatform() {
      setLoading(true);
      try {
        // Fetch active session user profile
        const userRes = await fetch('/api/auth/profile');
        const userData = await userRes.json();
        setCurrentUser(userData.user);
        if (userData.user) {
          setActiveRoleName(userData.user.role);
        }

        // Fetch companion directories
        const compRes = await fetch('/api/companies');
        const compData = await compRes.json();
        setCompanies(compData.companies);

        // Fetch RFQs
        const rfqRes = await fetch('/api/rfqs');
        const rfqData = await rfqRes.json();
        setRfqs(rfqData.rfqs);

        // Fetch Orders & alerts
        await syncCoreOrders();
      } catch (err) {
        console.error("Platform initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }
    initPlatform();
  }, [refreshTrigger]);

  // Primitive listener triggering whenever role changes
  useEffect(() => {
    async function switchSessionUser() {
      try {
        setActionLoading(true);
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: activeRoleName })
        });
        const loginData = await loginRes.json();
        setCurrentUser(loginData.user);
        
        // Re-sync filtered orders
        await syncCoreOrders();
      } catch (err) {
        console.error("User switch failed:", err);
      } finally {
        setActionLoading(false);
      }
    }
    // Don't switch on initial load twice
    if (currentUser && currentUser.role !== activeRoleName) {
      switchSessionUser();
    }
  }, [activeRoleName]);

  const syncCoreOrders = async () => {
    try {
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders);

      const alertsRes = await fetch('/api/notifications');
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.notifications);

      // Load supplier scorecards
      const scRes = await fetch('/api/suppliers/scorecards');
      if (scRes.ok) {
        const scData = await scRes.json();
        setScorecards(scData.scorecards || []);
      }

      // Load factory capacities
      const capRes = await fetch('/api/suppliers/capacities');
      if (capRes.ok) {
        const capData = await capRes.json();
        setCapacities(capData.capacities || []);
      }
    } catch(err) {
      console.error("Order synchronization failed:", err);
    }
  };

  // Synchronize deep order metadata (TNA, samples, version docs, activity history)
  useEffect(() => {
    if (selectedPoId) {
      const fetchDetail = async () => {
        try {
          const detailRes = await fetch(`/api/orders/${selectedPoId}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setDetailedOrder(detailData.order);
          }
        } catch (err) {
          console.error("Failed to load detailed order context:", err);
        }
      };
      fetchDetail();
    } else {
      setDetailedOrder(null);
    }
  }, [selectedPoId, refreshTrigger]);

  // Triggered when supplier updates order stages/milestones
  const handleUpdateStage = async (stageName: string, updateData: any) => {
    if (!selectedPoId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/orders/${selectedPoId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageName, ...updateData })
      });
      const data = await res.json();
      if (data.success) {
        await syncCoreOrders();
      }
    } catch(err) {
      console.error("Milestone update fail:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Triggered when supplier updates material arrival checks
  const handleUpdateMaterials = async (materialsUpdate: any) => {
    if (!selectedPoId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/orders/${selectedPoId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialsUpdate)
      });
      const data = await res.json();
      if (data.success) {
        await syncCoreOrders();
      }
    } catch(err) {
      console.error("Materials status update failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Post chat messaging in active PO
  const handlePostChatMessage = async (messageText: string, filename?: string, url?: string) => {
    if (!selectedPoId) return;
    try {
      const res = await fetch(`/api/orders/${selectedPoId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText,
          attachmentName: filename,
          attachmentUrl: url
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh specific focused order details in UI
        await syncCoreOrders();
      }
    } catch (err) {
      console.error("In-app messaging delivery error:", err);
    }
  };

  // Triggered when QA Inspector uploads local laboratory inspect results
  const handleSubmitInspection = async (reportData: any) => {
    if (!selectedPoId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/orders/${selectedPoId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      const data = await res.json();
      if (data.success) {
        await syncCoreOrders();
      }
    } catch(err) {
      console.error("Inspection submit failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Sourcing Inquiry (RFQ submit) from Supplier directory
  const handleSourcingRFQ = async (rfqData: any) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfqData)
      });
      const data = await res.json();
      if (data.success) {
        // Set update triggers
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error("Sourcing RFQ submission failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Create a brand new PO (Commercial target contract)
  const handleCreateNewPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleName: newPoStyle,
          supplierCompanyId: newPoSupplierId,
          orderQty: newPoQty,
          unitPrice: newPoPrice,
          fabricType: newPoFabric,
          color: newPoColor,
          sizeRange: newPoSize,
          deliveryDate: newPoDelivery
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreatePoOpen(false);
        // Reset states
        setNewPoStyle('');
        setNewPoQty('5000');
        // Retrieve fresh database
        await syncCoreOrders();
      }
    } catch (e) {
      console.error("Purchase order creation failed:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark all notifications read
  const handleMarkAlertsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch(err) {
      console.error("Alert notice clear failed:", err);
    }
  };

  // Workspace Nav selection
  const handleSelectOrder = (poId: string) => {
    setSelectedPoId(poId);
    setCurrentTab('workspace');
  };

  const selectedOrder = orders.find(o => o.id === selectedPoId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="textrack-app-root">
      
      {/* 1. Global Role Alert Bar with Sandbox Indicator */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 py-2.5 px-6 font-mono text-[10.5px] shrink-0" id="sandbox-roles-panel">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9.5px] bg-slate-800 px-2 py-0.5 rounded text-white">TexTrack Sandbox v2</span>
            <span>Real-time B2B platform simulator. Dual-switching enabled below.</span>
          </div>

          {/* Persona selector Switcher */}
          <div className="flex items-center gap-2.5">
            <span className="text-slate-500">Live Persona:</span>
            <select
              value={activeRoleName}
              onChange={(e) => setActiveRoleName(e.target.value)}
              className="bg-slate-850 hover:bg-slate-800 text-slate-100 border border-slate-750 rounded px-2.5 py-1 text-[10.5px] font-semibold focus:outline-hidden cursor-pointer shadow-inner uppercase tracking-wider"
              id="active-role-selector-toggle"
            >
              <option value="buyer">Target Corp Merchandise Manager (Buyer)</option>
              <option value="supplier">Tirupur Knits coordinator (Supplier)</option>
              <option value="admin">Platform Operator (Admin)</option>
              <option value="qa">Lab Auditor (SGS/Intertek QA Inspector)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Platform Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs shrink-0" id="textrack-main-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Product metadata */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white" id="brand-launcher-icon">
              <Layers className="w-5.5 h-5.5 text-blue-400 font-black animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                TexTrack
                <span className="text-[10px] font-mono tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase font-bold">OS</span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-semibold leading-none mt-1">Garment Production Operating System</p>
            </div>
          </div>

          {/* Central tab navigation */}
          <nav className="flex items-center gap-1 pl-4">
            {[
              { key: 'overview', label: 'Active PO Summary', icon: <ShoppingBag className="w-4 h-4" /> },
              { key: 'workspace', label: 'Order Workspace', icon: <Layers className="w-4 h-4" />, disabled: !orders.length },
              { key: 'directory', label: 'Virtual showroom', icon: <MapPin className="w-4 h-4" /> },
              { key: 'ai', label: 'Sourcing Genius AI', icon: <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                disabled={tab.disabled}
                onClick={() => {
                  if (tab.key === 'workspace' && !selectedPoId && orders.length > 0) {
                    setSelectedPoId(orders[0].id);
                  }
                  setCurrentTab(tab.key as any);
                }}
                className={`h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  currentTab === tab.key 
                    ? 'bg-slate-950 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none'
                }`}
                id={`nav-link-${tab.key}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Header Action / System indicators */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {/* Bell Icon Notification Hub Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-3xs"
              >
                <Bell className="w-4 h-4" />
                {alerts.filter(a => !a.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                    {alerts.filter(a => !a.isRead).length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-55 animate-in fade-in slide-in-from-top-3 duration-150">
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs leading-none">Notifications Panel</h4>
                      <p className="text-[9.5px] text-slate-400 font-mono mt-1">{alerts.filter(a => !a.isRead).length} unread notices</p>
                    </div>
                    {alerts.filter(a => !a.isRead).length > 0 && (
                      <button 
                        onClick={handleMarkAlertsRead}
                        className="text-[9.5px] font-mono font-bold underline text-blue-400 hover:text-blue-350 transition-colors cursor-pointer"
                      >
                        Dismiss All
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                      <p className="p-6 text-center text-[10px] text-slate-400 italic">No warnings or delay signals on record.</p>
                    ) : (
                      alerts.map((a) => (
                        <div 
                          key={a.id} 
                          className={`p-3.5 space-y-1.5 transition-colors cursor-pointer hover:bg-slate-50/80 ${!a.isRead ? 'bg-blue-50/25 font-bold text-slate-900' : 'text-slate-600'}`}
                          onClick={async () => {
                            try {
                              await fetch(`/api/notifications/${a.id}/read`, { method: 'POST' });
                              setRefreshTrigger(p => p+1);
                            } catch(e) {}
                            setNotifOpen(false);
                            handleSelectOrder(a.poId);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono leading-none tracking-wider uppercase font-extrabold ${
                              a.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {a.severity}
                            </span>
                            <span className="font-mono text-[8px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700 text-[10.5px] leading-relaxed italic select-all">"{a.message}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentUser && (
              <div className="flex gap-2.5 items-center border-l border-slate-200 pl-4">
                <div className="text-right">
                  <div className="font-bold text-slate-900 leading-none">{currentUser.name}</div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mt-1">{currentUser.companyName}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-mono font-bold uppercase text-blue-700">
                  {currentUser.name[0] || 'C'}
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 3. Core Workspace Dashboard content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 overflow-y-auto" id="textrack-app-main-pane">
        
        {/* Sync loading overlay */}
        {actionLoading && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xl border border-slate-700 font-mono font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            Syncing timeline matrix...
          </div>
        )}

        {loading ? (
          <div className="flex flex-col h-96 items-center justify-center space-y-3 p-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-500 font-mono text-xs">Assembling production schedules & laboratory logs from Indian mills...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* OVERVIEW SUMMARY TAB */}
            {currentTab === 'overview' && (
              <POTableOverview 
                orders={orders}
                alerts={alerts}
                onSelectOrder={handleSelectOrder}
                onOpenCreateOrder={() => setCreatePoOpen(true)}
              />
            )}

            {/* DETAILED ACTIVE WORKSPACE TAB */}
            {currentTab === 'workspace' && (
              <div className="space-y-6">
                
                {/* Order Selector left control bar */}
                <div className="flex items-center justify-between flex-wrap gap-4" id="workspace-header-control">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setCurrentTab('overview')}
                      className="bg-white border border-slate-200 hover:border-slate-350 p-2 rounded-xl text-slate-600 transition-all cursor-pointer shadow-2xs"
                      title="Back to Active list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="font-extrabold text-lg text-slate-900">PO Tracker Workspace</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Collaborative stage management, live thread chats, and AQL audit reports</p>
                    </div>
                  </div>

                  {/* Selected PO Dropdown switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-semibold font-mono">PO Selector:</span>
                    <select
                      value={selectedPoId || ''}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      className="bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer shadow-2xs max-w-sm"
                      id="selected-po-dropdown-wheel"
                    >
                      {orders.map((po) => (
                        <option key={po.id} value={po.id}>{po.poNumber} — {po.styleName} ({po.supplierCompanyName})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedOrder ? (
                  <div className="space-y-6">
                    {/* General target PO specs banner */}
                    <div className="bg-slate-900 rounded-2xl p-5 text-white grid grid-cols-2 md:grid-cols-4 gap-4 border border-slate-800 shadow-sm relative overflow-hidden" id="po-workspace-specs-card">
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9.5px] uppercase font-mono block">Selected Style Code</span>
                        <h4 className="font-bold text-xs text-blue-400 block truncate">{selectedOrder.styleName}</h4>
                        <span className="text-[10px] text-slate-400 block font-mono">{selectedOrder.poNumber} • Created {selectedOrder.orderDate}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9.5px] uppercase font-mono block">Fabric specification</span>
                        <span className="font-bold text-slate-200 block text-xs truncate leading-normal">{selectedOrder.fabricType}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Color: {selectedOrder.color}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9.5px] uppercase font-mono block">Stitched Yields</span>
                        <span className="font-bold text-slate-200 block text-xs font-mono">
                          {selectedOrder.producedQty.toLocaleString()} / {selectedOrder.orderQty.toLocaleString()} Pcs
                        </span>
                        <span className="text-[10px] text-slate-400 block">Unit Cost: ${selectedOrder.unitPrice.toFixed(2)} USD</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9.5px] uppercase font-mono block">Contract Shipment date</span>
                        <span className="font-bold text-slate-200 block text-xs font-mono">{selectedOrder.deliveryDate}</span>
                        <span className="text-[10px] text-slate-400 block">Status: <span className="font-bold text-blue-400">{selectedOrder.status}</span></span>
                      </div>
                    </div>

                    {/* Integrated Interactive subtabs */}
                    <PODetailTabs 
                      order={detailedOrder || selectedOrder}
                      currentUser={currentUser!}
                      onUpdateStage={handleUpdateStage}
                      onUpdateMaterials={handleUpdateMaterials}
                      onPostChatMessage={handlePostChatMessage}
                      onSubmitInspection={handleSubmitInspection}
                      onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 italic text-xs">
                    Please select an active Purchase Order to review details.
                  </div>
                )}

              </div>
            )}

            {/* VIRTUAL DIRECTORY TAB */}
            {currentTab === 'directory' && (
              <SupplierDirectory 
                companies={companies}
                onSubmitRFQ={handleSourcingRFQ}
                scorecards={scorecards}
                capacities={capacities}
                currentUser={currentUser!}
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              />
            )}

            {/* AI ASSISTANT PANEL TAB */}
            {currentTab === 'ai' && (
              <AIAssistantTab currentContextPoId={selectedPoId || undefined} />
            )}
          </div>
        )}

      </main>

      {/* 4. Footer credits under constraints */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-slate-400 text-[10px] uppercase font-mono leading-none tracking-widest shrink-0" id="textrack-footer">
        © 2026 TexTrack Technologies Private Limited • Bengaluru & Delhi NCR • Sparing Sourcing friction
      </footer>

      {/* 5. Create Sourcing PO Dialog Modal */}
      {createPoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="create-po-modal">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Issue PO</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">Issue Purchase Order Contract</h3>
              </div>
              <button
                onClick={() => setCreatePoOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewPO} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Style/Design Name</label>
                  <input
                    type="text"
                    required
                    value={newPoStyle}
                    onChange={(e) => setNewPoStyle(e.target.value)}
                    placeholder="e.g. Organic Cotton Baby Rompers"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Target Manufacturer (Indian Factory)</label>
                  <select
                    value={newPoSupplierId}
                    onChange={(e) => setNewPoSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {companies.filter(c => c.type === 'supplier').map(supp => (
                      <option key={supp.id} value={supp.id}>{supp.name} ({supp.location})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Contract Quantity (Pcs)</label>
                  <input
                    type="number"
                    required
                    value={newPoQty}
                    onChange={(e) => setNewPoQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Unit Contract Price (USD/pc)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPoPrice}
                    onChange={(e) => setNewPoPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Delivery Shipment Date</label>
                  <input
                    type="date"
                    required
                    value={newPoDelivery}
                    onChange={(e) => setNewPoDelivery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Fabric Weight & Type</label>
                  <input
                    type="text"
                    required
                    value={newPoFabric}
                    onChange={(e) => setNewPoFabric(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Pantone Color Code</label>
                  <input
                    type="text"
                    required
                    value={newPoColor}
                    onChange={(e) => setNewPoColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Size Specification</label>
                  <input
                    type="text"
                    required
                    value={newPoSize}
                    onChange={(e) => setNewPoSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreatePoOpen(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 rounded-lg py-2.5 font-semibold text-slate-600 outline-hidden tracking-normal cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-all outline-hidden cursor-pointer shadow-xs"
                >
                  Confirm & Issue contract PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
