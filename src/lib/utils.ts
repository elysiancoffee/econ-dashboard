import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines if a task should be visible based on its due date.
 * - Tasks with no due date are always visible.
 * - Past tasks are always visible (so users can see/complete overdue tasks).
 * - Current month's tasks are always visible.
 * - Tasks for the next month up to the 10th are visible starting from the 23rd of the current month.
 * - Any other future tasks are not visible.
 */
export function isTaskVisible(dueDateStr: string | null | undefined, currentDate: Date = new Date()): boolean {
  if (!dueDateStr) return true;

  const parts = dueDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return true;
  const [y, m, d] = parts;

  const todayYear = currentDate.getFullYear();
  const todayMonth = currentDate.getMonth(); // 0-indexed
  const todayDay = currentDate.getDate();

  const taskYear = y;
  const taskMonth = m - 1; // Convert 1-indexed to 0-indexed
  const taskDay = d;

  const currentMonthStart = new Date(todayYear, todayMonth, 1);
  const taskDate = new Date(taskYear, taskMonth, taskDay);

  // Overdue/past tasks are visible
  if (taskDate < currentMonthStart) {
    return true;
  }

  // Current month tasks are always visible
  if (taskYear === todayYear && taskMonth === todayMonth) {
    return true;
  }

  // By the 23rd of the current (previous relative to next) month, tasks till the 10th of the next month start getting visible
  if (todayDay >= 23) {
    let nextMonth = todayMonth + 1;
    let nextMonthYear = todayYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextMonthYear += 1;
    }
    if (taskYear === nextMonthYear && taskMonth === nextMonth && taskDay <= 10) {
      return true;
    }
  }

  return false;
}

/**
 * Determines if a task is in the current month of the current year.
 */
export function isCurrentMonthTask(dueDateStr: string | null | undefined, currentDate: Date = new Date()): boolean {
  if (!dueDateStr) return false;
  const parts = dueDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [y, m, d] = parts;

  const todayYear = currentDate.getFullYear();
  const todayMonth = currentDate.getMonth();

  return y === todayYear && (m - 1) === todayMonth;
}

/**
 * Determines if a task's due date is in 2 days or less (including overdue tasks).
 */
export function isDueSoon(dueDateStr: string | null | undefined, currentDate: Date = new Date()): boolean {
  if (!dueDateStr) return false;
  const parts = dueDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [y, m, d] = parts;

  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const taskDate = new Date(y, m - 1, d);

  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 2;
}

