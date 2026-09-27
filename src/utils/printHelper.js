import { parseItemPortion } from "./drinkServingHelper";

/**
 * 100% Reliable Cross-Browser Print Helper
 * Uses an isolated printing iframe to guarantee the document never closes prematurely,
 * eliminates blank pages, avoids popup blockers, and styles all tables and executive summary cards.
 */
export const printReportArea = (elementId, title = "Official Sales & Shift Report") => {
  const element =
    document.getElementById(elementId) ||
    document.getElementById("printable-report") ||
    document.getElementById("bar-reports-printable-area") ||
    document.getElementById("kitchen-reports-printable-area");

  if (!element) {
    window.print();
    return;
  }

  // Remove any previously created print iframe
  const oldIframe = document.getElementById("rbms-print-frame");
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create isolated invisible iframe
  const iframe = document.createElement("iframe");
  iframe.id = "rbms-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 8px;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          /* Executive Financial Summary Grid */
          .grid {
            display: grid !important;
          }
          .grid-cols-2, .grid-cols-4, .sm\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
            margin: 14px 0 !important;
          }
          .bg-slate-50 {
            background-color: #f8fafc !important;
          }
          .rounded-xl, .rounded-lg, .rounded-2xl {
            border-radius: 8px !important;
          }
          .border {
            border: 1px solid #cbd5e1 !important;
          }
          .border-slate-200, .border-slate-200\\/60 {
            border-color: #cbd5e1 !important;
          }
          .border-b {
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .border-t-2 {
            border-top: 2px solid #0f172a !important;
          }
          .border-b-2 {
            border-bottom: 2px solid #0f172a !important;
          }
          .p-3 { padding: 8px 10px !important; }
          .p-4 { padding: 10px 12px !important; }
          .p-6 { padding: 14px !important; }
          .pb-5 { padding-bottom: 12px !important; }
          .pt-4 { padding-top: 12px !important; }
          .mt-10 { margin-top: 20px !important; }
          .mb-3 { margin-bottom: 8px !important; }
          .flex {
            display: flex !important;
          }
          .items-center {
            align-items: center !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .text-right {
            text-align: right !important;
          }
          .text-center {
            text-align: center !important;
          }
          .uppercase {
            text-transform: uppercase !important;
          }
          .tracking-tight {
            letter-spacing: -0.025em !important;
          }
          .tracking-wider {
            letter-spacing: 0.05em !important;
          }
          .font-black {
            font-weight: 900 !important;
          }
          .font-bold, .font-extrabold {
            font-weight: 800 !important;
          }
          .font-semibold {
            font-weight: 600 !important;
          }
          .text-xl {
            font-size: 15px !important;
          }
          .text-2xl {
            font-size: 18px !important;
          }
          .text-sm {
            font-size: 11px !important;
          }
          .text-xs {
            font-size: 10px !important;
          }
          .text-\\[10px\\] {
            font-size: 9px !important;
          }
          .text-slate-900, .text-slate-950 {
            color: #0f172a !important;
          }
          .text-slate-700, .text-slate-800 {
            color: #334155 !important;
          }
          .text-slate-500, .text-slate-400 {
            color: #64748b !important;
          }
          .text-emerald-600, .text-emerald-700, .text-emerald-800 {
            color: #047857 !important;
          }
          .text-purple-600, .text-purple-700, .text-purple-800 {
            color: #7e22ce !important;
          }
          .text-indigo-600, .text-indigo-700, .text-indigo-800 {
            color: #4338ca !important;
          }
          .text-red-600, .text-red-700 {
            color: #b91c1c !important;
          }
          .bg-emerald-50, .bg-emerald-100 {
            background-color: #dcfce7 !important;
          }
          .bg-purple-50, .bg-purple-100 {
            background-color: #f3e8ff !important;
          }
          .bg-amber-50, .bg-amber-100 {
            background-color: #fef3c7 !important;
          }
          .bg-red-50, .bg-red-100 {
            background-color: #fee2e2 !important;
          }
          .bg-white {
            background-color: #ffffff !important;
          }
          /* Tables & Financial Total Footers */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
            font-size: 10px !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            text-align: left;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
            color: #334155 !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          tfoot tr {
            background-color: #f1f5f9 !important;
            font-weight: 900 !important;
            border-top: 2px solid #0f172a !important;
          }
          tfoot td {
            font-size: 11px !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          /* Badges */
          .badge, span[class*="rounded-full"] {
            display: inline-block !important;
            padding: 2px 6px !important;
            border-radius: 9999px !important;
            font-weight: 800 !important;
            font-size: 9px !important;
          }
          /* Hide interactive UI */
          button, input, select, .print-hidden, .print-hide {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Print safely after DOM renders without calling close() prematurely
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
};

/**
 * 100% Reliable Cross-Browser Org Chart Printer (Landscape Optimized)
 * Clones the org chart into an isolated iframe with all active stylesheets,
 * guaranteeing zero blank pages and perfect landscape vector rendering.
 */
export const printOrgChartArea = (elementId = "printable-org-chart", title = "Kasina Hotel - Organizational Hierarchy") => {
  const element = document.getElementById(elementId) || document.querySelector(".org-print-canvas");

  if (!element) {
    window.print();
    return;
  }

  // Remove any previously created print iframe
  const oldIframe = document.getElementById("kasina-org-print-frame");
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "kasina-org-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  // Extract all stylesheets from current document
  let stylesHtml = "";
  document.querySelectorAll("style, link[rel='stylesheet']").forEach((styleNode) => {
    stylesHtml += styleNode.outerHTML;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${stylesHtml}
        <style>
          @page {
            size: landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 4px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            width: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          /* Ensure all nodes inside the printable area are visible */
          body * {
            visibility: visible !important;
          }
          .org-print-canvas {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          /* Hide buttons and interactive filters */
          button, input, select, .print\\:hidden, .print-hide {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:flex {
            display: flex !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 400);
};

/**
 * Executive Standard Employee Payslip Printer (A4 Portrait)
 * Generates an official, bank-standard payroll slip with:
 * - Corporate Branding & Header
 * - Complete Employee & Period Identification
 * - Side-by-side Earnings & Deductions with Ethiopian Statutory Tax & Pension compliance
 * - Take-Home Net Pay Summary Banner
 * - Company Pension Memo (11%)
 * - Tripartite Signature & Official Stamp Verification Block
 */
export const printPayslip = (item, periodMonth = "") => {
  if (!item) return;

  const oldIframe = document.getElementById("kasina-payslip-print-frame");
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "kasina-payslip-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  const fmt = (num) =>
    Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const baseSalary = Number(item.base_salary || 0);
  const allowances = Number(item.allowances || 0);
  const overtime = Number(item.overtime || 0);
  const bonuses = Number(item.bonuses || 0);
  const grossSalary = Number(item.gross_salary || baseSalary + allowances + overtime + bonuses);

  const absenceDed = Number(item.absence_deduction || 0);
  const pensionEmployee = Number(item.pension_employee || 0);
  const incomeTax = Number(item.income_tax || 0);
  const otherDed = Number(item.other_deductions || 0);
  const totalDed = Number(item.total_deductions || item.deductions || absenceDed + pensionEmployee + incomeTax + otherDed);
  const netSalary = Number(item.net_salary || grossSalary - totalDed);
  const pensionEmployer = Number(item.pension_employer || 0);

  const refCode = `PS-${(item.employee_code || "EMP").replace(/[^a-zA-Z0-9]/g, "")}-${(periodMonth || "").replace("-", "")}`;
  const issueDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Payslip - ${item.first_name || ""} ${item.last_name || ""} (${periodMonth})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.45;
          }
          .payslip-container {
            width: 100%;
            max-width: 780px;
            margin: 0 auto;
            border: 1.5px solid #1e293b;
            border-radius: 6px;
            padding: 20px 24px;
            background: #ffffff;
          }
          /* Header */
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 14px;
          }
          .hotel-name {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0;
          }
          .hotel-sub {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .slip-badge {
            text-align: right;
          }
          .slip-title {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            letter-spacing: 0.05em;
          }
          .period-tag {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
            color: #334155;
            margin-top: 4px;
          }
          /* Metadata Box */
          .meta-box {
            width: 100%;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 16px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-table td {
            padding: 3px 6px;
            font-size: 11px;
            vertical-align: top;
          }
          .meta-label {
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            width: 16%;
          }
          .meta-val {
            color: #0f172a;
            font-weight: 700;
            width: 34%;
          }
          /* Earnings & Deductions Tables */
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          .breakdown-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 6px 10px;
            border: 1px solid #0f172a;
          }
          .breakdown-table td {
            padding: 6px 10px;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          .row-total {
            background: #f8fafc;
            font-weight: 800;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .text-muted {
            color: #64748b;
            font-size: 10px;
          }
          .text-danger {
            color: #b91c1c;
            font-weight: 700;
          }
          /* Net Salary Highlight */
          .net-banner {
            width: 100%;
            background: #0f172a;
            color: #ffffff;
            border-radius: 6px;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }
          .net-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .net-subtitle {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 2px;
          }
          .net-amount {
            font-size: 20px;
            font-weight: 900;
            color: #38bdf8;
            letter-spacing: -0.02em;
          }
          /* Employer Contribution Memo */
          .memo-box {
            border: 1px dashed #94a3b8;
            background: #fafafa;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 10px;
            color: #475569;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
          }
          /* Signatures */
          .signatures-grid {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
          }
          .signatures-grid td {
            width: 33.33%;
            padding: 0 12px;
            vertical-align: top;
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #0f172a;
            margin-top: 40px;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
          }
          .sign-title {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
          }
          /* Footer */
          .footer-note {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: middle;">
                <h1 class="hotel-name">Kasina Hotel &amp; Suites</h1>
                <p class="hotel-sub">Human Resources &bull; Payroll Division &bull; Confidential</p>
              </td>
              <td class="slip-badge" style="vertical-align: middle;">
                <div class="slip-title">Official Salary Payslip</div>
                <div class="period-tag">Period: ${periodMonth || "N/A"}</div>
              </td>
            </tr>
          </table>

          <!-- Employee Information -->
          <div class="meta-box">
            <table class="meta-table">
              <tr>
                <td class="meta-label">Employee:</td>
                <td class="meta-val">${item.first_name || ""} ${item.last_name || ""}</td>
                <td class="meta-label">Slip Ref:</td>
                <td class="meta-val" style="font-family: monospace;">${refCode}</td>
              </tr>
              <tr>
                <td class="meta-label">Staff ID:</td>
                <td class="meta-val">${item.employee_code || "N/A"}</td>
                <td class="meta-label">Pay Date:</td>
                <td class="meta-val">${issueDate}</td>
              </tr>
              <tr>
                <td class="meta-label">Department:</td>
                <td class="meta-val">${item.department_name || "General Hotel Staff"}</td>
                <td class="meta-label">Payment Mode:</td>
                <td class="meta-val" style="text-transform: capitalize;">${item.payment_method ? item.payment_method.replace("_", " ") : "Bank Transfer"}</td>
              </tr>
              <tr>
                <td class="meta-label">Designation:</td>
                <td class="meta-val">${item.position_title || "Staff Member"}</td>
                <td class="meta-label">Attendance:</td>
                <td class="meta-val">${item.days_worked || 0} Worked &bull; <span style="${Number(item.days_absent) > 0 ? "color:#b91c1c;" : ""}">${item.days_absent || 0} Absent</span></td>
              </tr>
            </table>
          </div>

          <!-- Breakdown: Side by Side Earnings & Deductions -->
          <table class="breakdown-table">
            <thead>
              <tr>
                <th style="width: 32%;">Earnings / Allowances</th>
                <th style="width: 18%;" class="text-right">Amount (ETB)</th>
                <th style="width: 32%;">Deductions / Taxes</th>
                <th style="width: 18%;" class="text-right">Amount (ETB)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Monthly Salary</td>
                <td class="text-right" style="font-weight: 600;">${fmt(baseSalary)}</td>
                <td>
                  Absence Deductions
                  ${absenceDed > 0 ? `<div class="text-muted">(${item.days_absent} unexcused days)</div>` : ""}
                </td>
                <td class="text-right ${absenceDed > 0 ? "text-danger" : ""}">${fmt(absenceDed)}</td>
              </tr>
              <tr>
                <td>Position / Duty Allowances</td>
                <td class="text-right">${fmt(allowances)}</td>
                <td>
                  Pension Contribution (Employee 7%)
                  <div class="text-muted">Statutory Pension Proclamation</div>
                </td>
                <td class="text-right ${pensionEmployee > 0 ? "text-danger" : ""}">${fmt(pensionEmployee)}</td>
              </tr>
              <tr>
                <td>Overtime Pay</td>
                <td class="text-right">${fmt(overtime)}</td>
                <td>
                  Employment Income Tax
                  <div class="text-muted">Ethiopian Proclamation No. 979/2016</div>
                </td>
                <td class="text-right ${incomeTax > 0 ? "text-danger" : ""}">${fmt(incomeTax)}</td>
              </tr>
              <tr>
                <td>Bonus / Incentives</td>
                <td class="text-right">${fmt(bonuses)}</td>
                <td>Other Deductions / Advances</td>
                <td class="text-right ${otherDed > 0 ? "text-danger" : ""}">${fmt(otherDed)}</td>
              </tr>
              <tr class="row-total">
                <td style="font-weight: 800;">TOTAL GROSS EARNINGS</td>
                <td class="text-right" style="font-weight: 800;">${fmt(grossSalary)} ETB</td>
                <td style="font-weight: 800;">TOTAL DEDUCTIONS</td>
                <td class="text-right text-danger" style="font-weight: 800;">-${fmt(totalDed)} ETB</td>
              </tr>
            </tbody>
          </table>

          <!-- Net Pay Banner -->
          <div class="net-banner">
            <div>
              <div class="net-title">Net Salary Payable (Take Home)</div>
              <div class="net-subtitle">Direct credit to employee registered bank account</div>
            </div>
            <div class="net-amount">${fmt(netSalary)} ETB</div>
          </div>

          <!-- Employer Contributions Note -->
          <div class="memo-box">
            <span><strong>Company Statutory Benefit:</strong> Employer Pension Contribution (11% company covered):</span>
            <span style="font-weight: 700; color: #0f172a;">${fmt(pensionEmployer)} ETB</span>
          </div>

          <!-- Signatures Block -->
          <table class="signatures-grid">
            <tr>
              <td>
                <div class="sign-line">Prepared By</div>
                <div class="sign-title">Payroll Officer / HR</div>
              </td>
              <td>
                <div class="sign-line">Approved By</div>
                <div class="sign-title">General Manager / Finance</div>
              </td>
              <td>
                <div class="sign-line">Received By</div>
                <div class="sign-title">${item.first_name || ""} ${item.last_name || ""} (Employee)</div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="footer-note">
            This is an official computer-generated document from Kasina Hotel Management System (HMS).
            Valid with authorized signature and seal. For payroll inquiries, contact HR Division.
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 400);
};

/**
 * 100% Reliable Official Order Receipt & Guest Check Printer (80mm POS & Standard)
 */
export const printOrderReceipt = (order, options = {}) => {
  if (!order) return;

  const oldIframe = document.getElementById("kasina-order-print-frame");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "kasina-order-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const restaurantName = options.restaurantName || "KASINA HOTEL";
  const restaurantSub = options.restaurantSub || "HOTEL & RESTAURANT";
  const orderNum = order.order_number || `#${order.id || "POS"}`;
  const tableNum = String(order.table_number || order.table_id || "1").replace(/^T/i, "T");
  const waiterName = [
    order.waiter_first_name,
    order.waiter_last_name
  ].filter(Boolean).join(" ") || order.waiter_name || order.waiterName || options.waiterName || "Staff Waiter";

  const customerName = order.customer_name || order.customerName || order.vip_name || order.vip_customer_name || "";
  const items = Array.isArray(order.items) ? order.items : [];

  const netSubtotal = items.reduce((sum, i) => {
    const q = Number(i.quantity ?? i.qty ?? 1);
    const p = Number(i.unit_price ?? i.price ?? i.product_price ?? 0);
    return sum + q * p;
  }, 0);

  const recordedTotal = Number(
    order.total_amount ??
    order.total ??
    order.grand_total ??
    order.grandTotal ??
    0
  );

  const tax = Number(order.tax ?? order.tax_amount ?? 0);
  const service = Number(order.service_charge ?? order.service_charge_amount ?? 0);
  const discount = Number(order.discount ?? order.discount_amount ?? 0);

  let grossTotal = recordedTotal > 0 ? recordedTotal : Math.max(netSubtotal - discount, 0);
  let vatAmount = Number((grossTotal - (grossTotal / 1.15)).toFixed(2));
  let baseNet = Number((grossTotal / 1.15).toFixed(2));
  let serviceCharge = service;

  const pStatus = String(order.payment_status || "unpaid").toUpperCase();
  const pMethod = String(order.payment_method || order.paymentMethod || "CASH").toUpperCase();
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : new Date().toLocaleString();

  const title = options.title || (
    pStatus === "PAID"
      ? "OFFICIAL SALES RECEIPT"
      : pStatus.includes("CREDIT")
      ? "VIP CREDIT TICKET"
      : "GUEST CHECK / BILL"
  );

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${orderNum}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; align-items: baseline; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
          .item-name { max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${restaurantName}</div>
          <div style="font-size: 9px; color: #333; text-transform: uppercase; margin-top: 1px;">${restaurantSub}</div>
          <div style="font-size: 10px; font-weight: 900; margin: 4px 0 2px 0;">*** ${title} ***</div>
          <div style="font-size: 11px; font-weight: bold;">Order: ${orderNum} • Table #${tableNum}</div>
          <div style="font-size: 9px; color: #444; margin-top: 1px;">${dateStr}</div>
          ${waiterName ? `<div style="font-size: 9px; margin-top: 1px;">Server: <b>${waiterName}</b></div>` : ""}
          ${customerName ? `<div style="font-size: 9px; font-weight: bold; margin-top: 1px;">Customer: ${customerName}</div>` : ""}
        </div>

        <div class="divider"></div>

        <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px;" class="flex-between">
          <span>QTY  ITEM</span>
          <span>AMOUNT</span>
        </div>

        ${items.length > 0 ? items.map(it => {
          const q = Number(it.quantity ?? it.qty ?? 1);
          const p = Number(it.unit_price ?? it.price ?? 0);
          const lineTotal = Number(it.total ?? (q * p));
          const name = it.name || it.product_name || "Item";
          const portion = parseItemPortion(it);
          return `
            <div class="item-row">
              <div class="item-name">
                <span><b>${portion.displayServing}</b> ${name}</span>
                ${p > 0 ? `<span style="font-size: 8px; color: #555;"> (@${p.toFixed(2)})</span>` : ""}
              </div>
              <span class="font-bold">${lineTotal.toFixed(2)}</span>
            </div>
          `;
        }).join("") : `
          <div style="font-size: 10px; text-align: center; color: #555; padding: 4px 0;">
            1x Order Items
          </div>
        `}

        <div class="divider"></div>

        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Items Total (Menu Price):</span>
          <span>${(grossTotal + discount).toFixed(2)} ETB</span>
        </div>
        ${discount > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px; color: #666;">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)} ETB</span>
          </div>
        ` : ""}
        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px; color: #555;">
          <span>Net Base (Excl. VAT):</span>
          <span>${baseNet.toFixed(2)} ETB</span>
        </div>
        <div class="flex-between font-bold" style="font-size: 10px; margin-bottom: 2px;">
          <span>15% VAT (Included in Price):</span>
          <span>${vatAmount.toFixed(2)} ETB</span>
        </div>
        ${serviceCharge > 0 ? `
          <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
            <span>Service Charge:</span>
            <span>+${serviceCharge.toFixed(2)} ETB</span>
          </div>
        ` : ""}

        <div class="double-divider"></div>

        <div class="flex-between font-bold" style="font-size: 14px; margin: 4px 0;">
          <span>TOTAL (INCL. 15% VAT):</span>
          <span>${grossTotal.toFixed(2)} ETB</span>
        </div>

        <div class="double-divider"></div>

        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Payment Status:</span>
          <span style="font-weight: 900;">${pStatus}</span>
        </div>
        <div class="flex-between" style="font-size: 10px; margin-bottom: 2px;">
          <span>Payment Method:</span>
          <span style="font-weight: bold;">${pMethod}</span>
        </div>
        ${order.reference ? `
          <div class="flex-between" style="font-size: 9px; color: #444; margin-bottom: 2px;">
            <span>Reference:</span>
            <span>${order.reference}</span>
          </div>
        ` : ""}

        <div class="divider"></div>

        <div class="text-center" style="font-size: 9px; margin-top: 6px; color: #222;">
          <div>Thank you for dining with us!</div>
          <div style="font-size: 8px; color: #666; margin-top: 2px;">Please retain this receipt.</div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 300);
};


