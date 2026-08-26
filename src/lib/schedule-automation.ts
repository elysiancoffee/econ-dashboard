import { Task, User } from "@/lib/store";

export interface SchedulePeriod {
  id: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export interface TaskInput {
  boardId: string;
  title: string;
  description: string;
  assignedUserId: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Not Started" | "In Progress" | "Waiting" | "Completed" | "Cancelled";
  dueDate: string;
  recurrence?: string;
  recurrenceParentId?: string | null;
}

/**
 * Returns all { year, month } pairs contained in the period (inclusive).
 */
export function getMonthsInPeriod(period: SchedulePeriod): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  let curYear = period.startYear;
  let curMonth = period.startMonth;

  while (
    curYear < period.endYear ||
    (curYear === period.endYear && curMonth <= period.endMonth)
  ) {
    months.push({ year: curYear, month: curMonth });
    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }
  return months;
}

/**
 * Returns a valid YYYY-MM-DD string, clamped to the maximum days in that month.
 */
export function formatDate(year: number, month: number, day: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const validDay = Math.min(day, daysInMonth);
  const mm = month.toString().padStart(2, "0");
  const dd = validDay.toString().padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

export function getSundaysInMonth(year: number, month: number): string[] {
  const sundays: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0) {
      sundays.push(formatDate(year, month, day));
    }
  }
  return sundays;
}

export function findMatchingBoardId(
  scheduleTaskName: string,
  boards: { id: string; name: string }[]
): string {
  if (!boards || boards.length === 0) return "b-1";

  const norm = scheduleTaskName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Exact match (ignoring case & symbols)
  const exact = boards.find(
    (b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm
  );
  if (exact) return exact.id;

  // 2. Specific alias mappings
  if (norm.includes("cvc")) {
    const cvc = boards.find((b) => b.name.toLowerCase().includes("cvc"));
    if (cvc) return cvc.id;
  }
  if (norm.includes("avvie") || norm.includes("rb") || norm.includes("logging") || norm.includes("checkin")) {
    const avvie = boards.find((b) => {
      const bn = b.name.toLowerCase();
      return bn.includes("avvie") || bn.includes("rb") || bn.includes("check-in") || bn.includes("checkin");
    });
    if (avvie) return avvie.id;
  }
  if (norm.includes("mosaic")) {
    const mosaic = boards.find((b) => b.name.toLowerCase().includes("mosaic"));
    if (mosaic) return mosaic.id;
  }
  if (norm.includes("watch")) {
    const watch = boards.find((b) => b.name.toLowerCase().includes("watch"));
    if (watch) return watch.id;
  }
  if (norm.includes("poll")) {
    const poll = boards.find((b) => b.name.toLowerCase().includes("poll"));
    if (poll) return poll.id;
  }
  if (norm.includes("activity")) {
    const act = boards.find((b) => b.name.toLowerCase().includes("activity"));
    if (act) return act.id;
  }
  if (norm.includes("pth") || norm.includes("incentive")) {
    const pth = boards.find((b) => b.name.toLowerCase().includes("pth") || b.name.toLowerCase().includes("incentive"));
    if (pth) return pth.id;
  }

  // 3. Substring match
  const match = boards.find((b) => {
    const bNorm = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return norm.includes(bNorm) || bNorm.includes(norm);
  });
  if (match) return match.id;

  return boards[0].id;
}

/**
 * Generates automated recurring tasks for a schedule task assignment.
 * Assigns each task to its specific dedicated board (e.g. Watch Thread board, Item Poll board, etc.)
 */
export function generateAutomatedTasks({
  scheduleTaskName,
  period,
  assignedUsers,
  existingTasks,
  boards,
}: {
  scheduleTaskName: string;
  period: SchedulePeriod;
  assignedUsers: User[];
  existingTasks: Task[];
  boards: { id: string; name: string }[];
}): TaskInput[] {
  if (!assignedUsers || assignedUsers.length === 0) return [];

  const boardId = findMatchingBoardId(scheduleTaskName, boards);
  const months = getMonthsInPeriod(period);
  const rawCandidates: TaskInput[] = [];
  const normalizedTaskName = scheduleTaskName.toLowerCase().trim();

  const userIds = assignedUsers.map((u) => u.id);

  // ── 1. Watch Thread ──────────────────────────────────────────────────────────
  if (normalizedTaskName.includes("watch thread")) {
    months.forEach((m, mIdx) => {
      const subTasks = [
        {
          title: "Watch Thread: Post new watch thread",
          description: "1st of the month -- POST the new watch thread post.",
          day: 1,
        },
        {
          title: "Watch Thread: Draft second watch thread post",
          description: "15th of the month -- DRAFT the second watch thread post.",
          day: 15,
        },
        {
          title: "Watch Thread: Post second watch thread post",
          description: "18th of the month -- POST the second watch thread post.",
          day: 18,
        },
        {
          title: "Watch Thread: Draft next month's watch thread post",
          description: "27th of the month -- DRAFT the next month's 1st's watch thread post.",
          day: 27,
        },
      ];

      subTasks.forEach((st, stIdx) => {
        const assignedUserId = userIds[(mIdx * subTasks.length + stIdx) % userIds.length];
        rawCandidates.push({
          boardId,
          title: st.title,
          description: st.description,
          assignedUserId,
          priority: "Medium",
          status: "Not Started",
          dueDate: formatDate(m.year, m.month, st.day),
        });
      });
    });
  }

  // ── 2. Item Poll ─────────────────────────────────────────────────────────────
  else if (normalizedTaskName.includes("item poll")) {
    months.forEach((m) => {
      const round1 = [
        {
          title: "Item Poll: Post new round",
          description: "1st of the month -- POST the new round.",
          day: 1,
        },
        {
          title: "Item Poll: Draft results of previous round",
          description: "8th of the month -- DRAFT the results of the previous round.",
          day: 8,
        },
        {
          title: "Item Poll: Post results of previous round",
          description: "10th of the month -- POST the results of the previous round.",
          day: 10,
        },
        {
          title: "Item Poll: Draft new post for 15th",
          description: "13th of the month -- DRAFT the new post for the 15th of the month.",
          day: 13,
        },
      ];

      const round2 = [
        {
          title: "Item Poll: Post new round for 15th",
          description: "15th of the month -- POST the new post round.",
          day: 15,
        },
        {
          title: "Item Poll: Draft results of round 2",
          description: "22nd of the month -- DRAFT the results of the previous round.",
          day: 22,
        },
        {
          title: "Item Poll: Post results of round 2",
          description: "24th of the month -- POST the results of the previous round.",
          day: 24,
        },
        {
          title: "Item Poll: Draft next month's 1st post",
          description: "27th of the month -- DRAFT the next month's 1st's new post.",
          day: 27,
        },
      ];

      if (userIds.length === 1) {
        // Single user handles all tasks
        const singleUserId = userIds[0];
        [...round1, ...round2].forEach((st) => {
          rawCandidates.push({
            boardId,
            title: st.title,
            description: st.description,
            assignedUserId: singleUserId,
            priority: "Medium",
            status: "Not Started",
            dueDate: formatDate(m.year, m.month, st.day),
          });
        });
      } else if (userIds.length === 2) {
        // Divide by round: User 1 handles Round 1, User 2 handles Round 2
        round1.forEach((st) => {
          rawCandidates.push({
            boardId,
            title: st.title,
            description: st.description,
            assignedUserId: userIds[0],
            priority: "Medium",
            status: "Not Started",
            dueDate: formatDate(m.year, m.month, st.day),
          });
        });
        round2.forEach((st) => {
          rawCandidates.push({
            boardId,
            title: st.title,
            description: st.description,
            assignedUserId: userIds[1],
            priority: "Medium",
            status: "Not Started",
            dueDate: formatDate(m.year, m.month, st.day),
          });
        });
      } else {
        // >2 users: Distribute evenly
        const allTasks = [...round1, ...round2];
        allTasks.forEach((st, idx) => {
          rawCandidates.push({
            boardId,
            title: st.title,
            description: st.description,
            assignedUserId: userIds[idx % userIds.length],
            priority: "Medium",
            status: "Not Started",
            dueDate: formatDate(m.year, m.month, st.day),
          });
        });
      }
    });
  }

  // ── 3. Monthly Activity ──────────────────────────────────────────────────────
  else if (normalizedTaskName.includes("monthly activity")) {
    months.forEach((m, mIdx) => {
      const nextM = getNextMonth(m.year, m.month);
      const subTasks = [
        {
          title: "Monthly Activity: Post new contest",
          description: "1st of the month -- post the new contest.",
          dueDate: formatDate(m.year, m.month, 1),
        },
        {
          title: "Monthly Activity: Submit new contest draft for next month",
          description: "25th of the current month -- submit a new contest draft for NEXT month's contest.",
          dueDate: formatDate(m.year, m.month, 25),
        },
        {
          title: "Monthly Activity: Draw up ticket list for last month's contest",
          description: "1st of the NEXT month -- draw up a ticket list for the last month's contest.",
          dueDate: formatDate(nextM.year, nextM.month, 1),
        },
        {
          title: "Monthly Activity: Draw up winners from ticket list",
          description: "3rd of the NEXT month -- draw up winners from the ticket list just posted.",
          dueDate: formatDate(nextM.year, nextM.month, 3),
        },
      ];

      subTasks.forEach((st, stIdx) => {
        const assignedUserId = userIds[(mIdx * subTasks.length + stIdx) % userIds.length];
        rawCandidates.push({
          boardId,
          title: st.title,
          description: st.description,
          assignedUserId,
          priority: "Medium",
          status: "Not Started",
          dueDate: st.dueDate,
        });
      });
    });
  }

  // ── 4. CvC Sign-Ups ──────────────────────────────────────────────────────────
  else if (normalizedTaskName.includes("cvc")) {
    months.forEach((m, mIdx) => {
      const assignedUserId = userIds[mIdx % userIds.length];
      rawCandidates.push({
        boardId,
        title: "CvC Sign-Ups: Start sign ups for new month",
        description: "1st of the month -- start sign ups for the new month CvC",
        assignedUserId,
        priority: "Medium",
        status: "Not Started",
        dueDate: formatDate(m.year, m.month, 1),
      });
    });
  }

  // ── 5. PTH Incentive ─────────────────────────────────────────────────────────
  else if (normalizedTaskName.includes("pth")) {
    months.forEach((m, mIdx) => {
      const subTasks = [
        {
          title: "PTH Incentive: Streak review & Black Chips award",
          description: "1st of the month -- Find out streak of the last month's submissions & users and submit their subsequent black chips.",
          dueDate: formatDate(m.year, m.month, 1),
        },
        {
          title: "PTH Incentive: Monthly drawing & ticket list",
          description: "1st of the month -- Monthly drawing & put up a ticket list",
          dueDate: formatDate(m.year, m.month, 1),
        },
        {
          title: "PTH Incentive: Post winners from ticket list",
          description: "4th of the month -- post winners from that ticket list",
          dueDate: formatDate(m.year, m.month, 4),
        },
      ];

      subTasks.forEach((st, stIdx) => {
        const assignedUserId = userIds[(mIdx * subTasks.length + stIdx) % userIds.length];
        rawCandidates.push({
          boardId,
          title: st.title,
          description: st.description,
          assignedUserId,
          priority: "Medium",
          status: "Not Started",
          dueDate: st.dueDate,
        });
      });
    });
  }

  // ── 6. Avvie/RB Logging ──────────────────────────────────────────────────────
  else if (
    normalizedTaskName.includes("avvie") ||
    normalizedTaskName.includes("logging") ||
    normalizedTaskName.includes("rb")
  ) {
    let sundayCounter = 0;
    months.forEach((m) => {
      const sundays = getSundaysInMonth(m.year, m.month);
      sundays.forEach((sundayDate) => {
        const assignedUserId = userIds[sundayCounter % userIds.length];
        sundayCounter++;
        rawCandidates.push({
          boardId,
          title: "Avvie/RB Logging: Log avatar & RB claims and award Black Chips",
          description: "Every Sunday -- Log avatar and RB claims and award Black Chips",
          assignedUserId,
          priority: "Medium",
          status: "Not Started",
          dueDate: sundayDate,
        });
      });
    });
  }

  // ── 7. The Mosaic ────────────────────────────────────────────────────────────
  else if (normalizedTaskName.includes("mosaic")) {
    months.forEach((m, mIdx) => {
      const nextM = getNextMonth(m.year, m.month);
      const subTasks = [
        {
          title: "The Mosaic: Post new mosaic",
          description: "1st of the month -- post the new mosaic.",
          dueDate: formatDate(m.year, m.month, 1),
        },
        {
          title: "The Mosaic: Submit new draft for next month's mosaic",
          description: "25th of the current month -- submit a new contest draft for NEXT month's mosaic.",
          dueDate: formatDate(m.year, m.month, 25),
        },
        {
          title: "The Mosaic: Draw up ticket list for last month's mosaic",
          description: "1st of the NEXT month -- draw up a ticket list for the last month's mosaic.",
          dueDate: formatDate(nextM.year, nextM.month, 1),
        },
        {
          title: "The Mosaic: Draw up winners from mosaic ticket list",
          description: "3rd of the NEXT month -- draw up winners from the ticket list just mosaic.",
          dueDate: formatDate(nextM.year, nextM.month, 3),
        },
      ];

      subTasks.forEach((st, stIdx) => {
        const assignedUserId = userIds[(mIdx * subTasks.length + stIdx) % userIds.length];
        rawCandidates.push({
          boardId,
          title: st.title,
          description: st.description,
          assignedUserId,
          priority: "Medium",
          status: "Not Started",
          dueDate: st.dueDate,
        });
      });
    });
  }

  // ── Deduplication Filter ─────────────────────────────────────────────────────
  // Rule: "if a same task is already assigned to that person during the same time period,
  // then it might be manually done by a boss in that case DO NOT make the task again."
  const deduplicatedTasks = rawCandidates.filter((candidate) => {
    const isDuplicate = existingTasks.some((existing) => {
      if (existing.assignedUserId !== candidate.assignedUserId) return false;
      if (existing.dueDate !== candidate.dueDate) return false;

      const eTitle = existing.title.toLowerCase().trim();
      const cTitle = candidate.title.toLowerCase().trim();

      // Check title match or substring similarity
      return (
        eTitle === cTitle ||
        eTitle.includes(cTitle) ||
        cTitle.includes(eTitle)
      );
    });

    return !isDuplicate;
  });

  return deduplicatedTasks;
}

/**
 * Checks whether a task title belongs to a specific schedule duty.
 */
export function isTaskMatchingDuty(taskTitle: string, scheduleTaskName: string): boolean {
  const normTitle = taskTitle.toLowerCase().trim();
  const normDuty = scheduleTaskName.toLowerCase().trim();

  if (normDuty.includes("watch")) return normTitle.includes("watch thread");
  if (normDuty.includes("poll")) return normTitle.includes("item poll");
  if (normDuty.includes("activity")) return normTitle.includes("monthly activity");
  if (normDuty.includes("cvc")) return normTitle.includes("cvc");
  if (normDuty.includes("pth")) return normTitle.includes("pth");
  if (normDuty.includes("avvie") || normDuty.includes("logging") || normDuty.includes("rb")) {
    return normTitle.includes("avvie") || normTitle.includes("logging") || normTitle.includes("rb");
  }
  if (normDuty.includes("mosaic")) return normTitle.includes("mosaic");

  return normTitle.startsWith(normDuty) || normTitle.includes(normDuty);
}

/**
 * Checks whether a task dueDate falls within a schedule period (including grace period for next-month wrap-up tasks).
 */
export function isDateInPeriod(dueDate: string, period: SchedulePeriod): boolean {
  const parts = dueDate.split("-");
  if (parts.length < 2) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month)) return false;

  const startVal = period.startYear * 12 + period.startMonth;
  const endVal = period.endYear * 12 + period.endMonth;
  const currentVal = year * 12 + month;

  // Allow up to +1 month after period ends for next-month wrapup tasks (e.g. 1st/3rd drawings)
  return currentVal >= startVal && currentVal <= endVal + 1;
}

/**
 * Finds all automated duty tasks for a given schedule task and period.
 */
export function findDutyTasksForPeriod({
  scheduleTaskName,
  period,
  tasks,
}: {
  scheduleTaskName: string;
  period: SchedulePeriod;
  tasks: Task[];
}): Task[] {
  return tasks.filter((t) => {
    return isTaskMatchingDuty(t.title, scheduleTaskName) && isDateInPeriod(t.dueDate, period);
  });
}
