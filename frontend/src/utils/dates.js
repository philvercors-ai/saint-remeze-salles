import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const fmtDate = (d) => format(typeof d === "string" ? parseISO(d) : d, "yyyy-MM-dd");
export const fmtDateFr = (d) => format(typeof d === "string" ? parseISO(d) : d, "d MMMM yyyy", { locale: fr });
export const fmtTime = (t) => t?.substring(0, 5) ?? "";

export const getWeekDays = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const isSameDay = (a, b) => fmtDate(a) === fmtDate(b);

export const HOURS = Array.from({ length: 15 }, (_, i) => `${(i + 7).toString().padStart(2, "0")}:00`); // 07:00 → 21:00

export { addDays };
