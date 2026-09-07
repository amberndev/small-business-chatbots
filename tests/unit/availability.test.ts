import { expect, it } from "vitest";
import { availability, clinicDate, scheduleError } from "@/lib/booking/availability";

it("uses Sydney dates across UTC midnight and rejects past or impossible dates", () => {
  const now = new Date("2026-09-06T23:30:00Z");
  expect(clinicDate(now)).toBe("2026-09-07");
  expect(availability("dental", now)[0].date).toBe("2026-09-08");
  for (const date of ["2026-09-07", "2026-02-30", "2099-01-01", "Monday"]) expect(scheduleError("dental", date, undefined, now)).toBeTruthy();
});
it("offers mixed capacity, closes Sundays, and rejects unavailable times", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const days = availability("dental", now);
  expect(days).toHaveLength(45);
  for (const day of days.filter(day => new Date(day.date).getUTCDay() === 0)) expect(day.slots.every(slot => !slot.available)).toBe(true);
  const day = days.find(day => day.slots.some(slot => slot.available))!;
  expect(scheduleError("dental", day.date, day.slots.find(slot => slot.available)!.time, now)).toBeUndefined();
  expect(scheduleError("dental", day.date, day.slots.find(slot => !slot.available)!.time, now)).toBeTruthy();
  expect(scheduleError("dental", day.date, "23:00", now)).toBeTruthy();
});
