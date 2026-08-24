"use client";

import React, { useState, useEffect } from "react";
import { useApp, Task } from "@/lib/store";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, Clock, Calendar, ChevronRight,
  Landmark, RotateCcw, TrendingUp, Banknote, FileCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RATES: Record<string, number> = {
  Low: 100,
  Medium: 200,
  High: 350,
  Critical: 500,
};

const ROLE_COLORS: Record<string, string> = {
  Boss: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Bagman: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Consigliere: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Associate: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Custodian: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const AVATAR_COLORS = [
  "bg-blue-500/30 text-blue-300",
  "bg-violet-500/30 text-violet-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-amber-500/30 text-amber-300",
  "bg-rose-500/30 text-rose-300",
  "bg-cyan-500/30 text-cyan-300",
];

interface PaidRecord {
  paid: boolean;
  paidAt: string;
  amount: number;
  taskCount: number;
}

export default function SalaryPage() {
  const { currentUser, users, tasks, boards } = useApp();

  if (currentUser.role !== "Boss") notFound();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  });
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [payoutInput, setPayoutInput] = useState<string>("");
  const [paidRecords, setPaidRecords] = useState<Record<string, PaidRecord>>({});

  const getMonthOptions = () => {
    const options = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });
      options.push({ value: `${year}-${month}`, label });
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  };
  const monthOptions = getMonthOptions();
  const currentMonthLabel = monthOptions.find(o => o.value === selectedMonth)?.label ?? selectedMonth;

  useEffect(() => {
    const saved = localStorage.getItem("salary_payments");
    if (saved) {
      try { setPaidRecords(JSON.parse(saved)); } catch {}
    }
  }, []);

  const staffMembers = users.filter((u) => u.role !== "Boss");

  useEffect(() => {
    if (staffMembers.length > 0 && !selectedUserId) {
      setSelectedUserId(staffMembers[0].id);
    }
  }, [staffMembers, selectedUserId]);

  const selectedStaff = users.find((u) => u.id === selectedUserId) ?? staffMembers[0];

  const getUserCompletedTasks = (userId: string, monthStr: string) =>
    tasks.filter(
      (t) => t.status === "Completed" && t.assignedUserId === userId && t.dueDate?.startsWith(monthStr)
    );

  const staffCompletedTasks = selectedStaff ? getUserCompletedTasks(selectedStaff.id, selectedMonth) : [];
  const calculatedTotal = staffCompletedTasks.reduce((sum, t) => sum + (RATES[t.priority] ?? 100), 0);

  useEffect(() => { setPayoutInput(calculatedTotal.toString()); }, [calculatedTotal]);

  const paymentKey = selectedStaff ? `${selectedStaff.id}_${selectedMonth}` : "";
  const currentPayment = paidRecords[paymentKey];

  const handleMarkPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    const amount = parseFloat(payoutInput);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount."); return; }
    const newRecord: PaidRecord = { paid: true, paidAt: new Date().toLocaleString(), amount, taskCount: staffCompletedTasks.length };
    const updated = { ...paidRecords, [paymentKey]: newRecord };
    setPaidRecords(updated);
    localStorage.setItem("salary_payments", JSON.stringify(updated));
    toast.success(`Paid @${selectedStaff.username} for ${currentMonthLabel}.`);
  };

  const handleResetPayment = () => {
    if (!selectedStaff) return;
    const updated = { ...paidRecords };
    delete updated[paymentKey];
    setPaidRecords(updated);
    localStorage.setItem("salary_payments", JSON.stringify(updated));
    toast.info(`Reset payout for @${selectedStaff.username}.`);
  };

  // Total unpaid staff this month
  const unpaidCount = staffMembers.filter(s => !paidRecords[`${s.id}_${selectedMonth}`]?.paid).length;
  const totalPaidThisMonth = staffMembers.reduce((sum, s) => {
    const r = paidRecords[`${s.id}_${selectedMonth}`];
    return sum + (r?.paid ? r.amount : 0);
  }, 0);

  const getPriorityColor = (p: Task["priority"]) => {
    switch (p) {
      case "Critical": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "High":     return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "Medium":   return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Low":      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review who did what, and cut the cheques.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-1.5 rounded-full flex-shrink-0">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
            <SelectTrigger className="w-[160px] border-none shadow-none h-auto p-0 text-sm font-semibold focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Month Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-border/30 bg-card/40 p-4 flex flex-col justify-between gap-2">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-primary/60" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground pl-2">Total Staff</span>
          <div className="pl-2">
            <div className="text-4xl font-black tabular-nums leading-none">{staffMembers.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">people on payroll</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/30 bg-card/40 p-4 flex flex-col justify-between gap-2">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-emerald-500/60" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground pl-2">Paid Out</span>
          <div className="pl-2">
            <div className="text-4xl font-black tabular-nums leading-none text-emerald-400">${totalPaidThisMonth.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground mt-1">disbursed in {currentMonthLabel}</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/30 bg-card/40 p-4 flex flex-col justify-between gap-2">
          <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", unpaidCount > 0 ? "bg-amber-500/60" : "bg-emerald-500/60")} />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground pl-2">Awaiting</span>
          <div className="pl-2">
            <div className={cn("text-4xl font-black tabular-nums leading-none", unpaidCount > 0 ? "text-amber-400" : "text-emerald-400")}>{unpaidCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{unpaidCount === 1 ? "person still unpaid" : unpaidCount === 0 ? "everyone's paid up" : "people still unpaid"}</p>
          </div>
        </div>
      </div>

      {staffMembers.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/30 p-12 text-center text-muted-foreground text-sm">
          No staff registered yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">

          {/* Staff Roster */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Staff</p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
              {staffMembers.map((staff, i) => {
                const compTasks = getUserCompletedTasks(staff.id, selectedMonth);
                const earned = compTasks.reduce((s, t) => s + (RATES[t.priority] ?? 100), 0);
                const isPaid = paidRecords[`${staff.id}_${selectedMonth}`]?.paid;
                const isSelected = selectedStaff?.id === staff.id;
                const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const initials = staff.username.slice(0, 2).toUpperCase();

                return (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedUserId(staff.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center gap-3",
                      isSelected
                        ? "bg-card/80 border-border/60 shadow-sm"
                        : "bg-card/30 border-border/30 hover:bg-card/50 hover:border-border/50"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0", avatarColor)}>
                      {initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-sm truncate">@{staff.username}</span>
                        <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 border shrink-0", ROLE_COLORS[staff.role] ?? "")}>
                          {staff.role}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {compTasks.length} task{compTasks.length !== 1 ? "s" : ""} · <span className="text-foreground/70 font-medium">${earned}</span> earned
                      </div>
                    </div>
                    {/* Status */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isPaid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500/70" />
                      )}
                      <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform", isSelected && "translate-x-0.5 text-primary")} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel */}
          {selectedStaff && (
            <div className="space-y-5 md:col-span-2">

              {/* Person header */}
              <div className="flex items-center gap-3 pb-1 border-b border-border/30">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black", AVATAR_COLORS[staffMembers.findIndex(s => s.id === selectedStaff.id) % AVATAR_COLORS.length])}>
                  {selectedStaff.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-base">@{selectedStaff.username}</h2>
                  <p className="text-xs text-muted-foreground">{selectedStaff.role} · {currentMonthLabel}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-black text-primary">${calculatedTotal.toLocaleString()}</div>
                  <p className="text-[11px] text-muted-foreground">suggested payout</p>
                </div>
              </div>

              {/* Task audit table */}
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Completed Tasks</p>
                    <p className="text-[11px] text-muted-foreground">work done this period that counts toward pay</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-xs">{staffCompletedTasks.length}</Badge>
                </div>
                {staffCompletedTasks.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <FileCheck className="h-7 w-7 opacity-40" />
                    <p className="text-sm">No completed tasks for this period.</p>
                    <p className="text-xs opacity-60">Tasks completed with a due date in {currentMonthLabel} show up here.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-5 py-3">Task</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {staffCompletedTasks.map((task) => {
                        const rate = RATES[task.priority] ?? 100;
                        const board = boards.find(b => b.id === task.boardId);
                        return (
                          <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-foreground truncate max-w-[220px]">{task.title}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{board?.name ?? "Unknown Board"}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge className={cn("text-[9px] px-2 py-0.5 rounded-full border", getPriorityColor(task.priority))}>
                                {task.priority}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{task.dueDate}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-primary">${rate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-border/40 bg-muted/10">
                      <tr>
                        <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-muted-foreground">Total</td>
                        <td className="px-4 py-3 text-right font-black text-primary text-base">${calculatedTotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Payout action */}
              <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Issue Payment</p>
                </div>

                {currentPayment?.paid ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm text-emerald-400">Paid — ${currentPayment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{currentPayment.taskCount} tasks · logged {currentPayment.paidAt}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetPayment}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 text-xs rounded-full"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Undo Payment
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMarkPaid} className="p-5 space-y-4">
                    {staffCompletedTasks.length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        No completed tasks this period — are you sure you want to pay?
                      </div>
                    )}
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label htmlFor="payout-amount" className="text-xs font-medium text-muted-foreground">
                          Amount to pay ($)
                        </label>
                        <Input
                          id="payout-amount"
                          type="number"
                          value={payoutInput}
                          onChange={(e) => setPayoutInput(e.target.value)}
                          placeholder="e.g. 1200"
                          required
                          className="bg-background/50 border-border/40 h-10 font-bold text-sm"
                        />
                      </div>
                      <Button type="submit" className="h-10 px-5 gap-2 font-semibold shrink-0">
                        <Landmark className="h-4 w-4" />
                        Mark Paid
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Payout is stored locally. Amount can be adjusted from the suggested total.
                    </p>
                  </form>
                )}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}