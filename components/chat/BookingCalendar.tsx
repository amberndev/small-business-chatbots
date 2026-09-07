"use client";
import { useState } from "react";
import type { ChatResponse } from "@/lib/types";

function prettyDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function BookingCalendar({ schedule, disabled, onSelect }: { schedule: NonNullable<ChatResponse["schedule"]>; disabled: boolean; onSelect: (value: string) => void }) {
  const firstMonth = schedule.days[0].date.slice(0, 7);
  const lastMonth = schedule.days.at(-1)!.date.slice(0, 7);
  const [month, setMonth] = useState(firstMonth);
  const shownMonth = month < firstMonth || month > lastMonth ? firstMonth : month;
  const first = new Date(`${shownMonth}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  function move(delta: number) {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next.toISOString().slice(0, 7));
  }
  const selected = schedule.days.find(day => day.date === schedule.selectedDate);
  return <section className="booking-picker" aria-label="Demo appointment calendar">
    <div className="booking-picker-title"><span className="eyebrow">{selected ? "02 / CHOOSE A TIME" : "01 / CHOOSE A DATE"}</span><span className="sample-label">Sample availability</span></div>
    <h3>{selected ? prettyDate(selected.date) : "Find a time that suits you"}</h3>
    <p className="booking-timezone">Sydney time · {schedule.timeZone}</p>
    {selected ? <><div className="time-slots" aria-label="Appointment times">{selected.slots.map(slot => <button type="button" key={slot.time} disabled={disabled || !slot.available} onClick={() => onSelect(slot.time)} aria-label={`${slot.time}${slot.available ? " available" : " unavailable"}`}><strong>{slot.time}</strong><span>{slot.available ? "Available" : "Unavailable"}</span></button>)}</div><p className="calendar-legend">30-minute sample appointments. Unavailable times cannot be selected.</p></> : <>
      <div className="calendar-navigation"><button type="button" aria-label="Previous month" disabled={disabled || shownMonth <= firstMonth} onClick={() => move(-1)}>‹</button><h4 aria-live="polite">{new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</h4><button type="button" aria-label="Next month" disabled={disabled || shownMonth >= lastMonth} onClick={() => move(1)}>›</button></div>
      <div className="calendar-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((name, i) => <span key={i}>{name}</span>)}</div>
      <div className="calendar-days" role="group" aria-label="Choose an available date">{Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: count }, (_, i) => {
        const date = `${shownMonth}-${String(i + 1).padStart(2, "0")}`;
        const available = schedule.days.find(day => day.date === date)?.slots.some(slot => slot.available);
        return <button type="button" key={date} disabled={disabled || !available} data-date={date} aria-label={`${prettyDate(date)}, ${available ? "available" : "unavailable"}`} onClick={() => onSelect(date)}>{i + 1}{available && <span className="date-dot" />}</button>;
      })}</div>
      <p className="calendar-legend"><span className="date-dot" /> Available · Muted dates are closed or fully booked in this demo.</p>
    </>}
    <p className="booking-disclosure">Demonstration schedule only. No real calendar is connected.</p>
  </section>;
}
