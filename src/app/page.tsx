"use client";

import { useApp } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import React from "react";

function formatTimeAgo(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Dashboard() {
  const { currentUser, users, tasks, submissions, logs } = useApp();

  // Dynamic statistics
  const totalRevenue = submissions.reduce((sum, curr) => sum + curr.amount, 0);
  const activeTasksCount = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled"
  ).length;
  const activeStaffCount = users.length;
  const criticalIssuesCount = tasks.filter(
    (t) => t.priority === "Critical" && t.status !== "Completed" && t.status !== "Cancelled"
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser.username}. Here&apos;s your daily overview.
        </p>
      </div>

      {/* Quick Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total logs synced with sheets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasksCount}</div>
            <p className="text-xs text-muted-foreground">Currently in progress or pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaffCount}</div>
            <p className="text-xs text-muted-foreground">Registered staff accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Issues
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalIssuesCount}</div>
            <p className="text-xs text-muted-foreground">
              Urgent tasks requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions recorded on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity logged yet.
                </p>
              ) : (
                logs
                  .filter((log) => {
                    if (currentUser.role !== "Boss" && log.action.toLowerCase().includes("switched active profile")) {
                      return false;
                    }
                    return true;
                  })
                  .slice(0, 5)
                  .map((log) => {
                    const userObj = users.find((u) => u.username === log.username);
                  const role = userObj ? userObj.role : "Associate";
                  return (
                    <div key={log.id} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          @{log.username}{" "}
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px] uppercase font-normal"
                          >
                            {role}
                          </Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.action}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(log.timestamp)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
