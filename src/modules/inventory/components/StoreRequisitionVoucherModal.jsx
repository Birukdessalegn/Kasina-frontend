import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Building2,
  Loader2,
} from "lucide-react";
import api from "../../../services/api";

export default function StoreRequisitionVoucherModal({
  isOpen,
  onClose,
  transfer: initialTransfer,
}) {
  const printRef = useRef(null);
  const [activeTransfer, setActiveTransfer] = useState(initialTransfer);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setActiveTransfer(initialTransfer);
    if (!initialTransfer?.id) return;

    if (!initialTransfer.items || !Array.isArray(initialTransfer.items) || initialTransfer.items.length === 0) {
      setLoadingItems(true);
      api(`/inventory/transfers/${initialTransfer.id}`)
        .then((res) => {
          const full = res.transfer || res.data || res;
          if (full) {
            setActiveTransfer((prev) => ({
              ...prev,
              ...full,
              items: Array.isArray(full.items) ? full.items : prev?.items || [],
            }));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch full transfer items:", err);
        })
        .finally(() => {
          setLoadingItems(false);
        });
    }
  }, [initialTransfer]);

  if (!isOpen || !activeTransfer) return null;
  const transfer = activeTransfer;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Store Requisition - ${transfer.transfer_number || "Voucher"}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff !important;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.35;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #94a3b8;
              padding: 6px 8px;
            }
            th {
              background: #f1f5f9;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 10px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Print error:", err);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  const departmentDisplay =
    transfer.to_location
      ? transfer.to_location.toUpperCase()
      : "DEPARTMENT";

  const items = Array.isArray(transfer.items) ? transfer.items : [];

  const status = (transfer.status || "").toLowerCase();
  const isPendingFB = status === "pending_fb" || status === "pending";
  const isPendingStore = status === "pending_store";
  const isCompleted = status === "completed";
  const isRejected = status === "rejected" || status === "cancelled";

  const statusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          APPROVED & ISSUED
        </span>
      );
    }
    if (isPendingStore) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
          <Clock className="h-3.5 w-3.5" />
          CHECKED BY F&B &bull; AWAITING STOREKEEPER
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="h-3.5 w-3.5" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="h-3.5 w-3.5" />
        AWAITING F&B CHECK
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      {/* Container */}
      <div className="relative w-full max-w-3xl my-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header / Actions toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              Store Requisition Voucher
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              #{transfer.transfer_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Voucher</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 bg-white" ref={printRef}>
          {/* Header Title Section */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900">
              KASINA HOTELS TRADE PLC
            </h1>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-wide uppercase">
              STORE REQUISITION VOUCHER
            </h2>
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase">
              Official Material Request Document
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                Voucher NO. / ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {transfer.transfer_number || `REQ-${transfer.id}`}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                Department
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {departmentDisplay}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                Date & Time
              </span>
              <span className="font-medium text-slate-800">
                {transfer.created_at
                  ? new Date(transfer.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                Status
              </span>
              <div className="mt-0.5">{statusBadge()}</div>
            </div>
          </div>

          {/* General Requisition Notes if any */}
          {transfer.notes && (
            <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg text-xs text-amber-900">
              <span className="font-semibold">Requisition Note: </span>
              {transfer.notes}
            </div>
          )}

          {/* Rejection Reason if any */}
          {transfer.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-900">
              <span className="font-bold">Rejection Reason: </span>
              {transfer.rejection_reason}
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-300">
                    No.
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-300">
                    Description of Items
                  </th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-300">
                    Unit
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-300">
                    Quantity
                  </th>
                  <th className="py-2.5 px-4">
                    Remark / Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No items recorded in this voucher.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 border-r border-slate-200">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-200">
                        {item.product_name || item.name || `Item #${item.product_id}`}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 border-r border-slate-200 uppercase text-[11px]">
                        {item.unit || "pcs"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700 text-sm border-r border-slate-200 font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-800">
                  <td colSpan={3} className="py-2.5 px-4 text-right uppercase text-[11px] border-r border-slate-300">
                    Total Items Count:
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-900 font-mono text-sm border-r border-slate-300">
                    {items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                    {items.length} line item(s)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 3-Actor Sign-off Section */}
          <div className="pt-4 border-t-2 border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Authorizations & Audit Sign-Off
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Requested By */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span>Requested By</span>
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {transfer.requested_by_username || "Department Staff"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {transfer.created_at
                      ? new Date(transfer.created_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "Requested"}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                  Digital Request Signature Verified
                </div>
              </div>

              {/* 2. Checked By (F&B) */}
              <div
                className={`border rounded-xl p-3.5 space-y-2 ${
                  transfer.checked_at
                    ? "bg-blue-50/60 border-blue-200 text-blue-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>Checked By (F&B)</span>
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">
                    {transfer.checked_by_username ||
                      (isPendingFB
                        ? "Pending F&B Review"
                        : "F&B Controller")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {transfer.checked_at
                      ? new Date(transfer.checked_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : isPendingFB
                      ? "Awaiting verification"
                      : "Verified"}
                  </p>
                  {transfer.checked_notes && (
                    <p className="text-[10px] text-slate-600 italic mt-1">
                      Note: {transfer.checked_notes}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                  {transfer.checked_at
                    ? "Verified & Forwarded to Store"
                    : "Pending F&B Sign-off"}
                </div>
              </div>

              {/* 3. Approved By (Storekeeper) */}
              <div
                className={`border rounded-xl p-3.5 space-y-2 ${
                  isCompleted
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                    : isRejected
                    ? "bg-rose-50/60 border-rose-200 text-rose-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Approved By (Storekeeper)</span>
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">
                    {transfer.approved_by_username ||
                      (isCompleted
                        ? "Central Storekeeper"
                        : isRejected
                        ? "Rejected"
                        : "Awaiting Issuance")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {transfer.approved_at
                      ? new Date(transfer.approved_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : isCompleted
                      ? "Approved"
                      : "Pending"}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                  {isCompleted
                    ? "Stock Issued & Dispatched"
                    : isRejected
                    ? "Requisition Declined"
                    : "Pending Storekeeper Sign-off"}
                </div>
              </div>
            </div>
          </div>

          {/* Footer print stamp */}
          <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100">
            Kasina Hotels Trade PLC &bull; Automated Inventory & Store Requisition Management System
          </div>
        </div>

        {/* Modal Bottom Action */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-slate-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* Scoped Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0.z-50,
          .fixed.inset-0.z-50 * {
            visibility: visible;
          }
          .fixed.inset-0.z-50 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            padding: 0 !important;
          }
          .relative.w-full.max-w-3xl {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
