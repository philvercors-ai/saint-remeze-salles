import client from "./client";

export const manifestationsApi = {
  list: (params) => client.get("/manifestations/", { params }),
  get: (id) => client.get(`/manifestations/${id}/`),
  create: (data) => client.post("/manifestations/", data),
  update: (id, data) => client.patch(`/manifestations/${id}/`, data),
  delete: (id) => client.delete(`/manifestations/${id}/`),
  approve: (id, comment = "") => client.post(`/manifestations/${id}/approve/`, { comment }),
  reject: (id, comment = "") => client.post(`/manifestations/${id}/reject/`, { comment }),
  my: () => client.get("/manifestations/my/"),
  exportCsv: () => client.get("/manifestations/export_csv/", { responseType: "blob" }),
  equipmentAvailability: (date_start, date_end) =>
    client.get("/manifestations/equipment_availability/", { params: { date_start, date_end } }),
};
