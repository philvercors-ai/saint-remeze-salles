import client from "./client";

export const reservationsApi = {
  list: (params) => client.get("/reservations/", { params }),
  get: (id) => client.get(`/reservations/${id}/`),
  create: (data) => client.post("/reservations/", data),
  createRecurring: (data) => client.post("/reservations/recurring/", data),
  update: (id, data) => client.patch(`/reservations/${id}/`, data),
  delete: (id) => client.delete(`/reservations/${id}/`),
  approve: (id, comment = "") => client.post(`/reservations/${id}/approve/`, { comment }),
  reject: (id, comment = "") => client.post(`/reservations/${id}/reject/`, { comment }),
  approveGroup: (group_id, comment = "") => client.post("/reservations/approve_group/", { group_id, comment }),
  rejectGroup: (group_id, comment = "") => client.post("/reservations/reject_group/", { group_id, comment }),
  my: () => client.get("/reservations/my/"),
  planning: (params) => client.get("/reservations/planning/", { params }),
  exportCsv: () => client.get("/reservations/export_csv/", { responseType: "blob" }),
};
