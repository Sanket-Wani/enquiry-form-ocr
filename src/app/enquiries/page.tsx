"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  RefreshCw,
  Eye,
  Edit,
  Download,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Database,
  Building,
} from "lucide-react";

export default function EnquiryRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [crmFilter, setCrmFilter] = useState("ALL");
  const [leadSourceFilter, setLeadSourceFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status: statusFilter,
        crmSyncStatus: crmFilter,
        leadSource: leadSourceFilter,
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
      });

      const res = await fetch(`/api/enquiries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.enquiries);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load enquiries:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, crmFilter, leadSourceFilter, fromDate, toDate]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleRetryCrm = async (e: React.MouseEvent, enquiryId: string) => {
    e.preventDefault();
    setRetryingId(enquiryId);
    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/crm-retry`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchEnquiries();
      } else {
        const err = await res.json();
        alert(`CRM Retry failed: ${err.details || err.error}`);
      }
    } catch (err: any) {
      alert(`Error retrying CRM sync: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // CSV Export utility
  const exportToCsv = () => {
    if (enquiries.length === 0) return;

    const headers = [
      "Enquiry ID",
      "Lead ID",
      "Customer Name",
      "Contact Number",
      "Email ID",
      "Occupation",
      "Company Name",
      "Designation",
      "Address",
      "Lead Source",
      "Booking Timeline",
      "Requires Bank Finance",
      "Signature Present",
      "Review Status",
      "CRM Sync Status",
      "CRM Record ID",
      "Reviewed By",
      "Confirmed At",
      "Created At",
    ];

    const rows = enquiries.map((item) => [
      item.id,
      item.leadId || "",
      `"${(item.customerName || "").replace(/"/g, '""')}"`,
      `"${item.contactNumber || ""}"`,
      item.emailId || "",
      item.occupation || "",
      `"${(item.companyName || "").replace(/"/g, '""')}"`,
      `"${(item.designation || "").replace(/"/g, '""')}"`,
      `"${(item.address || "").replace(/"/g, '""')}"`,
      item.leadSource || "",
      item.bookingTimeline || "",
      item.requiresBankFinance || "",
      item.hasClientSignature ? "Yes" : "No",
      item.status,
      item.crmSyncStatus,
      item.crmRecordId || "",
      item.reviewedBy || "",
      item.confirmedAt ? new Date(item.confirmedAt).toISOString() : "",
      new Date(item.createdAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vishal_chugera_enquiries_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Enquiry Records
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Audit history, extraction comparisons, and dual persistence logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToCsv}
            disabled={enquiries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition shadow-sm"
          >
            <span>+ New Form</span>
          </Link>
        </div>
      </div>

      {/* Comprehensive Filter Panel */}
      <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none text-neutral-700"
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
            onChange={(e) => setCrmFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none text-neutral-700"
          >
            <option value="ALL">All CRM Statuses</option>
            <option value="SYNCED">Synced</option>
            <option value="FAILED">Sync Failed</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_SYNCED">Not Synced</option>
          </select>

          {/* Lead Source Filter */}
          <select
            value={leadSourceFilter}
            onChange={(e) => setLeadSourceFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none text-neutral-700"
          >
            <option value="ALL">All Lead Sources</option>
            <option value="Newspaper">Newspaper</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Hoardings">Hoardings</option>
            <option value="Channel Partner">Channel Partner</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-neutral-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 bg-white border border-neutral-300 rounded text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-neutral-500">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 bg-white border border-neutral-300 rounded text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {(search || statusFilter !== "ALL" || crmFilter !== "ALL" || leadSourceFilter !== "ALL" || fromDate || toDate) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setCrmFilter("ALL");
                setLeadSourceFilter("ALL");
                setFromDate("");
                setToDate("");
              }}
              className="text-neutral-500 hover:text-neutral-900 underline text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="border border-neutral-200 rounded-md bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Lead ID</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Occupation</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Timeline</th>
                <th className="py-2.5 px-4">Review Status</th>
                <th className="py-2.5 px-4">CRM Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                    Loading records...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-500">
                    <Database className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-medium text-neutral-700">No matching enquiry records</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      No records match the active search and filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                enquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                      {item.leadId || <span className="text-neutral-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900">
                      {item.customerName || <span className="text-neutral-400 italic font-normal">(Unreviewed)</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      {item.contactNumber || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {item.occupation || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {item.leadSource || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {item.bookingTimeline || <span className="text-neutral-400">&mdash;</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                          item.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : item.status === "AWAITING_REVIEW"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : item.status === "EXTRACTION_FAILED"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-neutral-100 text-neutral-700 border-neutral-200"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                            item.crmSyncStatus === "SYNCED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.crmSyncStatus === "FAILED"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : item.crmSyncStatus === "PENDING"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          }`}
                        >
                          {item.crmSyncStatus}
                        </span>
                        {item.crmSyncStatus === "FAILED" && (
                          <button
                            onClick={(e) => handleRetryCrm(e, item.id)}
                            disabled={retryingId === item.id}
                            className="text-[11px] text-neutral-600 hover:text-neutral-900 underline"
                          >
                            {retryingId === item.id ? "Retrying..." : "Retry"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/enquiries/${item.id}`}
                          className="px-2 py-1 border border-neutral-300 rounded text-xs text-neutral-700 hover:bg-neutral-100 transition"
                          title="View complete record, audit logs & document"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/enquiries/${item.id}/review`}
                          className="px-2 py-1 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 transition"
                          title="Open review & edit workspace"
                        >
                          Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} records)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 border border-neutral-300 rounded bg-white disabled:opacity-50 hover:bg-neutral-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1 border border-neutral-300 rounded bg-white disabled:opacity-50 hover:bg-neutral-50"
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
