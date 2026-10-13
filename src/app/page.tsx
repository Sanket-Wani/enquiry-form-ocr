"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    enquiries: [],
    counts: {
      total: 0,
      awaitingReview: 0,
      confirmed: 0,
      extractionFailed: 0,
      crmFailed: 0,
    },
    pagination: { totalRecords: 0, page: 1, limit: 10, totalPages: 1 },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [crmFilter, setCrmFilter] = useState("ALL");
  const [leadSourceFilter, setLeadSourceFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        status: statusFilter,
        crmSyncStatus: crmFilter,
        leadSource: leadSourceFilter,
      });

      const res = await fetch(`/api/enquiries?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, crmFilter, leadSourceFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRetryCrm = async (e: React.MouseEvent, enquiryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRetryingId(enquiryId);
    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/crm-retry`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDashboardData();
      } else {
        const err = await res.json();
        alert(`CRM Retry failed: ${err.details || err.error}`);
      }
    } catch (err: any) {
      alert(`Error retrying CRM: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Confirmed
          </span>
        );
      case "AWAITING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Awaiting Review
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-300">
            <RefreshCw className="w-3 h-3 text-neutral-600 animate-spin" />
            Processing
          </span>
        );
      case "EXTRACTION_FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800 border border-red-200">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            Extraction Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            Draft
          </span>
        );
    }
  };

  const getCrmBadge = (crmStatus: string, enquiryId: string) => {
    switch (crmStatus) {
      case "SYNCED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            Synced
          </span>
        );
      case "FAILED":
        return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800 border border-red-200">
              Sync Failed
            </span>
            <button
              onClick={(e) => handleRetryCrm(e, enquiryId)}
              disabled={retryingId === enquiryId}
              className="text-[11px] underline text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
              title="Retry sync to CRM"
            >
              {retryingId === enquiryId ? "Retrying..." : "Retry"}
            </button>
          </div>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Sync Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
            Not Synced
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Enquiry Form Processing
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Real-estate physical document intake, Sarvam DocAI field extraction, and dual persistence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-md text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Enquiry</span>
          </Link>
        </div>
      </div>

      {/* Real Database Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Enquiries */}
        <div className="p-4 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Enquiries</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{data.counts.total}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">All ingested forms</div>
        </div>

        {/* Awaiting Review */}
        <div className="p-4 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Awaiting Review</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{data.counts.awaitingReview}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Extracted, pending sign-off</div>
        </div>

        {/* Confirmed Enquiries */}
        <div className="p-4 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{data.counts.confirmed}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Staff approved</div>
        </div>

        {/* Extraction Failures */}
        <div className="p-4 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">OCR Failures</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{data.counts.extractionFailed}</div>
          <div className="text-[11px] text-red-600 mt-0.5">Requires retry or rescan</div>
        </div>

        {/* CRM Sync Failures */}
        <div className="p-4 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">CRM Sync Errors</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{data.counts.crmFailed}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Pending CRM retry</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, lead ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none text-neutral-700"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PROCESSING">Processing</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="EXTRACTION_FAILED">Extraction Failed</option>
          </select>

          {/* CRM Sync Filter */}
          <select
            value={crmFilter}
            onChange={(e) => {
              setCrmFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none text-neutral-700"
          >
            <option value="ALL">All CRM Statuses</option>
            <option value="SYNCED">Synced</option>
            <option value="FAILED">Sync Failed</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_SYNCED">Not Synced</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={() => fetchDashboardData()}
            className="p-1.5 bg-white border border-neutral-300 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Recent Enquiries Table */}
      <div className="border border-neutral-200 rounded-md bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Contact Number</th>
                <th className="py-2.5 px-4">Lead ID</th>
                <th className="py-2.5 px-4">Enquiry Date</th>
                <th className="py-2.5 px-4">Review Status</th>
                <th className="py-2.5 px-4">CRM Sync</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                    Loading enquiries...
                  </td>
                </tr>
              ) : data.enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-medium text-neutral-700">No enquiries found</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      {search || statusFilter !== "ALL" || crmFilter !== "ALL"
                        ? "Try clearing your search query or filters to see all records."
                        : "Upload a photograph or scan of a completed physical enquiry form to begin."}
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/new"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Upload First Form</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                data.enquiries.map((item: any) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-neutral-900">
                      {item.customerName || (
                        <span className="text-neutral-400 italic font-normal">
                          (Pending extraction)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      {item.contactNumber || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600 text-[11px]">
                      {item.leadId || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {item.enquiryDate || (
                        <span className="text-neutral-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4">{getCrmBadge(item.crmSyncStatus, item.id)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status !== "CONFIRMED" ? (
                          <Link
                            href={`/enquiries/${item.id}/review`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 transition"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            href={`/enquiries/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 rounded text-xs text-neutral-700 hover:bg-neutral-50 transition"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3 h-3 text-neutral-400" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {data.pagination.totalPages > 1 && (
          <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalRecords} total records)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 border border-neutral-300 rounded bg-white disabled:opacity-50 hover:bg-neutral-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="px-2 py-1 border border-neutral-300 rounded bg-white disabled:opacity-50 hover:bg-neutral-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
