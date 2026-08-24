"use client";
import React, { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">Find templates of the posts here and auto code them.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-3">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Item Poll</CardTitle>
            <CardDescription>This is the template of creation of the item poll results posts that are posted on 1st and 15th of the month.</CardDescription>
            <div className="flex gap-2 mt-2">
              <Link href="/templates/ip-n">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>New Round</span>
                </Button>
              </Link>
              <Link href="/templates/ip-r">
                <Button variant="outline" className="flex items-center gap-2">
                  <NotebookPen className="w-4 h-4" />
                  <span>Results Post</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>This is the template of creation of the monthly activity posts that are posted on 1st of every month.</CardDescription>
            <div className="flex gap-2 mt-2">
              <Link href="/templates/ma-n">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>New Post</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle>The Mosaic</CardTitle>
            <CardDescription>This is the template of creation of The Mosaic posts that are posted on 1st of every month.</CardDescription>
            <div className="flex gap-2 mt-2 align-end">
              <Link href="/templates/tm-p">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>New Post</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card className="p-4">
          <CardHeader>
            <CardTitle>Watch Thread</CardTitle>
            <CardDescription>This is the template of creation of the watch thread posts that are posted on 1st and 16th of every month.</CardDescription>
            <div className="flex gap-2 mt-2 align-end">
              <Link href="/templates/wt-p">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>New Post</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}