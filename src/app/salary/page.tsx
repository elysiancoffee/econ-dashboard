"use client";

import React, { useState, useEffect } from "react";
import { useApp, Task, User } from "@/lib/store";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, CheckCircle2, Clock, Calendar, ShieldAlert,
  ArrowRight, Search, Landmark, ChevronRight, UserCheck, Receipt, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Payout rates based on task priority
const RATES = {
  Low: 100,
  Medium: 200,
  High: 350,
  Critical: 500,
};

interface PaidRecord {
  paid: boolean;
  paidAt: string;
  amount: number;
  taskCount: number;
}

export default function SalaryPage() {
  const { currentUser, users, tasks, boards } = useApp();

  // If not Boss, immediately serve the Next.js 404 page
  if (currentUser.role !== "Boss") {
    notFound();
  }

  // State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [payoutInput, setPayoutInput] = useState<string>("");
  const [paidRecords, setPaidRecords] = useState<Record<string, PaidRecord>>({});

  // Generate a list of selectable months (past 6 months)
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

  // Load payment records from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("salary_payments");
    if (saved) {
      try {
        setPaidRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse salary payments", e);
      }
    }
  }, []);

  // Filter out Bosses from the audit list
  const staffMembers = users.filter((u) => u.role !== "Boss");

  // Set default selected user
  useEffect(() => {
    if (staffMembers.length > 0 && !selectedUserId) {
      setSelectedUserId(staffMembers[0].id);
    }
  }, [staffMembers, selectedUserId]);

  const selectedStaff = users.find((u) => u.id === selectedUserId) || staffMembers[0];

  // Helper to filter completed tasks for a user in a specific month
  const getUserCompletedTasks = (userId: string, monthStr: string) => {
    return tasks.filter((task) => {
      // Must be completed
      if (task.status !== "Completed") return false;
      // Must be assigned to this user
      if (task.assignedUserId !== userId) return false;
      // Must match monthStr (YYYY-MM) in its dueDate
      if (!task.dueDate || !task.dueDate.startsWith(monthStr)) return false;
      return true;
    });
  };

  // Calculate payment totals for selected staff
  const staffCompletedTasks = selectedStaff ? getUserCompletedTasks(selectedStaff.id, selectedMonth) : [];
  
  const calculatedRecommendedTotal = staffCompletedTasks.reduce((sum, task) => {
    const rate = RATES[task.priority] || 100;
    return sum + rate;
  }, 0);

  // Sync payout input box when recommended total changes
  useEffect(() => {
    setPayoutInput(calculatedRecommendedTotal.toString());
  }, [calculatedRecommendedTotal]);

  // Handle marking paid
  const handleMarkPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    
    const amount = parseFloat(payoutInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid payout amount.");
      return;
    }

    const key = `${selectedStaff.id}_${selectedMonth}`;
    const newRecord: PaidRecord = {
      paid: true,
      paidAt: new Date().toLocaleString(),
      amount,
      taskCount: staffCompletedTasks.length,
    };

    const updated = { ...paidRecords, [key]: newRecord };
    setPaidRecords(updated);
    localStorage.setItem("salary_payments", JSON.stringify(updated));
    toast.success(`Marked July salary as paid for @${selectedStaff.username}.`);
  };

  // Handle resetting payment status
  const handleResetPayment = () => {
    if (!selectedStaff) return;
    const key = `${selectedStaff.id}_${selectedMonth}`;
    const updated = { ...paidRecords };
    delete updated[key];
    setPaidRecords(updated);
    localStorage.setItem("salary_payments", JSON.stringify(updated));
    toast.info(`Reset payout status for @${selectedStaff.username}.`);
  };

  const getPriorityColor = (p: Task["priority"]) => {
    switch (p) {
      case "Critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "High": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Medium": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Low": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/40 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" />
            Salary & Performance Portal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1">
            <UserCheck className="h-4 w-4 text-emerald-500" />
            Audit finished deliverables and issue payroll disbursements.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-1.5 rounded-full flex-shrink-0 shadow-xs">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Select Month:</span>
          <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Layout Grid */}
      {staffMembers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No staff members registered in the organization.
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Left Column: Staff Directory */}
          <div className="space-y-4 md:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Staff Members
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {staffMembers.map((staff) => {
                const compTasks = getUserCompletedTasks(staff.id, selectedMonth);
                const paymentKey = `${staff.id}_${selectedMonth}`;
                const paymentRecord = paidRecords[paymentKey];
                const isSelected = selectedStaff?.id === staff.id;

                return (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedUserId(staff.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between",
                      isSelected 
                        ? "bg-primary/10 border-primary shadow-xs" 
                        : "bg-card/40 border-border/40 hover:bg-card/60 hover:border-border/60"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        @{staff.username}
                        <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0.1 font-normal bg-muted">
                          {staff.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {compTasks.length} Completed Tasks
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {paymentRecord?.paid ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] rounded-full">
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] rounded-full">
                          Pending
                        </Badge>
                      )}
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isSelected && "translate-x-1 text-primary")} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: User Performance Audit & Payroll Form */}
          {selectedStaff && (
            <div className="space-y-6 md:col-span-2">
              
              {/* Stats Card */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-card/40 border-border/40 backdrop-blur-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month's Deliverables</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="text-2xl font-bold">{staffCompletedTasks.length} Tasks</div>
                      <p className="text-xs text-muted-foreground">Resolved in {monthOptions.find(o => o.value === selectedMonth)?.label}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/40 backdrop-blur-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Payout</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Landmark className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <div className="text-2xl font-bold">${calculatedRecommendedTotal.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Task weight calculator</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task Deliverables Table */}
              <Card className="bg-card/60 border-border/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base">Audit Log: @{selectedStaff.username}</CardTitle>
                  <CardDescription>
                    All tasks assigned to @{selectedStaff.username} completed with deadline matching {selectedMonth}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {staffCompletedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center">
                      No tasks found completed under selected month.
                    </p>
                  ) : (
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted/30 border-b border-border/40 text-[10px] uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3">Task Title</th>
                          <th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3">Completed On</th>
                          <th className="px-4 py-3 text-right">Value Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {staffCompletedTasks.map((task) => {
                          const rate = RATES[task.priority] || 100;
                          const board = boards.find(b => b.id === task.boardId);
                          return (
                            <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-5 py-4 max-w-[200px] truncate font-medium text-foreground">
                                <div>{task.title}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{board?.name || "Unknown Board"}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <Badge className={cn("px-2 py-0.5 text-[9px] rounded-full border", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">
                                {task.dueDate}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right font-semibold text-primary">
                                ${rate}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Payout Action Card */}
              <Card className="bg-card/40 border-border/40 shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Disbursement Registry</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {paidRecords[`${selectedStaff.id}_${selectedMonth}`]?.paid ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-emerald-500">Salary Processed Successfully</p>
                          <p className="text-muted-foreground">
                            Disbursed: <strong className="text-foreground">${paidRecords[`${selectedStaff.id}_${selectedMonth}`].amount}</strong>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Logged: {paidRecords[`${selectedStaff.id}_${selectedMonth}`].paidAt}
                          </p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleResetPayment}
                        className="rounded-full gap-1.5 h-8 border-destructive/20 text-destructive hover:bg-destructive/10"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset Payout Status
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleMarkPaid} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="payout-amount" className="text-xs font-medium text-muted-foreground">Payout Amount ($)</Label>
                          <Input
                            id="payout-amount"
                            type="number"
                            value={payoutInput}
                            onChange={(e) => setPayoutInput(e.target.value)}
                            placeholder="e.g. 1200"
                            required
                            className="bg-background/50 border-border/40 h-10 rounded-lg text-sm font-bold"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <Button 
                            type="submit" 
                            className="w-full rounded-lg h-10 gap-1.5 font-semibold text-sm cursor-pointer"
                          >
                            <Landmark className="h-4.5 w-4.5" /> Process Disbursement
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Note: Processing salary records the payout persistently. Data is kept in client archives for late audits.
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

        </div>
      )}

    </div>
  );
}