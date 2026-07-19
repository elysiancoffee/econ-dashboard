"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, User, Eye, ChevronLeft, ChevronRight } from "lucide-react";

export default function LogsPage() {
  const { logs, users, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterUser]);

  const filteredLogs = logs.filter((log) => {
    if (currentUser.role !== "Boss" && log.action.toLowerCase().includes("switched active profile")) {
      return false;
    }
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === "all" || log.username === filterUser;
    return matchesSearch && matchesUser;
  });

  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
        <p className="text-muted-foreground mt-1">Audit timeline recording all administrative and staff actions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Audit</CardTitle>
          <CardDescription>
            Filter system activities by action descriptions or target usernames.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-none"
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={filterUser} onValueChange={(val) => setFilterUser(val || "all")}>
                <SelectTrigger className="rounded-lg bg-muted/30 border-none">
                  <SelectValue placeholder="Filter by User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.username}>
                      @{u.username} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative border-l border-border pl-6 ml-3 space-y-6 pt-4">
            {paginatedLogs.map((log) => (
              <div key={log.id} className="relative">
                {/* Node icon indicators */}
                <div className="absolute -left-[31px] top-0 bg-background border rounded-full p-1 text-muted-foreground shadow-sm">
                  <Eye className="h-3 w-3" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {log.action}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="h-3.5 w-3.5" />
                      @{log.username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
                No logs matching the search criteria were found.
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 md:order-1">
                <span>Show</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[75px] h-8 bg-muted/20 border-none font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="ps-3 py-1.5">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>entries per page</span>
              </div>

              <div className="text-xs font-medium text-muted-foreground order-1 md:order-2">
                Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
              </div>

              <div className="flex items-center gap-2 order-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  className="h-8 gap-1.5 rounded-lg border-muted-foreground/10 hover:bg-muted/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - activePage) <= 1
                      );
                    })
                    .map((page, index, arr) => {
                      const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="px-1 text-muted-foreground text-sm">...</span>
                          )}
                          <Button
                            variant={activePage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 p-0 rounded-lg font-medium text-xs ${
                              activePage === page 
                                ? "shadow-sm" 
                                : "border-muted-foreground/10 hover:bg-muted/30"
                            }`}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  className="h-8 gap-1.5 rounded-lg border-muted-foreground/10 hover:bg-muted/30"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
