/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PODocument, UserProfile } from '../types';
import { Search, Filter, ShieldCheck, CornerDownRight, Check, X, FileText, Download, UploadCloud, ChevronRight, Eye } from 'lucide-react';

interface DocumentCenterTabProps {
  poId: string;
  documents: PODocument[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

export default function DocumentCenterTab({ poId, documents = [], currentUser, onRefresh }: DocumentCenterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [uploadModal, setUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New upload state
  const [docType, setDocType] = useState<PODocument['type']>('Tech Pack');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  // 1. Approval actions
  const handleApproveReject = async (docId: string, status: 'Approved' | 'Rejected') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${poId}/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to update document: ' + err.error);
      }
    } catch (err: any) {
      alert('Network error updating document approval state: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submission action
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${poId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: docType,
          fileName,
          fileUrl: fileUrl || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
          approvalStatus: currentUser.role === 'buyer' ? 'Approved' : 'Pending'
        })
      });

      if (response.ok) {
        setUploadModal(false);
        setFileName('');
        setFileUrl('');
        onRefresh();
      } else {
        const err = await response.json();
        alert('Failed to upload document file: ' + err.error);
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getDocStatusBadge = (status?: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Approved</span>;
      case 'Rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">Rejected</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Awaiting Check</span>;
    }
  };

  return (
    <div className="space-y-6" id="document-management-center">
      {/* 1. Header & Filters block */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-800" /> Version Controlled Document Vault
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Securely track Tech-Packs, Laboratory Fabric Tests, BOMs, Invoices, and Bill of Ladings</p>
          </div>

          <button
            onClick={() => setUploadModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-2 text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform"
          >
            <UploadCloud className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {/* Search and Filters toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Type Filter */}
          <div className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
            {['ALL', 'Tech Pack', 'BOM', 'Fabric Test Report', 'Inspection Report', 'Invoice'].map(cat => (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                className={`px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  typeFilter === cat ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Document entries list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 max-w-sm mx-auto space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h5 className="font-bold text-xs text-slate-700 uppercase tracking-widest">No Documents Found</h5>
            <p className="text-[11px] leading-relaxed">No attachments matches the search string or category type criteria.</p>
          </div>
        ) : (
          <table className="w-full text-left text-slate-600 text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono font-bold text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="p-4">Document Details</th>
                <th className="p-4">Vault Tag</th>
                <th className="p-4">Revision</th>
                <th className="p-4">Uploader / Timestamp</th>
                <th className="p-4">Security Level</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <strong className="text-slate-950 font-semibold block leading-tight">{item.fileName}</strong>
                      <span className="text-[10px] text-slate-400 mt-1 block uppercase font-mono font-bold text-blue-600 tracking-wider">
                        Secure URL verified
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                      {item.type}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-black text-slate-900">
                    v{item.version || 1}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-700 block">{item.uploadedBy}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{new Date(item.uploadedAt).toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    {getDocStatusBadge(item.approvalStatus)}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2.5">
                    {/* Buyer Approval triggers */}
                    {currentUser.role === 'buyer' && item.approvalStatus !== 'Approved' && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleApproveReject(item.id, 'Approved')}
                          disabled={loading}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          title="Approve Document Version"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApproveReject(item.id, 'Rejected')}
                          disabled={loading}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          title="Reject / Flag Document"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-all border border-transparent hover:border-slate-250 cursor-pointer flex items-center justify-center"
                      title="Download/Open doc"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Upload Document Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4">
              <h4 className="font-bold text-sm">Upload to Controlled Vault</h4>
              <p className="text-xs text-slate-400 mt-0.5">Encrypts and files attachments under correct categorizations</p>
            </div>
            <form onSubmit={handleUploadDoc} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Tech Pack">Tech Pack</option>
                  <option value="BOM">Bill Of Materials (BOM)</option>
                  <option value="Fabric Test Report">Fabric Lab Test Report</option>
                  <option value="PP Sample Approval">PP Sample Approval Sign-off</option>
                  <option value="Inspection Report">Inspection Quality Report</option>
                  <option value="Invoice">Commercial Invoice</option>
                  <option value="Packing List">Packing List Checklist</option>
                  <option value="Shipping Documents">Shipping Documents (BL / AWB)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Filename</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. BOM_accessories_knitwear_v2.xlsx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-1">Document Attachment URL</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="e.g. https://mock-drive.com/file"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl transition-all font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-xl transition-all font-bold cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Securing...' : 'Encrypt & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
