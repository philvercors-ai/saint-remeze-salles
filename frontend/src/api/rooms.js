import client from "./client";

export const roomsApi = {
  list: () => client.get("/rooms/"),
  get: (id) => client.get(`/rooms/${id}/`),
  availability: (id, date) => client.get(`/rooms/${id}/availability/`, { params: { date } }),
  create: (data) => client.post("/rooms/", data),
  update: (id, data) => client.patch(`/rooms/${id}/`, data),
  delete: (id) => client.delete(`/rooms/${id}/`),
};
