import type { ChatbotId } from "@/lib/types";

export const BOOKING_TIME_ZONE = "Australia/Sydney";
export const BOOKING_WINDOW_DAYS = 45;
export type AvailabilityDay = { date: string; slots: { time: string; available: boolean }[] };

export function clinicDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Fixed fictional capacity, not a live calendar or a reservation inventory. */
export function availability(chatbotId: ChatbotId, now = new Date()): AvailabilityDay[] {
  const today = new Date(`${clinicDate(now)}T12:00:00Z`);
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + index + 1);
    const date = day.toISOString().slice(0, 10);
    const weekday = day.getUTCDay();
    const seed = Math.floor(day.getTime() / 86400000) + chatbotId.length;
    const closed = weekday === 0 || (weekday === 6 && chatbotId !== "dental") || seed % 13 === 0;
    const times = weekday === 6 ? ["09:00", "09:30", "10:30", "11:00", "12:00"] : ["09:00", "09:30", "10:30", "11:00", "13:00", "14:00", "14:30", "16:00"];
    return { date, slots: times.map((time, i) => ({ time, available: !closed && (seed + i) % 3 !== 0 })) };
  });
}

export function scheduleError(chatbotId: ChatbotId, date: string, time?: string, now = new Date()) {
  const day = availability(chatbotId, now).find(day => day.date === date);
  if (!day?.slots.some(slot => slot.available)) return "Choose an available date in the next 45 days using the demo calendar.";
  if (time !== undefined && !day.slots.some(slot => slot.time === time && slot.available)) return "That time is unavailable in the demo schedule. Please choose an available time.";
}
