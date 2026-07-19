"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApp } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, DollarSign, Calendar, Search, Plus, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Separator } from "@base-ui/react";

// Update schema to handle an array of entries
const submissionSchema = z.object({
  activity: z.string().min(1, "Please select an activity."),
  date: z.string().min(1, "Please select a date."),
  notes: z.string().optional(),
  entries: z.array(
    z.object({
      username: z.string().optional(),
      amount: z.number().min(0, "Must be positive"),
    }),
  ),
});

type FormValues = z.infer<typeof submissionSchema>;

export default function BlackChipsPage() {
  const { currentUser, users, submissions, addSubmission } = useApp();
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [newRowsCount, setNewRowsCount] = useState<number>(1);
  const [bulkAmount, setBulkAmount] = useState<number>(1);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  const handleBulkAmountChange = (valStr: string) => {
    const val = parseInt(valStr);
    const parsedVal = isNaN(val) ? 0 : val;
    setBulkAmount(parsedVal);

    const entries = form.getValues("entries");
    const updatedEntries = entries.map((entry) => ({
      ...entry,
      amount: parsedVal,
    }));
    form.setValue("entries", updatedEntries, { shouldValidate: true });
  };

  // Initialize with 5 default entries
  const form = useForm<FormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      activity: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      entries: Array(5).fill({ username: "", amount: 1 }),
    },
  });

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxH6jPDLL2RGHY7rFO0fakEKagHyDbym20Wym_l33ELhKY86r5kUgehsJz1Z7aSzsT82g/exec";

  const ACTIVITIES = [
    "Activity",
    "Item Poll",
    "Celebration Conundrum",
    "Gangdom's Gifts",
    "Roleplay",
    "Mafia Hosting",
    "Mafia Playing",
    "Avatar Check In",
    "Avatar Creation",
    "PSD Creation",
    "PTH Incentive",
    "RE Chips",
  ];

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const validEntries = values.entries.filter(
        (entry): entry is { username: string; amount: number } =>
          !!entry.username && entry.username.trim() !== ""
      );

      if (validEntries.length === 0) {
        toast.error("Please enter at least one username.");
        return;
      }

      // Extract month name based on the selected date
      const dateObj = new Date(values.date);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[dateObj.getMonth()];

      // Submit all valid entries to the spreadsheet
      const submissionPromises = validEntries.map(async (entry) => {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            name: entry.username,
            activity: values.activity,
            tickets: entry.amount,
            date: values.date,
            month: monthName,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(
            result.message || `Failed to submit for ${entry.username}`
          );
        }

        // Save to local store
        const notesJson = JSON.stringify({
          activity: values.activity,
          date: values.date,
          notes: values.notes || "",
        });
        await addSubmission(entry.username, entry.amount, notesJson);
      });

      await Promise.all(submissionPromises);

      // Play success animation
      setShowSuccessAnim(true);
      const totalSubmitted = validEntries.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );
      toast.success(
        `Submitted $${totalSubmitted.toLocaleString()} successfully across ${validEntries.length} entries.`
      );

      // Reset form back to 5 default rows
      form.reset({
        activity: "",
        notes: "",
        date: values.date, // preserve the selected date for next entries
        entries: Array(5).fill({ username: "", amount: bulkAmount }),
      });

      setTimeout(() => {
        setShowSuccessAnim(false);
      }, 2500);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Submission failed."
      );
    }
  };

  const handleAddRows = () => {
    const rowsToAdd = Array(newRowsCount).fill({ username: "", amount: bulkAmount });
    append(rowsToAdd);
  };

  // Helper to parse notes JSON
  const parseNotes = (notesStr: string | null | undefined) => {
    if (!notesStr) return { activity: "", date: "", notes: "" };
    if (notesStr.startsWith("{")) {
      try {
        const parsed = JSON.parse(notesStr);
        return {
          activity: parsed.activity || "",
          date: parsed.date || "",
          notes: parsed.notes || "",
        };
      } catch (e) {
        // Fallback
      }
    }
    return { activity: "", date: "", notes: notesStr };
  };

  // Filter submissions by query (for search mode)
  const filteredSubmissions = React.useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return submissions;
    
    return submissions.filter((sub) => {
      const parsed = parseNotes(sub.notes);
      return (
        sub.username.toLowerCase().includes(q) ||
        parsed.activity.toLowerCase().includes(q) ||
        parsed.notes.toLowerCase().includes(q)
      );
    });
  }, [submissions, filterQuery]);

  interface GroupedBatch {
    id: string;
    activity: string;
    date: string;
    notes: string;
    timestamp: string;
    items: {
      id: string;
      username: string;
      amount: number;
    }[];
  }

  // Group submissions into batches
  const groupedBatches = React.useMemo(() => {
    const batchesList: GroupedBatch[] = [];
    
    // Sort submissions by timestamp descending first
    const sortedSubmissions = [...submissions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedSubmissions.forEach((sub) => {
      const parsed = parseNotes(sub.notes);
      const activity = parsed.activity || "Legacy Log";
      const date = parsed.date || new Date(sub.timestamp).toISOString().split("T")[0];
      const notesText = parsed.notes || "";
      
      const subTime = new Date(sub.timestamp).getTime();
      
      // Find a matching batch in the existing list
      const matchingBatch = batchesList.find((batch) => {
        // Group criteria: same activity, date, notes, and timestamp within 15 seconds
        const batchTime = new Date(batch.timestamp).getTime();
        const isTimeClose = Math.abs(subTime - batchTime) < 15000;
        return (
          isTimeClose &&
          batch.activity === activity &&
          batch.date === date &&
          batch.notes === notesText
        );
      });

      if (matchingBatch) {
        matchingBatch.items.push({
          id: sub.id,
          username: sub.username,
          amount: sub.amount,
        });
      } else {
        batchesList.push({
          id: `batch-${sub.id}`,
          activity,
          date,
          notes: notesText,
          timestamp: sub.timestamp,
          items: [{
            id: sub.id,
            username: sub.username,
            amount: sub.amount,
          }],
        });
      }
    });

    return batchesList;
  }, [submissions]);

  const totalAmount = submissions.reduce((sum, curr) => sum + curr.amount, 0);

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Black Chips Auto Logging
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          In this page, you can log black chips automatically without having to
          interact with the spreadsheet directly. The data will be synced in
          real-time to the reporting sheets. If you cannot see your results
          after submission, please contact Ri to check whether the data has been
          synced correctly.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Entry Form */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Log Black Chips</CardTitle>
            <CardDescription>
              Submit chip details. Data is auto-logged and synced with the
              reporting sheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Dynamic Fields List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                      <FormField control={form.control}
                        name="activity"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 w-fit">
                            <FormLabel>Activity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select activity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ACTIVITIES.map((activity) => (
                                  <SelectItem key={activity} value={activity}>
                                    {activity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="bulkAmount" className="text-xs text-muted-foreground">Bulk Adjust Chips</Label>
                      <Input
                        id="bulkAmount"
                        type="number"
                        min="1"
                        value={bulkAmount === 0 ? "" : bulkAmount}
                        onChange={(e) => handleBulkAmountChange(e.target.value)}
                        className="w-27"
                      />
                    </div>

                  </div>
                  <FormField control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 w-fit">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="mb-3 ms-4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-start">
                      <div className="w-15">
                        {index === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            Sr. No
                          </Label>
                        )}
                        <Input className="my-1 text-center" disabled value={index + 1} />
                      </div>

                      <FormField
                        control={form.control}
                        name={`entries.${index}.username`}
                        render={({ field: formField }) => (
                          <FormItem className="flex-1">
                            {index === 0 && (
                              <FormLabel className="text-xs text-muted-foreground space-x-10">
                                Usernames
                              </FormLabel>
                            )}
                            <FormControl>
                              <Input
                                placeholder="Enter username..."
                                className="my-1"
                                {...formField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`entries.${index}.amount`}
                        render={({ field: formField }) => (
                          <FormItem className="w-28">
                            {index === 0 && <FormLabel className="text-xs text-muted-foreground">Chips</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                className="my-1"
                                {...formField}
                                onChange={(e) =>
                                  formField.onChange(
                                    e.target.valueAsNumber || 0,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {/* Row Addition Control */}
                <div className="flex items-end gap-3 pt-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="newRowsCount"
                      className="text-xs text-muted-foreground"
                    >
                      Add Rows
                    </Label>
                    <Input
                      id="newRowsCount"
                      type="number"
                      min="1"
                      value={newRowsCount}
                      onChange={(e) =>
                        setNewRowsCount(parseInt(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRows}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Fields
                  </Button>
                </div>

                <div className="pt-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Optional Notes (Applies to all)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="If there are any other notes to add, add them here. Otherwise leave it empty."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full rounded-full mt-2">
                  Submit Collection
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Dashboard entries list */}
        <Card className="md:col-span-3 col-span-4">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>List of recently logged chips.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-[9px] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, activity, or notes..."
                className="pl-9 bg-muted/30 border-none text-sm placeholder:text-muted-foreground focus-visible:ring-offset-0"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            {filterQuery.trim() !== "" ? (
              /* Search View: Ungrouped List */
              <div className="divide-y max-h-[450px] overflow-y-auto space-y-1 pr-1">
                {filteredSubmissions.map((sub) => {
                  const parsed = parseNotes(sub.notes);
                  return (
                    <div
                      key={sub.id}
                      className="py-2.5 flex items-center justify-between hover:bg-muted/10 transition-colors px-2 rounded-md"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm">@{sub.username}</div>
                        {parsed.activity && (
                          <div className="text-[10px] text-primary font-medium">
                            {parsed.activity}
                          </div>
                        )}
                        {parsed.notes && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {parsed.notes}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {parsed.date ? parsed.date : new Date(sub.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="font-bold text-foreground text-sm">
                        {sub.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                {filteredSubmissions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No submissions found matching your search.
                  </div>
                )}
              </div>
            ) : (
              /* Normal View: Grouped Accordions */
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {groupedBatches.map((batch) => {
                  const isExpanded = !!expandedBatches[batch.id];
                  const totalChips = batch.items.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <Card key={batch.id} className="border border-border/60 overflow-hidden transition-all duration-200 shadow-sm mx-1 my-3">
                      <button
                        type="button"
                        onClick={() => toggleBatch(batch.id)}
                        className="w-full px-3.5 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{batch.activity}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{batch.date}</span>
                          </div>
                          {batch.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                              "{batch.notes}"
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground leading-none">
                            {batch.items.length} {batch.items.length === 1 ? "entry" : "entries"} • {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-sm text-primary">
                            +{totalChips.toLocaleString()}
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="px-4 pt-1 border-t border-border/40 bg-muted/5">
                              <div className="overflow-hidden rounded-lg border border-border/40 my-2">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border/40">
                                    <tr>
                                      <th className="px-3 py-2">Username</th>
                                      <th className="px-3 py-2 text-right">Chips</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {batch.items.map((item) => (
                                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-3 py-1.5 font-medium text-foreground">
                                          @{item.username}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-semibold text-foreground">
                                          {item.amount.toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
                {groupedBatches.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No submissions found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-card border p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4"
            >
              <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-1">Submission Successful</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Data was processed and successfully synchronized with the
                spreadsheet.
              </p>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-full bg-primary"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
