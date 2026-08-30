"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom date / date-time picker — no native input, no dependency. Emits an ISO
// string (or "" when cleared). Matches the admin brand styling.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

export default function DatePicker({ value, onChange, withTime = false, placeholder = "Select date", className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = value ? new Date(value) : null;
  const valid = selected && !isNaN(selected);
  const [view, setView] = useState(() => (valid ? new Date(selected) : new Date()));

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const hours = valid ? selected.getHours() : 0;
  const mins = valid ? selected.getMinutes() : 0;

  const emit = (d) => onChange(d.toISOString());

  const pickDay = (day) => {
    const d = new Date(y, m, day, withTime ? hours : 0, withTime ? mins : 0);
    emit(d);
    if (!withTime) setOpen(false);
  };
  const setTime = (h, mi) => {
    const base = valid ? new Date(selected) : new Date(y, m, 1);
    base.setHours(h, mi, 0, 0);
    emit(base);
  };

  const label = valid
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()}${withTime ? `, ${pad(selected.getHours())}:${pad(selected.getMinutes())}` : ""}`
    : "";

  const isSelected = (day) => valid && selected.getFullYear() === y && selected.getMonth() === m && selected.getDate() === day;
  const today = new Date();
  const isToday = (day) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === day;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl border border-smoke/30 bg-white text-[13px] text-left text-ink hover:border-ink/50 focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal/15 transition-shadow"
      >
        <Calendar size={14} className="text-smoke flex-shrink-0" />
        <span className={cn("flex-1 truncate", !label && "text-smoke/50")}>{label || placeholder}</span>
        {value && (
          <X
            size={14}
            className="text-smoke hover:text-red-500 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-[260px] bg-white border border-smoke/25 rounded-2xl shadow-xl p-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} className="p-1.5 rounded-2xl text-smoke hover:bg-paper">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[13px] font-semibold text-ink">{MONTHS[m]} {y}</span>
            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} className="p-1.5 rounded-2xl text-smoke hover:bg-paper">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {DOW.map((d) => <div key={d} className="text-[10px] font-medium text-smoke/70 py-1">{d}</div>)}
            {cells.map((day, i) => day === null ? (
              <div key={`e${i}`} />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => pickDay(day)}
                className={cn(
                  "h-8 w-8 mx-auto flex items-center justify-center rounded-2xl text-[12px] transition-colors",
                  isSelected(day)
                    ? "bg-signal text-white font-semibold"
                    : isToday(day)
                      ? "text-signal font-semibold hover:bg-paper"
                      : "text-ink hover:bg-paper"
                )}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Time */}
          {withTime && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-smoke/15">
              <span className="text-[11px] text-smoke">Time</span>
              <select
                value={hours}
                onChange={(e) => setTime(Number(e.target.value), mins)}
                className="flex-1 rounded-2xl border border-smoke/30 px-2 py-1 text-[12px] text-ink bg-white focus:outline-none focus:border-ink"
              >
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
              </select>
              <span className="text-smoke">:</span>
              <select
                value={mins}
                onChange={(e) => setTime(hours, Number(e.target.value))}
                className="flex-1 rounded-2xl border border-smoke/30 px-2 py-1 text-[12px] text-ink bg-white focus:outline-none focus:border-ink"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((mi) => <option key={mi} value={mi}>{pad(mi)}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-between mt-3 pt-2 border-t border-smoke/15">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-[11px] text-smoke hover:text-red-500">Clear</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-signal font-medium hover:underline">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
