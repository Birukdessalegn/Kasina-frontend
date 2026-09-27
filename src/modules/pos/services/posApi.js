import api from '../../../services/api';

// =========================================================
// CASHIER SHIFT SERVICES
// =========================================================

export const getCurrentShift = async () => {
  const res = await api('/pos/shifts/current');
  return res?.shift || res?.data || res;
};

export const startShift = async (openingCash = 0, outletId = null) => {
  return await api('/pos/shifts/start', {
    method: 'POST',
    body: JSON.stringify({
      opening_cash: Number(openingCash) || 0,
      openingCash: Number(openingCash) || 0,
      outlet_id: outletId ? Number(outletId) : undefined,
      outletId: outletId ? Number(outletId) : undefined,
    }),
  });
};

export const closeShift = async (actualCashCounted = 0, notes = '') => {
  const parsedCash = Number(actualCashCounted);
  const counted = isNaN(parsedCash) ? 0 : parsedCash;
  return await api('/pos/shifts/close', {
    method: 'POST',
    body: JSON.stringify({
      actual_cash: counted,
      actualCash: counted,
      actual_cash_counted: counted,
      actualCashCounted: counted,
      closing_notes: notes,
      notes,
    }),
  });
};

// =========================================================
// POS ORDER & ITEM MODIFICATION SERVICES
// =========================================================

export const getPosOrders = async () => {
  return await api('/pos/orders');
};

export const getOrderDetails = async (orderId) => {
  return await api('/pos/orders/' + orderId);
};

export const addOrderItems = async (orderId, items = []) => {
  return await api('/pos/orders/' + orderId + '/items', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
};

export const updateOrderItem = async (orderId, itemId, quantity, notes = '') => {
  return await api('/pos/orders/' + orderId + '/items/' + itemId, {
    method: 'PUT',
    body: JSON.stringify({
      quantity: Number(quantity),
      notes,
    }),
  });
};

export const removeOrderItem = async (orderId, itemId, reason = 'Customer changed order') => {
  return await api('/pos/orders/' + orderId + '/items/' + itemId, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
};

export const cancelOrder = async (orderId, reason = 'Order cancelled') => {
  return await api('/pos/orders/' + orderId + '/status', {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled', reason }),
  });
};

export default {
  getCurrentShift,
  startShift,
  closeShift,
  getPosOrders,
  getOrderDetails,
  addOrderItems,
  updateOrderItem,
  removeOrderItem,
  cancelOrder,
};
