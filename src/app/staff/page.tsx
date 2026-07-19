"use client"; 

import React, { useState, useEffect } from "react";
import { useApp, User, Task } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertTriangle, Activity } from "lucide-react";

export default function StaffPage() {
  const { currentUser, users, tasks, logs } = useApp();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentUser.username);

  // If currentUser is not Boss/Consigliere, force them to view only themselves
  const isManagement = currentUser.role === "Boss" || currentUser.role === "Consigliere";
  
  useEffect(() => {
    if (!isManagement) {
      setSelectedStaffId(currentUser.id);
    }
  }, [currentUser, isManagement]);

  const selectedStaff = users.find((u) => u.id === selectedStaffId) || currentUser;

  // Filter tasks assigned to this staff member
  const staffTasks = tasks.filter((t) => t.assignedUserId === selectedStaff.id);
  
  // Calculate statistics
  const totalTasks = staffTasks.length;
  const completedTasks = staffTasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = staffTasks.filter((t) => t.status === "In Progress" || t.status === "Not Started").length;
  const waitingTasks = staffTasks.filter((t) => t.status === "Waiting").length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter logs related to this staff member (Bosses can see switching profile logs, Consigliere and others cannot)
  const staffLogs = logs.filter((log) => {
    if (currentUser.role !== "Boss" && log.action.toLowerCase().includes("switched active profile")) {
      return false;
    }
    return log.username === selectedStaff.username;
  });

  const getPriorityColor = (p: Task["priority"]) => {
    switch (p) {
      case "Critical": return "bg-red-500 text-white";
      case "High": return "bg-orange-500 text-white";
      case "Medium": return "bg-blue-500 text-white";
      case "Low": return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff View</h1>
          <p className="text-muted-foreground mt-1">
            {isManagement 
              ? "Monitor task assignment and productivity across the organization." 
              : "Review your personal tasks and performance metrics."}
          </p>
        </div>

        {isManagement && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Viewing:</span>
            <Select value={selectedStaffId} onValueChange={(val) => setSelectedStaffId(val || currentUser.id)}>
              <SelectTrigger className="w-[200px] rounded-full">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    @{u.username} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Staff Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Total workload</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Archived successfully</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Awaiting execution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Assigned Tasks */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Assigned Tasks Queue</CardTitle>
            <CardDescription>
              All active and historical tasks assigned to @{selectedStaff.username}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[450px] overflow-y-auto">
              {staffTasks.map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">{task.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{task.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {staffTasks.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No tasks currently assigned to @{selectedStaff.username}.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Specific Activity Logs */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Actions recorded for @{selectedStaff.username}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[450px] overflow-y-auto">
              {staffLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-1 text-sm">
                  <div className="text-muted-foreground">{log.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {staffLogs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No log entries found for this user.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
