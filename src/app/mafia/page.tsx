"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Swords,
  Plus,
  Trash2,
  Play,
  Sun,
  Moon,
  Users,
  Shield,
  Clock,
  Archive,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import {
  fetchAllMafiaGames,
  createMafiaGame,
  deleteMafiaGame,
  updateMafiaGame,
} from "@/lib/mafia-actions";

export default function MafiaDashboard() {
  const { currentUser } = useApp();
  const isBoss = currentUser?.role === "Boss";
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "setup" | "finished">("all");

  // New Game Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartingPhase, setNewStartingPhase] = useState<"Night" | "Day">("Night");
  const [newStartingPhaseNumber, setNewStartingPhaseNumber] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Load games on mount
  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await fetchAllMafiaGames();
      setGames(data);
    } catch (err) {
      console.error("Failed to load mafia games:", err);
      toast.error("Could not load mafia games.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a game title.");
      return;
    }

    try {
      setIsCreating(true);
      const gameId = await createMafiaGame(
        newTitle,
        newDescription,
        currentUser?.username || "Host",
        newStartingPhase,
        newStartingPhaseNumber
      );
      toast.success(`Mafia game created! Starting at ${newStartingPhase} ${newStartingPhaseNumber}`);
      setShowCreateDialog(false);
      setNewTitle("");
      setNewDescription("");
      setNewStartingPhase("Night");
      setNewStartingPhaseNumber(1);
      await loadGames();
    } catch (err) {
      console.error("Create game error:", err);
      toast.error("Failed to create game.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGame = async (gameId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteMafiaGame(gameId);
      toast.info(`Deleted "${title}"`);
      await loadGames();
    } catch (err) {
      console.error("Delete game error:", err);
      toast.error("Failed to delete game.");
    }
  };

  const handleStatusChange = async (gameId: string, status: string) => {
    try {
      await updateMafiaGame(gameId, { status });
      toast.success(`Updated status to ${status}`);
      await loadGames();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status.");
    }
  };

  const filteredGames = games.filter((g) => {
    if (activeTab === "all") return true;
    return g.status === activeTab;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* <div className="h-9 w-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center font-bold">
              <Swords className="h-5 w-5" />
            </div> */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mafia Games Directory</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {games.length} {games.length === 1 ? "Game" : "Games"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Here we can host and manage multiple simultaneous Mafia games with live player rosters, role distributions, night actions, day votes etc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGames}
            className="gap-1.5"
            title="Refresh games list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Mafia Game
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All Games ({games.length})
        </button>
        <button
          onClick={() => setActiveTab("in_progress")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "in_progress"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          In Progress ({games.filter((g) => g.status === "in_progress").length})
        </button>
        <button
          onClick={() => setActiveTab("setup")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "setup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Signups / Setup ({games.filter((g) => g.status === "setup").length})
        </button>
        <button
          onClick={() => setActiveTab("finished")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "finished"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Finished ({games.filter((g) => g.status === "finished").length})
        </button>
      </div>

      {/* Games Cards Grid */}
      {loading && games.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-sm">Loading Mafia games...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border rounded-xl bg-card/40 p-8">
          <Swords className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <h3 className="text-base font-semibold text-foreground">No Mafia games found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab !== "all"
                ? `No games currently in ${activeTab.replace("_", " ")} status.`
                : "Create your first game to manage rosters, factions, night kills, and day lynches."}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="mt-2 gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4" /> Create First Game
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map((game) => {
            const isDay = game.currentPhase === "Day";
            const phaseBadgeColor =
              game.status === "finished"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : game.status === "setup"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : isDay
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

            return (
              <Card
                key={game.id}
                className="group relative overflow-hidden border-border/80 hover:border-border hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`font-mono text-[11px] ${phaseBadgeColor} flex items-center gap-1`}>
                          {game.status === "setup" ? (
                            "Setup / Signups"
                          ) : game.status === "finished" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Finished
                            </>
                          ) : isDay ? (
                            <>
                              <Sun className="h-3 w-3 text-amber-400" /> Day {game.phaseNumber}
                            </>
                          ) : (
                            <>
                              <Moon className="h-3 w-3 text-indigo-400" /> Night {game.phaseNumber}
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-red-400 transition-colors">
                        {game.title}
                      </CardTitle>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-muted-foreground")}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => { window.location.href = `/mafia/${game.id}`; }}>
                          <Play className="h-4 w-4 mr-2" /> Open Control Room
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(game.id, "setup")}>
                          Set to Setup / Signups
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(game.id, "in_progress")}>
                          Set to In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(game.id, "finished")}>
                          Mark as Finished
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteGame(game.id, game.title)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Game
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardDescription className="text-xs line-clamp-2 mt-2 text-muted-foreground min-h-[32px]">
                    {game.description || "No game description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-5 py-2">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border">
                    <div className="flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      <span className="truncate">Host: {game.createdBy || "Boss"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      <span className="truncate">
                        {new Date(game.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-3 border-t bg-muted/10 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {game.id.replace("mg-", "")}
                  </span>

                  <Link
                    href={`/mafia/${game.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "h-8 gap-1 text-xs bg-primary text-primary-foreground shadow-sm")}
                  >
                    Open Game <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create New Game Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateGame}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-red-500" />
                <DialogTitle>Create New Mafia Game</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Initialize a new game workspace. Default factions (Town, Mafia, Neutral) and staple roles (Cop, Doctor, Godfather, Roleblocker, etc.) will be pre-configured for you.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Game Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Mafia #42: Midnight Omertà"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Description / Theme / Flavour (Optional)
                </label>
                <Input
                  placeholder="e.g. 15 Players, Semi-Closed Setup, 24/24 Phase Deadlines"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Starting Phase</label>
                  <Select value={newStartingPhase} onValueChange={(val: any) => setNewStartingPhase(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Night">🌙 Starts at Night</SelectItem>
                      <SelectItem value="Day">☀️ Starts at Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Phase Number</label>
                  <Select value={String(newStartingPhaseNumber)} onValueChange={(val) => setNewStartingPhaseNumber(parseInt(val || "1", 10) || 1)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Phase 1 (Standard)</SelectItem>
                      <SelectItem value="0">Phase 0 (Confirmation)</SelectItem>
                      <SelectItem value="2">Phase 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !newTitle.trim()}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCreating ? "Creating..." : "Create Game"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
