import api from "../../../services/api";

export const getRooms = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.floor && params.floor !== "all") query.append("floor", params.floor);
  if (params.typeId && params.typeId !== "all") query.append("typeId", params.typeId);
  const qStr = query.toString();
  return api(`/rooms${qStr ? `?${qStr}` : ""}`);
};

export const getRoom = (id) => api(`/rooms/${id}`);

export const createRoom = (data) =>
  api("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateRoom = (id, data) =>
  api(`/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const updateRoomStatus = (id, status, notes = "") =>
  api(`/rooms/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });

export const deleteRoom = (id) =>
  api(`/rooms/${id}`, {
    method: "DELETE",
  });

export const getRoomTypes = () => api("/rooms/types");

export const createRoomType = (data) =>
  api("/rooms/types", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateRoomType = (id, data) =>
  api(`/rooms/types/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteRoomType = (id) =>
  api(`/rooms/types/${id}`, {
    method: "DELETE",
  });

export const getRoomStats = () => api("/rooms/stats");

// Reservations
export const getReservations = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.roomId) query.append("roomId", params.roomId);
  const qStr = query.toString();
  return api(`/room-reservations${qStr ? `?${qStr}` : ""}`);
};

export const getReservation = (id) => api(`/room-reservations/${id}`);

export const createReservation = (data) =>
  api("/room-reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const checkInReservation = (id) =>
  api(`/room-reservations/${id}/check-in`, {
    method: "POST",
  });

export const checkOutReservation = (id, data) =>
  api(`/room-reservations/${id}/check-out`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const addReservationPayment = (id, data) =>
  api(`/room-reservations/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const cancelReservation = (id, reason) =>
  api(`/room-reservations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
