"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  disabled?: boolean;
}

export function CalendarPicker({ value, onChange, disabled }: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value + "T00:00:00") : new Date();
  });

  // Sync date when value changes externally
  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value + "T00:00:00"));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const prevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectDate = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center justify-center h-9 w-9 rounded-md border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        <CalendarIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-55 p-3 w-[260px] bg-[#09090b] border border-border/80 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-xs text-foreground">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((date, idx) => {
              if (!date) return <span key={`empty-${idx}`} />;
              
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, "0");
              const dd = String(date.getDate()).padStart(2, "0");
              const dateStr = `${yyyy}-${mm}-${dd}`;
              
              const isSelected = value === dateStr;
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={(e) => selectDate(date, e)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                    isSelected 
                      ? "bg-primary text-primary-foreground font-bold" 
                      : isToday 
                        ? "border border-primary/50 text-primary hover:bg-primary/10" 
                        : "text-neutral-400 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
