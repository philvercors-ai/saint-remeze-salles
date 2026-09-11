import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const fmtDate = (d) => format(typeof d === "string" ? parseISO(d) : d, "yyyy-MM-dd");
export const fmtDateFr = (d) => format(typeof d === "string" ? parseISO(d) : d, "d MMMM yyyy", { locale: fr });
export const fmtDateShortFr = (d) => format(typeof d === "string" ? parseISO(d) : d, "d MMMM", { locale: fr });
export const fmtMonthFr = (d) => format(typeof d === "string" ? parseISO(d) : d, "MMMM yyyy", { locale: fr });
export const fmtTime = (t) => t?.substring(0, 5) ?? "";

export const getWeekDays = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const isSameDay = (a, b) => fmtDate(a) === fmtDate(b);

export const HOURS = Array.from({ length: 17 }, (_, i) => `${(i + 7).toString().padStart(2, "0")}:00`); // 07:00 → 23:00 (jusqu'à minuit)

export { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth };
