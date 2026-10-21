import React, { useRef } from "react";
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
  DollarSign,
  Wallet,
} from "lucide-react";

export default function PurchaseRequisitionVoucherModal({
  isOpen,
  onClose,
  request,
}) {
  const printRef = useRef(null);

  if (!isOpen || !request) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Requisition - ${request.request_number || "Voucher"}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
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
            .voucher-card {
              width: 100%;
              background: #ffffff;
            }
            .header-title {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .header-title h1 {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 2px 0;
              color: #0f172a;
            }
            .header-title h2 {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 0 0 2px 0;
              color: #334155;
            }
            .header-title p {
              font-size: 10px;
              font-weight: 600;
              color: #64748b;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              border-radius: 6px;
              margin-bottom: 12px;
            }
            .meta-item label {
              display: block;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              margin-bottom: 2px;
            }
            .meta-item span {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
            }
            .table-wrap {
              border: 1px solid #94a3b8;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              padding: 6px 8px;
              border-bottom: 1px solid #94a3b8;
              border-right: 1px solid #cbd5e1;
            }
            th:last-child {
              border-right: none;
            }
            td {
              padding: 6px 8px;
              border-bottom: 1px solid #e2e8f0;
              border-right: 1px solid #e2e8f0;
              color: #1e293b;
            }
            td:last-child {
              border-right: none;
            }
            tr:nth-child(even) {
              background: #fcfcfc;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
            .auth-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }
            .auth-box {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              border-radius: 6px;
              padding: 8px 10px;
            }
            .auth-title {
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            .budget-box {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              border-radius: 6px;
              padding: 8px 10px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer-copies {
              text-align: center;
              font-size: 9px;
              color: #64748b;
              border-top: 1px solid #cbd5e1;
              padding-top: 6px;
              margin-top: 6px;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const items = Array.isArray(request.items) ? request.items : [];

  const status = (request.status || "").toLowerCase();
  const isPendingCheck = status === "pending_check" || status === "pending";
  const isPendingFinance = status === "pending_finance";
  const isPendingApproval = status === "pending_approval";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  const statusBadge = () => {
    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          APPROVED
        </span>
      );
    }
    if (isPendingApproval) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
          <Clock className="h-3 w-3" />
          AWAITING GM APPROVAL
        </span>
      );
    }
    if (isPendingFinance) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
          <Wallet className="h-3 w-3" />
          AWAITING FINANCE / BUDGET
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="h-3 w-3" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="h-3 w-3" />
        AWAITING CHECK
      </span>
    );
  };

  const calculatedTotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.estimated_price || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl my-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header / Action Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              Purchase Requisition Voucher
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              #{request.request_number}
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

        {/* Printable Voucher Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-slate-900 bg-white" ref={printRef}>
          {/* Header Title Section */}
          <div className="text-center border-b-2 border-slate-900 pb-3 space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900">
              KASINA HOTELS TRADE PLC
            </h1>
            <p className="text-[11px] font-bold text-slate-500 tracking-wider">
              TEL: 09 11 24 26 67
            </p>
            <h2 className="text-base font-extrabold text-slate-800 tracking-wide uppercase mt-1">
              PURCHASE REQUISITION
            </h2>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Voucher NO. / ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {request.request_number || `PR-${request.id}`}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Date & Time
              </span>
              <span className="font-semibold text-slate-800">
                {request.created_at
                  ? new Date(request.created_at).toLocaleString("en-US", {
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
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Requested By
              </span>
              <span className="font-bold text-slate-900">
                {request.requested_by_name || request.requested_by_username || "Staff"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Department / Unit
              </span>
              <span className="font-bold text-slate-900">
                {request.department_name || request.outlet_name || "General"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Purpose
              </span>
              <span className="font-medium text-slate-800">
                {request.purpose || request.notes || "Material procurement"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Project Name
              </span>
              <span className="font-medium text-slate-800">
                {request.project_name || "N/A"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Enclosure
              </span>
              <span className="font-medium text-slate-800">
                {request.enclosure || "None"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">
                Voucher Status
              </span>
              <div className="mt-0.5">{statusBadge()}</div>
            </div>
          </div>

          {/* Rejection notice if any */}
          {request.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-900">
              <span className="font-bold">Rejection Reason: </span>
              {request.rejection_reason}
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                    No.
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300">
                    Description of Items
                  </th>
                  <th className="py-2.5 px-2 w-20 text-center border-r border-slate-300">
                    Unit
                  </th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-300">
                    Quantity
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">
                    Unit Price (ETB)
                  </th>
                  <th className="py-2.5 px-3 w-32 text-right border-r border-slate-300">
                    Total Price (ETB)
                  </th>
                  <th className="py-2.5 px-3">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                      No items recorded in this requisition.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const qty = Number(item.quantity || 0);
                    const unitPrice = Number(item.estimated_price || 0);
                    const lineTotal = qty * unitPrice;

                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {item.product_name || item.item_name || `Item #${item.product_id}`}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-200 uppercase text-[11px]">
                          {item.unit || "pcs"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-700 border-r border-slate-200 font-mono">
                          {qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                          {unitPrice > 0 ? unitPrice.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 border-r border-slate-200 font-mono">
                          {lineTotal > 0 ? lineTotal.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {item.notes || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] border-r border-slate-300">
                    Total Estimated Amount:
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-900 font-mono text-xs border-r border-slate-300">
                    {items.reduce((s, it) => s + Number(it.quantity || 0), 0)}
                  </td>
                  <td className="border-r border-slate-300"></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900 text-sm border-r border-slate-300">
                    {calculatedTotal > 0 ? `${calculatedTotal.toLocaleString()} ETB` : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                    {items.length} line item(s)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Authorizations & Signatures Block */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">
              Authorizations & Verifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Prepared By */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 pb-1">
                  1. Prepared By
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    {request.requested_by_name || request.requested_by_username || "Staff"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString("en-US")
                      : "Date: N/A"}
                  </p>
                </div>
                <div className="text-[10px] text-emerald-700 italic pt-1 border-t border-slate-200">
                  Digital Request Signature Verified
                </div>
              </div>

              {/* 2. Checked By (F&B / Dept Head) */}
              <div
                className={`border rounded-xl p-3 space-y-1.5 ${
                  request.checked_at
                    ? "bg-blue-50/60 border-blue-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 pb-1">
                  2. Checked By (F&B / Supervisor)
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    {request.checked_by_username ||
                      (isPendingCheck ? "Pending Review" : "Supervisor")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {request.checked_at
                      ? new Date(request.checked_at).toLocaleDateString("en-US")
                      : "Pending Verification"}
                  </p>
                  {request.checked_notes && (
                    <p className="text-[10px] text-slate-600 italic mt-0.5">
                      Note: {request.checked_notes}
                    </p>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                  {request.checked_at ? "Checked & Verified" : "Awaiting Verification"}
                </div>
              </div>

              {/* 3. Approved By (General Manager / Owner) */}
              <div
                className={`border rounded-xl p-3 space-y-1.5 ${
                  isApproved
                    ? "bg-emerald-50/60 border-emerald-200"
                    : isRejected
                    ? "bg-rose-50/60 border-rose-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 pb-1">
                  3. Approved By (General Manager)
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    {request.approved_by_username ||
                      request.reviewed_by_username ||
                      (isApproved ? "General Manager" : "Awaiting Approval")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {request.approved_at || request.reviewed_at
                      ? new Date(request.approved_at || request.reviewed_at).toLocaleDateString("en-US")
                      : "Pending"}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                  {isApproved
                    ? "Approved for Procurement"
                    : isRejected
                    ? "Requisition Declined"
                    : "Pending Final Sign-Off"}
                </div>
              </div>
            </div>

            {/* Budget Verification Block */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700 uppercase text-[10px]">
                  Budget Allocation Status:
                </span>
                <span
                  className={`font-black px-2.5 py-1 rounded-md text-xs uppercase ${
                    request.is_budgeted !== false
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  Budgeted: {request.is_budgeted !== false ? "YES" : "NO"}
                </span>
              </div>

              <div className="text-slate-600 text-right">
                <span className="font-semibold text-slate-700">Budget Verified By: </span>
                <span className="font-bold text-slate-900">
                  {request.budget_verified_by_username || "Finance Department"}
                </span>{" "}
                &bull;{" "}
                <span className="text-[11px] text-slate-500">
                  {request.budget_verified_at
                    ? new Date(request.budget_verified_at).toLocaleDateString("en-US")
                    : "Pending"}
                </span>
                {request.budget_notes && (
                  <p className="text-[10px] text-slate-500 italic mt-0.5">
                    Finance Note: {request.budget_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Distribution copies footer */}
            <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 tracking-wide">
              Distribution: Original - Purchasing &bull; 1st Copy - Finance &bull; 2nd Copy - Archive
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-slate-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* Direct print styles fallback */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .fixed.inset-0.z-50,
          .fixed.inset-0.z-50 * {
            visibility: visible !important;
          }
          .fixed.inset-0.z-50 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .relative.w-full.max-w-3xl {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
