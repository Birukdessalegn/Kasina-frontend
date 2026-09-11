import { X, Printer, Building2, CheckCircle2 } from "lucide-react";

function PayslipModal({ isOpen, onClose, item, periodMonth }) {
  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="relative w-full max-w-lg my-4 sm:my-auto max-h-[86vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Official Payslip</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Payslip Paper Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Hotel & Period */}
          <div className="text-center pb-4 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              Kasina Hotel Management
            </h3>
            <p className="text-xs text-slate-500">Employee Salary Slip • {periodMonth}</p>
          </div>

          {/* Employee Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400">Employee Name:</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {item.first_name} {item.last_name}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Employee Code:</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{item.employee_code}</p>
            </div>
            <div>
              <span className="text-slate-400">Department:</span>
              <p className="font-semibold text-slate-700 mt-0.5">{item.department_name || "General"}</p>
            </div>
            <div>
              <span className="text-slate-400">Designation / Position:</span>
              <p className="font-semibold text-slate-700 mt-0.5">{item.position_title || "Staff"}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Earnings & Deductions
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Base Monthly Salary</span>
                <span className="font-bold text-slate-900">{Number(item.base_salary || 0).toLocaleString()} ETB</span>
              </div>

              {(Number(item.allowances) > 0 || Number(item.overtime) > 0 || Number(item.bonuses) > 0) && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Allowances / Overtime / Bonus</span>
                  <span className="font-semibold text-emerald-600">
                    +{(Number(item.allowances || 0) + Number(item.overtime || 0) + Number(item.bonuses || 0)).toLocaleString()} ETB
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-slate-100 bg-slate-50/70 px-2 rounded-md font-semibold text-xs text-slate-800">
                <span>Gross Earned Salary</span>
                <span>{Number(item.gross_salary || item.base_salary || 0).toLocaleString()} ETB</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Attendance: Days Worked / Absent</span>
                <span className="font-medium text-slate-700">{item.days_worked || 0} worked / {item.days_absent || 0} absent</span>
              </div>

              {Number(item.absence_deduction || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Absence Deduction ({item.days_absent} days)</span>
                  <span className="font-semibold text-rose-600">-{Number(item.absence_deduction).toLocaleString()} ETB</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Employee Pension Contribution (7%)</span>
                <span className="font-semibold text-rose-600">
                  {Number(item.pension_employee || 0) > 0 ? `-${Number(item.pension_employee).toLocaleString()} ETB` : "0.00 ETB"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Statutory Income Tax (Procl. 979/2016)</span>
                <span className="font-semibold text-rose-600">
                  {Number(item.income_tax || 0) > 0 ? `-${Number(item.income_tax).toLocaleString()} ETB` : "0.00 ETB"}
                </span>
              </div>

              {Number(item.other_deductions || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Other Deductions</span>
                  <span className="font-semibold text-rose-600">-{Number(item.other_deductions).toLocaleString()} ETB</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-slate-200 text-xs font-bold text-rose-700">
                <span>Total Deductions</span>
                <span>-{Number(item.total_deductions || item.deductions || 0).toLocaleString()} ETB</span>
              </div>

              <div className="flex justify-between py-2.5 bg-slate-900 text-white rounded-xl px-4 mt-2">
                <span className="font-bold">Net Salary Payable</span>
                <span className="text-base font-black text-amber-400">
                  {Number(item.net_salary || 0).toLocaleString()} ETB
                </span>
              </div>

              {Number(item.pension_employer || 0) > 0 && (
                <div className="flex justify-between pt-1 text-[11px] text-slate-400 italic">
                  <span>Employer Pension Contribution (11% company paid)</span>
                  <span>{Number(item.pension_employer).toLocaleString()} ETB</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-[11px] text-slate-400">
            Payment Mode: Bank Transfer • Generated by Kasina HMS
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayslipModal;
