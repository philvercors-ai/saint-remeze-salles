import client from "./client";

export const rgpdApi = {
  myData: () => client.get("/rgpd/my-data/"),
  myDataCsv: () => client.get("/rgpd/my-data/csv/", { responseType: "blob" }),
  requestDeletion: () => client.post("/rgpd/request-deletion/"),
  consents: () => client.get("/rgpd/consents/"),
  recordConsent: (data) => client.post("/rgpd/consents/", data),
  privacyPolicy: () => client.get("/rgpd/privacy-policy/"),
};

export const notificationsApi = {
  services: () => client.get("/notifications/services/"),
  send: (data) => client.post("/notifications/send/", data),
  history: () => client.get("/notifications/history/"),
};
