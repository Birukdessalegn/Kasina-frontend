import { useState } from 'react';
import { DollarSign, Clock, ShieldCheck, X, Utensils, Wine, Coffee } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { startShift } from '../services/posApi';

function ShiftStartModal({ isOpen, onClose, onShiftStarted, cashierName }) {
  const { user } = useAuth();
  const roleUpper = (user?.role || '').toUpperCase();
  const initialOutletId =
    user?.outletId ||
    user?.outlet_id ||
    (roleUpper.includes('CAFE') || roleUpper === 'BARISTA' ? 2 : roleUpper === 'BARTENDER' ? 3 : 4);

  const [openingCash, setOpeningCash] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState(initialOutletId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cashVal = parseFloat(openingCash);
    if (isNaN(cashVal) || cashVal < 0) {
      setError('Please enter a valid non-negative opening cash float.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await startShift(cashVal, selectedOutletId);
      if (onShiftStarted) {
        onShiftStarted(res.data || res.shift);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-6 backdrop-blur-xs flex justify-center items-start sm:items-center">
      <div className="w-full max-w-md my-4 sm:my-auto max-h-[86vh] flex flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl overflow-y-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Start Cashier Shift</h2>
              <p className="text-xs text-slate-500">Open drawer & register starting cash float</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Cashier:</span>
            <span className="font-bold text-slate-800">{cashierName || 'Current User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Time:</span>
            <span className="font-semibold text-slate-700">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {/* Cashier Station / Venue */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Operating Station / Venue
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedOutletId(4)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition ${
                  selectedOutletId === 4
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Utensils className="h-4 w-4 mb-1 text-blue-600" />
                <span>Restaurant</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOutletId(3)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition ${
                  selectedOutletId === 3
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Wine className="h-4 w-4 mb-1 text-amber-600" />
                <span>Main Bar</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOutletId(2)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition ${
                  selectedOutletId === 2
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coffee className="h-4 w-4 mb-1 text-emerald-600" />
                <span>Cafe & Bakery</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Menu items, categories, and tables will adapt to this venue for your shift.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Opening Cash Float (ETB)
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ETB
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-14 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Physical cash placed in the cash drawer at the start of shift.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShiftStartModal;
