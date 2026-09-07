"use client";
import { useState } from "react";
import type { ChatResponse } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

const calendarCopy: Record<Lang, { locale: string; chooseDate: string; chooseTime: string; findTime: string; available: string; unavailable: string; slotNote: string; legend: string }> = {
  en: { locale: "en-GB", chooseDate: "01 / CHOOSE A DATE", chooseTime: "02 / CHOOSE A TIME", findTime: "Find a time that suits you", available: "Available", unavailable: "Unavailable", slotNote: "30-minute appointments. Unavailable times can't be selected.", legend: "Available · muted dates are closed or fully booked." },
  pt: { locale: "pt-BR", chooseDate: "01 / ESCOLHA A DATA", chooseTime: "02 / ESCOLHA O HORÁRIO", findTime: "Encontre um horário que funcione para você", available: "Disponível", unavailable: "Indisponível", slotNote: "Consultas de 30 minutos. Horários indisponíveis não podem ser selecionados.", legend: "Disponível · datas apagadas estão fechadas ou lotadas." },
};

export function BookingCalendar({ schedule, disabled, onSelect, lang = "en" }: { schedule: NonNullable<ChatResponse["schedule"]>; disabled: boolean; onSelect: (value: string) => void; lang?: Lang }) {
  const c = calendarCopy[lang];
  function prettyDate(date: string) {
    return new Intl.DateTimeFormat(c.locale, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  }
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
    <div className="booking-picker-title"><span className="eyebrow">{selected ? c.chooseTime : c.chooseDate}</span></div>
    <h3>{selected ? prettyDate(selected.date) : c.findTime}</h3>
    {selected ? <><div className="time-slots" aria-label="Appointment times">{selected.slots.map(slot => <button type="button" key={slot.time} disabled={disabled || !slot.available} onClick={() => onSelect(slot.time)} aria-label={`${slot.time}${slot.available ? " " + c.available : " " + c.unavailable}`}><strong>{slot.time}</strong><span>{slot.available ? c.available : c.unavailable}</span></button>)}</div><p className="calendar-legend">{c.slotNote}</p></> : <>
      <div className="calendar-navigation"><button type="button" aria-label="Previous month" disabled={disabled || shownMonth <= firstMonth} onClick={() => move(-1)}>‹</button><h4 aria-live="polite">{new Intl.DateTimeFormat(c.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</h4><button type="button" aria-label="Next month" disabled={disabled || shownMonth >= lastMonth} onClick={() => move(1)}>›</button></div>
      <div className="calendar-weekdays" aria-hidden="true">{(lang === "pt" ? ["S", "T", "Q", "Q", "S", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]).map((name, i) => <span key={i}>{name}</span>)}</div>
      <div className="calendar-days" role="group" aria-label="Choose an available date">{Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: count }, (_, i) => {
        const date = `${shownMonth}-${String(i + 1).padStart(2, "0")}`;
        const available = schedule.days.find(day => day.date === date)?.slots.some(slot => slot.available);
        return <button type="button" key={date} disabled={disabled || !available} data-date={date} aria-label={`${prettyDate(date)}, ${available ? c.available : c.unavailable}`} onClick={() => onSelect(date)}>{i + 1}{available && <span className="date-dot" />}</button>;
      })}</div>
      <p className="calendar-legend"><span className="date-dot" /> {c.legend}</p>
    </>}
  </section>;
}
