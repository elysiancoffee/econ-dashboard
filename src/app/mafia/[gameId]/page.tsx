"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Swords,
  ChevronLeft,
  Sun,
  Moon,
  Users,
  Shield,
  Skull,
  UserCheck,
  UserX,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Save,
  Shuffle,
  RefreshCw,
  Search,
  FileText,
  MessageSquare,
  AlertTriangle,
  Sliders,
  Send,
  Zap,
  Target,
  Vote,
  ExternalLink,
  Sparkles,
  History,
  UserPlus,
  Dices,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  fetchMafiaGameDetails,
  updateMafiaGame,
  advanceGamePhase,
  setMafiaGamePhase,
  addMafiaPlayers,
  updateMafiaPlayer,
  deleteMafiaPlayer,
  addMafiaRole,
  updateMafiaRole,
  deleteMafiaRole,
  addMafiaFaction,
  updateMafiaFaction,
  deleteMafiaFaction,
  saveMafiaAction,
  deleteMafiaAction,
  castMafiaVote,
  resetDayVotes,
} from "@/lib/mafia-actions";

interface RoleActionConfigItem {
  id: string;
  name: string;
  type: string; // 'none' | 'kill' | 'protect' | 'investigate' | 'block' | 'track' | 'watch' | 'custom'
  customType?: string;
  timing?: "night" | "day" | "any"; // 'night' | 'day' | 'any'
  hasLimit?: boolean;
  maxUses?: number;
  isHostAction?: boolean;
  hostInstructions?: string;
  hasCondition?: boolean;
  conditionType?: "phase_gte" | "odd_phases" | "even_phases" | "phase_1" | "custom";
  conditionValue?: string; // e.g. '5' for Day 5+
  conditionEffect?: "vote_2x" | "vote_3x" | "vote_0x" | "bulletproof" | "extra_action" | "custom";
  conditionCustomText?: string;
}

function getRoleActionsList(role: any): RoleActionConfigItem[] {
  if (role?.actionsConfig && Array.isArray(role.actionsConfig) && role.actionsConfig.length > 0) {
    return role.actionsConfig
      .filter((a: any) => a.type !== "none")
      .map((a: any) => ({
        ...a,
        timing: a.timing || a.phase || "night",
        isHostAction: !!a.isHostAction,
        hostInstructions: a.hostInstructions || "",
        hasCondition: !!a.hasCondition,
        conditionType: a.conditionType || "phase_gte",
        conditionValue: a.conditionValue || "5",
        conditionEffect: a.conditionEffect || "vote_2x",
        conditionCustomText: a.conditionCustomText || "",
      }));
  }
  if (role?.nightActionType && role.nightActionType !== "none") {
    return [
      {
        id: "act_default",
        name: role.nightActionType === "custom" ? "Custom Action" : role.nightActionType,
        type: role.nightActionType,
        customType: role.nightActionType,
        timing: "night",
        hasLimit: typeof role.maxUses === "number" && role.maxUses > 0,
        maxUses: role.maxUses || 1,
        isHostAction: false,
        hostInstructions: "",
        hasCondition: false,
        conditionType: "phase_gte",
        conditionValue: "5",
        conditionEffect: "vote_2x",
        conditionCustomText: "",
      },
    ];
  }
  return [];
}

function checkConditionActive(
  action: RoleActionConfigItem,
  currentPhase: string,
  phaseNumber: number,
  isAlive: boolean = true
): { isActive: boolean; label: string } {
  if (!action.hasCondition) return { isActive: false, label: "" };

  const cType = action.conditionType || "custom";
  const cVal = action.conditionValue || "5";
  const effect = action.conditionEffect || "vote_2x";

  let effectLabel = "";
  if (effect === "vote_2x") effectLabel = "2x Vote Weight";
  else if (effect === "vote_3x") effectLabel = "3x Vote Weight";
  else if (effect === "vote_0x") effectLabel = "0x Vote (Silenced)";
  else if (effect === "bulletproof") effectLabel = "Bulletproof (Immune to Kills)";
  else if (effect === "extra_action") effectLabel = "Extra Action Charge";
  else effectLabel = action.conditionCustomText || "Custom Modifier";

  if (cType === "phase_gte") {
    const targetPhase = parseInt(cVal, 10) || 1;
    const active = phaseNumber >= targetPhase && isAlive;
    return {
      isActive: active,
      label: `If Phase >= ${targetPhase} ➔ ${effectLabel}`,
    };
  }

  if (cType === "odd_phases") {
    const active = phaseNumber % 2 === 1 && isAlive;
    return {
      isActive: active,
      label: `Odd Phases (1, 3, 5...) ➔ ${effectLabel}`,
    };
  }

  if (cType === "even_phases") {
    const active = phaseNumber % 2 === 0 && isAlive;
    return {
      isActive: active,
      label: `Even Phases (2, 4, 6...) ➔ ${effectLabel}`,
    };
  }

  if (cType === "phase_1") {
    const active = phaseNumber === 1 && isAlive;
    return {
      isActive: active,
      label: `Phase 1 Only ➔ ${effectLabel}`,
    };
  }

  // Custom condition text
  return {
    isActive: isAlive,
    label: action.conditionCustomText || `Condition ➔ ${effectLabel}`,
  };
}

function getPlayerVoteWeight(player: any, roles: any[], phaseNumber: number): { weight: number; bonusLabel?: string } {
  if (!player || !player.roleId) return { weight: 1 };
  const role = roles.find((r: any) => r.id === player.roleId);
  const actionsList = getRoleActionsList(role);

  let multiplier = 1;
  let label = "";

  for (const act of actionsList) {
    if (act.hasCondition) {
      const cond = checkConditionActive(act, "Day", phaseNumber, player.isAlive);
      if (cond.isActive) {
        if (act.conditionEffect === "vote_2x") {
          multiplier *= 2;
          label = "2x Vote Power";
        } else if (act.conditionEffect === "vote_3x") {
          multiplier *= 3;
          label = "3x Vote Power";
        } else if (act.conditionEffect === "vote_0x") {
          multiplier = 0;
          label = "0x Vote (Silenced)";
        }
      }
    }
  }

  return { weight: multiplier, bonusLabel: label || undefined };
}

function MultiTargetDropdown({
  livingPlayers,
  targetPlayerId,
  onSave,
  disabled,
  sourcePlayerId,
}: {
  livingPlayers: any[];
  targetPlayerId?: string | null;
  onSave: (targetIdString: string | null) => void;
  disabled?: boolean;
  sourcePlayerId?: string;
}) {
  const selectedIds = targetPlayerId
    ? targetPlayerId.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const selectedPlayers = selectedIds
    .map((id) => livingPlayers.find((p) => p.id === id))
    .filter(Boolean);

  const toggleTarget = (playerId: string) => {
    const next = selectedIds.includes(playerId)
      ? selectedIds.filter((id) => id !== playerId)
      : [...selectedIds, playerId];
    onSave(next.length > 0 ? next.join(",") : null);
  };

  const getButtonLabel = () => {
    if (selectedPlayers.length === 0) return "-- Select Target(s) --";
    if (selectedPlayers.length <= 2) {
      return selectedPlayers.map((p) => p.username).join(", ");
    }
    return `${selectedPlayers.length} Targets Selected`;
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full h-8 justify-between text-xs bg-background font-normal px-2.5 hover:bg-muted/40"
          >
            <span className="truncate flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={selectedPlayers.length > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
                {getButtonLabel()}
              </span>
            </span>
            {selectedPlayers.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono shrink-0 ml-1">
                {selectedPlayers.length}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56 p-2 space-y-1.5 max-h-60 overflow-y-auto z-50">
        <div className="flex items-center justify-between px-1 pb-1 border-b text-[11px] text-muted-foreground font-medium">
          <span>Choose Target(s)</span>
          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave(null)}
              className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="space-y-0.5">
          {livingPlayers.map((target) => {
            const isSelected = selectedIds.includes(target.id);
            const isSelf = target.id === sourcePlayerId;
            return (
              <div
                key={target.id}
                onClick={() => toggleTarget(target.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                  isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded border-border pointer-events-none"
                  />
                  <span className="truncate">{target.username}</span>
                  {isSelf && <span className="text-[10px] text-muted-foreground">(Self)</span>}
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function MafiaGameControlRoom({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.gameId;

  const { currentUser } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "actions" | "votes" | "roles" | "logs">("players");
  const [copiedForum, setCopiedForum] = useState(false);

  // Bulk Player Add Dialog
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [bulkPlayerNames, setBulkPlayerNames] = useState("");
  const [isAddingPlayers, setIsAddingPlayers] = useState(false);

  // Advance Phase Dialog
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [phaseSummary, setPhaseSummary] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Edit / Set Phase Dialog
  const [showEditPhaseDialog, setShowEditPhaseDialog] = useState(false);
  const [editPhaseType, setEditPhaseType] = useState<"Day" | "Night">("Night");
  const [editPhaseNumber, setEditPhaseNumber] = useState(1);
  const [isSavingPhase, setIsSavingPhase] = useState(false);

  // New Custom Role Dialog
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleFactionId, setNewRoleFactionId] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePriority, setNewRolePriority] = useState(3);
  const [newRoleActions, setNewRoleActions] = useState<RoleActionConfigItem[]>([
    { id: "act_1", name: "", type: "none", customType: "", timing: "night", hasLimit: false, maxUses: 1, isHostAction: false, hostInstructions: "", hasCondition: false },
  ]);

  // Edit Role State
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleFactionId, setEditRoleFactionId] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRolePriority, setEditRolePriority] = useState(3);
  const [editRoleActions, setEditRoleActions] = useState<RoleActionConfigItem[]>([]);

  // Action Phase Filter (Current Phase vs All Actions)
  const [actionPhaseFilter, setActionPhaseFilter] = useState<"current" | "all">("current");

  // Player search filter
  const [playerSearch, setPlayerSearch] = useState("");

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchMafiaGameDetails(gameId);
      if (res) {
        setData(res);
      } else {
        toast.error("Game not found.");
      }
    } catch (err) {
      console.error("Failed to load game details:", err);
      toast.error("Could not load game details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [gameId]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
        <p className="text-sm">Loading Mafia game control room...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Game Not Found</h2>
        <Link href="/mafia" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to Mafia Dashboard
        </Link>
      </div>
    );
  }

  const { game, factions, roles, players, actions, votes, logs } = data;
  const isDay = game.currentPhase === "Day";
  const currentPhaseNumber = game.phaseNumber;

  const livingPlayers = players.filter((p: any) => p.isAlive);
  const deadPlayers = players.filter((p: any) => !p.isAlive);

  // Phase Actions
  const currentPhaseActions = actions.filter(
    (a: any) => a.phase === game.currentPhase && a.phaseNumber === currentPhaseNumber
  );

  // Phase Votes
  const currentPhaseVotes = votes.filter((v: any) => v.phaseNumber === currentPhaseNumber);

  const lynchThreshold = Math.floor(livingPlayers.length / 2) + 1;

  // Aggregate Day Votes with Conditional Multipliers
  const voteTallies: Record<string, string[]> = {};
  currentPhaseVotes.forEach((v: any) => {
    if (v.targetPlayerId) {
      if (!voteTallies[v.targetPlayerId]) voteTallies[v.targetPlayerId] = [];
      voteTallies[v.targetPlayerId].push(v.voterPlayerId);
    }
  });

  const voteCounts = Object.keys(voteTallies)
    .map((targetId) => {
      const target = players.find((p: any) => p.id === targetId);
      let totalWeight = 0;
      const formattedVoters: string[] = [];

      (voteTallies[targetId] || []).forEach((vId) => {
        const voter = players.find((p: any) => p.id === vId);
        if (voter) {
          const { weight } = getPlayerVoteWeight(voter, roles, currentPhaseNumber);
          totalWeight += weight;
          if (weight !== 1) {
            formattedVoters.push(`${voter.username} (${weight}x)`);
          } else {
            formattedVoters.push(voter.username);
          }
        }
      });

      return {
        target,
        count: totalWeight,
        voters: formattedVoters,
      };
    })
    .filter((v) => !!v.target)
    .sort((a, b) => b.count - a.count);

  const generateForumVoteCount = (format: "bbcode" | "markdown" = "bbcode") => {
    let report = `[b]=== DAY ${game.phaseNumber} VOTE COUNT ===[/b]\n\n`;
    if (voteCounts.length === 0) {
      report += `[i]No votes have been cast yet today.[/i]\n`;
    } else {
      voteCounts.forEach(({ target, count, voters }) => {
        report += `[b]${target?.username}[/b] (${count}): ${voters.join(", ")}\n`;
      });
    }
    report += `\n[i]With ${livingPlayers.length} alive, ${lynchThreshold} votes are required to lynch.[/i]`;
    return report;
  };

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  const handleBulkAddPlayers = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkPlayerNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      toast.error("Please enter at least one player name.");
      return;
    }

    try {
      setIsAddingPlayers(true);
      await addMafiaPlayers(gameId, names);
      toast.success(`Added ${names.length} player(s) to the roster!`);
      setBulkPlayerNames("");
      setShowBulkAddDialog(false);
      await loadDetails();
    } catch (err) {
      console.error("Bulk add error:", err);
      toast.error("Failed to add players.");
    } finally {
      setIsAddingPlayers(false);
    }
  };

  const handleAdvancePhase = async () => {
    try {
      setIsAdvancing(true);
      await advanceGamePhase(gameId, phaseSummary);
      toast.success(`Advanced to ${game.currentPhase === "Day" ? "Night" : "Day"} ${game.currentPhase === "Night" ? game.phaseNumber + 1 : game.phaseNumber}!`);
      setShowAdvanceDialog(false);
      setPhaseSummary("");
      await loadDetails();
    } catch (err) {
      console.error("Advance phase error:", err);
      toast.error("Failed to advance phase.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleOpenEditPhase = () => {
    if (data?.game) {
      setEditPhaseType((data.game.currentPhase as "Day" | "Night") || "Night");
      setEditPhaseNumber(data.game.phaseNumber ?? 1);
      setShowEditPhaseDialog(true);
    }
  };

  const handleSavePhaseChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPhase(true);
      await setMafiaGamePhase(gameId, editPhaseType, editPhaseNumber);
      toast.success(`Game phase set to ${editPhaseType} ${editPhaseNumber}`);
      setShowEditPhaseDialog(false);
      await loadDetails();
    } catch (err) {
      console.error("Set phase error:", err);
      toast.error("Failed to update phase.");
    } finally {
      setIsSavingPhase(false);
    }
  };

  const handleToggleAlive = async (player: any) => {
    const nextAlive = !player.isAlive;
    let deathCause = player.deathCause;
    let deathPhase = player.deathPhase;

    if (!nextAlive && !deathCause) {
      deathCause = isDay ? `Lynched Day ${game.phaseNumber}` : `Killed Night ${game.phaseNumber}`;
      deathPhase = `${game.currentPhase} ${game.phaseNumber}`;
    }

    try {
      await updateMafiaPlayer(player.id, {
        isAlive: nextAlive,
        deathCause: nextAlive ? null : deathCause,
        deathPhase: nextAlive ? null : deathPhase,
      });
      toast.info(`Player ${player.username} marked as ${nextAlive ? "Alive" : "Dead"}`);
      await loadDetails();
    } catch (err) {
      toast.error("Failed to update player status.");
    }
  };

  const handleAssignRole = async (playerId: string, roleId: string | null) => {
    try {
      await updateMafiaPlayer(playerId, { roleId });
      toast.success("Role updated.");
      await loadDetails();
    } catch (err) {
      toast.error("Failed to assign role.");
    }
  };

  const handleRandomizeRoles = async () => {
    if (roles.length === 0 || livingPlayers.length === 0) {
      toast.error("Ensure you have roles and players created before shuffling.");
      return;
    }
    if (!confirm("Randomly assign roles to all unassigned living players?")) return;

    // Pick roles and shuffle
    const rolePool: string[] = [];
    roles.forEach((r: any) => {
      rolePool.push(r.id);
    });

    const shuffled = [...livingPlayers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      const assignedRoleId = rolePool[i % rolePool.length];
      await updateMafiaPlayer(shuffled[i].id, { roleId: assignedRoleId });
    }

    toast.success("Shuffled and assigned roles to players!");
    await loadDetails();
  };

  const handleSaveAction = async (
    sourcePlayerId: string,
    actionType: string,
    targetPlayerId: string | null,
    actionConfigId?: string | null,
    result?: string | null
  ) => {
    try {
      await saveMafiaAction({
        gameId,
        phase: game.currentPhase,
        phaseNumber: game.phaseNumber,
        sourcePlayerId,
        actionConfigId: actionConfigId || null,
        targetPlayerId,
        actionType,
        result: result !== undefined ? result : undefined,
      });
      toast.success("Action updated.");
      await loadDetails();
    } catch (err) {
      toast.error("Failed to save action.");
    }
  };

  const handleCastVote = async (voterId: string, targetId: string | null) => {
    try {
      await castMafiaVote(gameId, game.phaseNumber, voterId, targetId);
      await loadDetails();
    } catch (err) {
      toast.error("Failed to record vote.");
    }
  };

  const handleAddCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Please enter a role name.");
      return;
    }

    const cleanActions = newRoleActions
      .map((a) => ({
        id: a.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: a.name.trim() || (a.type === "custom" ? a.customType?.trim() || "Custom" : a.type),
        type: a.type,
        customType: a.customType?.trim() || "",
        timing: a.timing || "night",
        hasLimit: !!a.hasLimit,
        maxUses: a.hasLimit ? Math.max(1, a.maxUses || 1) : null,
        isHostAction: !!a.isHostAction,
        hostInstructions: a.isHostAction ? a.hostInstructions?.trim() || "" : "",
        hasCondition: !!a.hasCondition,
        conditionType: a.conditionType || "phase_gte",
        conditionValue: a.conditionValue || "5",
        conditionEffect: a.conditionEffect || "vote_2x",
        conditionCustomText: a.conditionCustomText?.trim() || "",
      }))
      .filter((a) => a.type !== "none");

    const primaryAction = cleanActions[0];

    const matchedFaction = factions.find((f: any) => f.name === newRoleFactionId || f.id === newRoleFactionId);

    try {
      await addMafiaRole(gameId, {
        name: newRoleName.trim(),
        factionId: matchedFaction?.id || null,
        alignment: matchedFaction?.name || newRoleFactionId || "Town",
        priority: newRolePriority,
        abilityDescription: newRoleDescription.trim(),
        nightActionType: primaryAction
          ? primaryAction.type === "custom"
            ? primaryAction.customType || "custom"
            : primaryAction.type
          : "none",
        maxUses: primaryAction?.hasLimit ? primaryAction.maxUses : null,
        actionsConfig: cleanActions,
      });
      toast.success(`Role "${newRoleName}" created!`);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRoleFactionId("");
      setNewRoleActions([
        { id: `act_${Date.now()}`, name: "", type: "none", customType: "", timing: "night", hasLimit: false, maxUses: 1, isHostAction: false, hostInstructions: "", hasCondition: false },
      ]);
      setShowAddRoleDialog(false);
      await loadDetails();
    } catch (err) {
      toast.error("Failed to create role.");
    }
  };

  const handleStartEditRole = (role: any) => {
    setEditingRole(role);
    setEditRoleName(role.name || "");
    const faction = factions.find((f: any) => f.id === role.factionId);
    setEditRoleFactionId(faction?.name || role.alignment || "");
    setEditRolePriority(role.priority ?? 3);
    setEditRoleDescription(role.abilityDescription || "");

    const existingActions = getRoleActionsList(role);
    if (existingActions.length > 0) {
      setEditRoleActions(
        existingActions.map((a) => ({
          ...a,
          id: a.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: a.name || "",
          customType: a.customType || (a.type === "custom" ? a.name : ""),
          timing: a.timing || "night",
          isHostAction: !!a.isHostAction,
          hostInstructions: a.hostInstructions || "",
          hasCondition: !!a.hasCondition,
          conditionType: a.conditionType || "phase_gte",
          conditionValue: a.conditionValue || "5",
          conditionEffect: a.conditionEffect || "vote_2x",
          conditionCustomText: a.conditionCustomText || "",
        }))
      );
    } else {
      setEditRoleActions([
        { id: `act_${Date.now()}`, name: "", type: "none", customType: "", timing: "night", hasLimit: false, maxUses: 1, isHostAction: false, hostInstructions: "", hasCondition: false },
      ]);
    }
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) {
      toast.error("Please enter a role name.");
      return;
    }

    const cleanActions = editRoleActions
      .map((a) => ({
        id: a.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: a.name.trim() || (a.type === "custom" ? a.customType?.trim() || "Custom" : a.type),
        type: a.type,
        customType: a.customType?.trim() || "",
        timing: a.timing || "night",
        hasLimit: !!a.hasLimit,
        maxUses: a.hasLimit ? Math.max(1, a.maxUses || 1) : null,
        isHostAction: !!a.isHostAction,
        hostInstructions: a.isHostAction ? a.hostInstructions?.trim() || "" : "",
        hasCondition: !!a.hasCondition,
        conditionType: a.conditionType || "phase_gte",
        conditionValue: a.conditionValue || "5",
        conditionEffect: a.conditionEffect || "vote_2x",
        conditionCustomText: a.conditionCustomText?.trim() || "",
      }))
      .filter((a) => a.type !== "none");

    const primaryAction = cleanActions[0];
    const matchedFaction = factions.find((f: any) => f.name === editRoleFactionId || f.id === editRoleFactionId);

    try {
      await updateMafiaRole(editingRole.id, {
        name: editRoleName.trim(),
        factionId: matchedFaction?.id || null,
        alignment: matchedFaction?.name || editRoleFactionId || "Town",
        priority: editRolePriority,
        abilityDescription: editRoleDescription.trim(),
        nightActionType: primaryAction
          ? primaryAction.type === "custom"
            ? primaryAction.customType || "custom"
            : primaryAction.type
          : "none",
        maxUses: primaryAction?.hasLimit ? primaryAction.maxUses : null,
        actionsConfig: cleanActions,
      });
      toast.success(`Updated role "${editRoleName}"!`);
      setEditingRole(null);
      await loadDetails();
    } catch (err) {
      toast.error("Failed to update role.");
    }
  };

  // -------------------------------------------------------------
  // FORUM BBCODE / MARKDOWN EXPORTERS
  // -------------------------------------------------------------

  const generateForumRoster = (format: "bbcode" | "markdown") => {
    if (format === "bbcode") {
      let out = `[b]=== LIVING PLAYERS (${livingPlayers.length}) ===[/b]\n`;
      livingPlayers.forEach((p: any, idx: number) => {
        out += `${idx + 1}. [b]${p.username}[/b]\n`;
      });
      if (deadPlayers.length > 0) {
        out += `\n[b]=== GRAVEYARD / DEAD PLAYERS (${deadPlayers.length}) ===[/b]\n`;
        deadPlayers.forEach((p: any) => {
          const role = roles.find((r: any) => r.id === p.roleId);
          const faction = factions.find((f: any) => f.id === role?.factionId);
          const color = faction?.color || "#888888";
          out += `[s]${p.username}[/s] - [color=${color}][b]${role?.name || "Unknown"}[/b][/color] (${p.deathCause || "Died"})\n`;
        });
      }
      return out;
    } else {
      let out = `### 🟢 Living Players (${livingPlayers.length})\n`;
      livingPlayers.forEach((p: any, idx: number) => {
        out += `${idx + 1}. **${p.username}**\n`;
      });
      if (deadPlayers.length > 0) {
        out += `\n### 🪦 Graveyard (${deadPlayers.length})\n`;
        deadPlayers.forEach((p: any) => {
          const role = roles.find((r: any) => r.id === p.roleId);
          out += `- ~~${p.username}~~ - **${role?.name || "Unknown"}** *(${p.deathCause || "Died"})*\n`;
        });
      }
      return out;
    }
  };

  const copyForumText = (text: string, label = "Roster") => {
    navigator.clipboard.writeText(text);
    setCopiedForum(true);
    toast.success(`Copied ${label} for forum posting!`);
    setTimeout(() => setCopiedForum(false), 2000);
  };

  // Filtered Players
  const filteredPlayers = players.filter((p: any) =>
    p.username.toLowerCase().includes(playerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Top Game Header & Phase Controller */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/mafia"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 -ml-2 text-muted-foreground")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Games
            </Link>
            <span className="text-muted-foreground">/</span>
            <Badge variant="outline" className="font-mono text-xs">
              {game.status.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{game.title}</h1>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-xs font-mono px-2.5 py-0.5 flex items-center gap-1.5 ${
                  isDay
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                }`}
              >
                {isDay ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                {game.currentPhase} {game.phaseNumber}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditPhase}
                title="Change active phase and number"
                className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3 w-3" />
                <span>Set Phase</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Phase & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Forum Exporter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}>
              {copiedForum ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>Forum Export</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => copyForumText(generateForumRoster("bbcode"), "BBCode Roster")}>
                Copy BBCode Roster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyForumText(generateForumRoster("markdown"), "Markdown Roster")}>
                Copy Markdown Roster
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advance Phase Button */}
          <Button
            onClick={() => setShowAdvanceDialog(true)}
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm text-xs font-medium"
          >
            {isDay ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            Advance to {isDay ? "Night" : "Day"} {isDay ? game.phaseNumber : game.phaseNumber + 1}
          </Button>
        </div>
      </div>

      {/* Quick Stat Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Living Players</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">
            {livingPlayers.length} <span className="text-xs font-normal text-muted-foreground">/ {players.length}</span>
          </p>
        </Card>

        <Card className="bg-card/50 border-border/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Graveyard / Dead</span>
            <Skull className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-rose-400">
            {deadPlayers.length}
          </p>
        </Card>
        <Card className="bg-card/50 border-border/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Actions Logged</span>
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-indigo-400">
            {currentPhaseActions.length} <span className="text-xs font-normal text-muted-foreground">submitted</span>
          </p>
        </Card>

        <Card className="bg-card/50 border-border/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Lynch Threshold</span>
            <Vote className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono mt-1 text-amber-400">
            {lynchThreshold} <span className="text-xs font-normal text-muted-foreground">votes</span>
          </p>
        </Card>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("players")}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "players"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Player Roster ({players.length})
        </button>

        <button
          onClick={() => setActiveTab("actions")}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "actions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Actions & Resolution ({currentPhaseActions.length})
        </button>

        <button
          onClick={() => setActiveTab("votes")}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "votes"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Vote className="h-3.5 w-3.5" />
          Day Votes ({currentPhaseVotes.length})
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "roles"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Roles Library ({roles.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Timeline & Logs
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PLAYER ROSTER */}
      {/* ========================================================= */}
      {activeTab === "players" && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roster by player name..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRandomizeRoles}
                className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
              >
                <Shuffle className="h-3.5 w-3.5" /> Randomize Roles
              </Button>
              <Button
                onClick={() => setShowBulkAddDialog(true)}
                size="sm"
                className="text-xs h-8 gap-1 bg-primary text-primary-foreground"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Players
              </Button>
            </div>
            {/* Roster Table (Desktop) & Cards (Mobile) */}
          </div>

          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-3">Player</div>
              <div className="col-span-3">Assigned Role & Faction</div>
              <div className="col-span-3">Player Notes</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredPlayers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No players found. Add players using the &quot;Add Players&quot; button above.
                </div>
              ) : (
                filteredPlayers.map((player: any, idx: number) => {
                  const role = roles.find((r: any) => r.id === player.roleId);
                  const faction = factions.find((f: any) => f.id === role?.factionId);

                  return (
                    <div key={player.id}>
                      {/* Desktop Row */}
                      <div
                        className={`hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 items-center text-xs transition-colors hover:bg-muted/15 ${
                          !player.isAlive ? "bg-rose-500/5 opacity-70" : ""
                        }`}
                      >
                        {/* Col 1: Index */}
                        <div className="col-span-1 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </div>

                        {/* Col 2: Player */}
                        <div className="col-span-3">
                          <span className={`font-semibold ${!player.isAlive ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {player.username}
                          </span>
                          {!player.isAlive && player.deathCause && (
                            <p className="text-[10px] text-rose-400 font-mono mt-0.5">{player.deathCause}</p>
                          )}
                        </div>

                        {/* Col 3: Role Selector */}
                        <div className="col-span-3">
                          {(() => {
                            const currentRole = roles.find((r: any) => r.id === player.roleId);
                            return (
                              <Select
                                value={currentRole?.name || "none"}
                                onValueChange={(val) => {
                                  if (val === "none") {
                                    handleAssignRole(player.id, null);
                                  } else {
                                    const matched = roles.find((r: any) => r.name === val || r.id === val);
                                    handleAssignRole(player.id, matched ? matched.id : null);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {roles.map((r: any) => (
                                    <SelectItem key={r.id} value={r.name}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </div>

                        {/* Col 4: Notes */}
                        <div className="col-span-3">
                          <Input
                            placeholder="Notes / targets..."
                            defaultValue={player.notes || ""}
                            onBlur={async (e) => {
                              if (e.target.value !== player.notes) {
                                await updateMafiaPlayer(player.id, { notes: e.target.value });
                                toast.success("Saved note.");
                              }
                            }}
                            className="h-7 text-xs bg-background/50"
                          />
                        </div>

                        {/* Col 5: Alive Toggle */}
                        <div className="col-span-1 text-center">
                          <Button
                            variant={player.isAlive ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => handleToggleAlive(player)}
                            className={`h-6 text-[10px] font-mono px-2 ${
                              player.isAlive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : ""
                            }`}
                          >
                            {player.isAlive ? "ALIVE" : "DEAD"}
                          </Button>
                        </div>

                        {/* Col 6: Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm(`Remove ${player.username} from game?`)) {
                                await deleteMafiaPlayer(player.id);
                                await loadDetails();
                              }
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Mobile Card */}
                      <div
                        className={`block md:hidden p-3.5 space-y-2.5 text-xs transition-colors hover:bg-muted/15 ${
                          !player.isAlive ? "bg-rose-500/5 opacity-70" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground text-[11px]">#{idx + 1}</span>
                            <span className={`font-semibold text-sm ${!player.isAlive ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {player.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant={player.isAlive ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => handleToggleAlive(player)}
                              className={`h-6 text-[10px] font-mono px-2 ${
                                player.isAlive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                  : ""
                              }`}
                            >
                              {player.isAlive ? "ALIVE" : "DEAD"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm(`Remove ${player.username} from game?`)) {
                                  await deleteMafiaPlayer(player.id);
                                  await loadDetails();
                                }
                              }}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {!player.isAlive && player.deathCause && (
                          <p className="text-[10px] text-rose-400 font-mono">{player.deathCause}</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            {(() => {
                              const currentRole = roles.find((r: any) => r.id === player.roleId);
                              return (
                                <Select
                                  value={currentRole?.name || "none"}
                                  onValueChange={(val) => {
                                    if (val === "none") {
                                      handleAssignRole(player.id, null);
                                    } else {
                                      const matched = roles.find((r: any) => r.name === val || r.id === val);
                                      handleAssignRole(player.id, matched ? matched.id : null);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="Assign Role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {roles.map((r: any) => (
                                      <SelectItem key={r.id} value={r.name}>
                                        {r.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                          </div>

                          <div>
                            <Input
                              placeholder="Notes / targets..."
                              defaultValue={player.notes || ""}
                              onBlur={async (e) => {
                                if (e.target.value !== player.notes) {
                                  await updateMafiaPlayer(player.id, { notes: e.target.value });
                                  toast.success("Saved note.");
                                }
                              }}
                              className="h-8 text-xs bg-background/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ACTIONS & RESOLUTION */}
      {/* ========================================================= */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                Action Submission & Conflict Resolver ({game.currentPhase} {game.phaseNumber})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record each living role&apos;s target action. The engine verifies priority conflicts (Blocks &gt; Protects &gt; Kills &gt; Checks).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Select
                value={actionPhaseFilter}
                onValueChange={(val) => setActionPhaseFilter(val === "all" ? "all" : "current")}
              >
                <SelectTrigger className="h-8 text-xs bg-background w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current ({game.currentPhase}) Actions</SelectItem>
                  <SelectItem value="all">All Actions (Day + Night)</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="font-mono text-xs bg-background shrink-0">
                {currentPhaseActions.length} Logged
              </Badge>
            </div>
          </div>

          {/* Living Power Roles Actions Table */}
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm divide-y divide-border/60">
            {livingPlayers
              .flatMap((player: any) => {
                const role = roles.find((r: any) => r.id === player.roleId);
                const roleActions = getRoleActionsList(role);
                return roleActions.map((actionConfig) => ({ player, role, actionConfig }));
              })
              .filter(({ actionConfig }: { actionConfig: RoleActionConfigItem }) => {
                if (actionPhaseFilter === "all") return true;
                const timing = actionConfig.timing || "night";
                if (timing === "any") return true;
                return timing === (isDay ? "day" : "night");
              })
              .map(({ player, role, actionConfig }: { player: any; role: any; actionConfig: RoleActionConfigItem }) => {
                const existingAction = currentPhaseActions.find(
                  (a: any) =>
                    a.sourcePlayerId === player.id &&
                    (a.actionConfigId === actionConfig.id || (!a.actionConfigId && a.actionType === actionConfig.type))
                );

                // Calculate limited uses for this specific action
                const hasLimit = !!actionConfig.hasLimit && typeof actionConfig.maxUses === "number" && actionConfig.maxUses > 0;
                const priorUses = actions.filter(
                  (a: any) =>
                    a.sourcePlayerId === player.id &&
                    (a.actionConfigId === actionConfig.id || (!a.actionConfigId && a.actionType === actionConfig.type)) &&
                    a.targetPlayerId &&
                    (a.phase !== game.currentPhase || a.phaseNumber !== game.phaseNumber)
                ).length;
                const hasCurrentAction = !!existingAction?.targetPlayerId;
                const remainingBeforeThisPhase = hasLimit ? Math.max(0, (actionConfig.maxUses || 0) - priorUses) : 999;
                const currentRemaining = hasLimit
                  ? Math.max(0, (actionConfig.maxUses || 0) - (priorUses + (hasCurrentAction ? 1 : 0)))
                  : 999;
                const isExhausted = hasLimit && remainingBeforeThisPhase <= 0 && !hasCurrentAction;

                return (
                  <div
                    key={`${player.id}-${actionConfig.id}`}
                    className="p-3.5 sm:p-4 hover:bg-muted/15 transition-colors space-y-3"
                  >
                    {/* Top Row: Role Name, Player Username & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{role?.name || "Unassigned"}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded border border-border/40">
                          {player.username}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="capitalize text-xs font-mono font-medium bg-background">
                          {actionConfig.name || actionConfig.type}
                        </Badge>
                        {actionConfig.timing === "day" && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono px-1.5 py-0 h-4">
                            ☀️ Day
                          </Badge>
                        )}
                        {actionConfig.timing === "night" && (
                          <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-mono px-1.5 py-0 h-4">
                            🌙 Night
                          </Badge>
                        )}
                        {actionConfig.timing === "any" && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono px-1.5 py-0 h-4">
                            ✨ Any
                          </Badge>
                        )}
                        {actionConfig.isHostAction && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/40 font-mono px-1.5 py-0 h-4">
                            Host Action
                          </Badge>
                        )}
                        {actionConfig.hasCondition && (
                          <Badge variant="outline" className="text-[10px] bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-mono px-1.5 py-0 h-4">
                            ⚡ Condition
                          </Badge>
                        )}
                        {hasLimit && (
                          <Badge
                            variant={currentRemaining === 0 ? "destructive" : "secondary"}
                            className="text-[10px] font-mono px-1.5 py-0 h-4"
                          >
                            {currentRemaining === 0 ? "0 left" : `${currentRemaining} left`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Full Width Banners for Host Note & Condition */}
                    {actionConfig.isHostAction && actionConfig.hostInstructions && (
                      <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-md flex items-start gap-2 font-mono leading-relaxed">
                        <span className="shrink-0 font-bold">📋 Host Note:</span>
                        <span>{actionConfig.hostInstructions}</span>
                      </div>
                    )}

                    {actionConfig.hasCondition && (() => {
                      const condInfo = checkConditionActive(actionConfig, game.currentPhase, currentPhaseNumber, player.isAlive);
                      return (
                        <div className={`text-xs px-3 py-2 rounded-md flex items-start gap-2 font-mono leading-relaxed ${
                          condInfo.isActive
                            ? "bg-indigo-500/15 border border-indigo-500/35 text-indigo-300"
                            : "bg-muted/40 border border-border/50 text-muted-foreground opacity-75"
                        }`}>
                          <span className="shrink-0 font-bold">{condInfo.isActive ? "⚡ Condition (Active):" : "⏳ Condition (Inactive):"}</span>
                          <span>{condInfo.label}</span>
                        </div>
                      );
                    })()}

                    {/* Controls Row: Target Multi-Dropdown, Result Input, Copy PM */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                      <div className="w-full sm:w-1/2">
                        {isExhausted ? (
                          <div className="h-8 px-2.5 rounded-md bg-muted/40 border border-border/60 flex items-center text-xs text-muted-foreground font-mono">
                            ⚠️ 0 remaining (Exhausted)
                          </div>
                        ) : (
                          <MultiTargetDropdown
                            livingPlayers={livingPlayers}
                            targetPlayerId={existingAction?.targetPlayerId}
                            sourcePlayerId={player.id}
                            onSave={(targets) =>
                              handleSaveAction(
                                player.id,
                                actionConfig.type === "custom" ? (actionConfig.customType || "custom") : actionConfig.type,
                                targets,
                                actionConfig.id,
                                existingAction?.result || null
                              )
                            }
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-1/2">
                        <Input
                          placeholder="Result note (e.g. Guilty / Innocent / Saved)..."
                          defaultValue={existingAction?.result || ""}
                          onBlur={(e) =>
                            handleSaveAction(
                              player.id,
                              actionConfig.type === "custom" ? (actionConfig.customType || "custom") : actionConfig.type,
                              existingAction?.targetPlayerId || null,
                              actionConfig.id,
                              e.target.value
                            )
                          }
                          className="h-8 text-xs bg-background/50 flex-1"
                        />

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const selectedTargetIds = (existingAction?.targetPlayerId || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                            const targetNames = selectedTargetIds
                              .map((tId: string) => livingPlayers.find((p: any) => p.id === tId)?.username || players.find((p: any) => p.id === tId)?.username)
                              .filter(Boolean)
                              .join(", ") || "No Target";
                            const pmText = `Hello ${player.username},\n\nYour [${actionConfig.name || actionConfig.type}] action on ${targetNames} returned:\n${existingAction?.result || "Action successfully processed."}`;
                            copyForumText(pmText, "Player PM");
                          }}
                          title="Copy Player Result PM"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DAY VOTES & TALLY */}
      {activeTab === "votes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Vote className="h-4 w-4 text-emerald-400" />
                Day {game.phaseNumber} Live Vote Tally
              </h3>
              <p className="text-xs text-muted-foreground">
                Majority threshold: <span className="font-bold text-foreground font-mono">{lynchThreshold}</span> votes needed to lynch ({livingPlayers.length} alive).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm("Reset all votes for this day phase?")) {
                    await resetDayVotes(gameId, game.phaseNumber);
                    await loadDetails();
                    toast.success("Day votes reset.");
                  }
                }}
                className="text-xs h-8 text-muted-foreground hover:text-destructive gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Votes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyForumText(generateForumVoteCount("bbcode"), "BBCode Vote Count");
                }}
                className="text-xs h-8 gap-1"
              >
                <Copy className="h-3.5 w-3.5" /> Copy BBCode Tally
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voters List */}
            <Card className="border-border/80 bg-card/60">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Individual Voter Casts</CardTitle>
                <CardDescription className="text-xs">Record who each living player is currently voting for.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2.5 max-h-[400px] overflow-y-auto">
                {livingPlayers.map((player: any) => {
                  const vote = votes.find((v: any) => v.voterPlayerId === player.id);

                  return (
                    <div key={player.id} className="flex items-center justify-between gap-3 text-xs p-2 rounded-md bg-muted/20 border">
                      <span className="font-medium text-foreground truncate">{player.username}</span>
                      <Select
                        value={vote?.targetPlayerId || "none"}
                        onValueChange={(val) => handleCastVote(player.id, val === "none" ? null : val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-44 bg-background">
                          <SelectValue placeholder="Not Voting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Not Voting / Unvote --</SelectItem>
                          {livingPlayers
                            .filter((target: any) => target.id !== player.id)
                            .map((target: any) => (
                              <SelectItem key={target.id} value={target.id}>
                                {target.username}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Live Standings Gauge */}
            <Card className="border-border/80 bg-card/60">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Live Standings & Wagon Tally</CardTitle>
                <CardDescription className="text-xs">Aggregated votes sorted by highest wagon count.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                {voteCounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No votes have been cast yet today.</p>
                ) : (
                  voteCounts.map(({ target, count, voters }: any) => {
                    const isMajority = count >= lynchThreshold;
                    const percent = Math.min(100, Math.round((count / lynchThreshold) * 100));

                    return (
                      <div key={target.id} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground text-sm">{target.username}</span>
                          <Badge variant={isMajority ? "destructive" : "secondary"} className="font-mono text-xs">
                            {count} / {lynchThreshold} votes {isMajority && "⚠️ LYNCH REACHED"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Voted by: <span className="text-foreground">{voters.join(", ")}</span>
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ROLES & FACTIONS */}
      {/* ========================================================= */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Roles Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Game Roles Library</h3>
              <p className="text-xs text-muted-foreground">Configured roles, multi-actions, and ability capabilities for this game.</p>
            </div>

            <Button
              onClick={() => setShowAddRoleDialog(true)}
              size="sm"
              className="gap-1.5 text-xs bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Role
            </Button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role: any) => {
              const faction = factions.find((f: any) => f.id === role.factionId);
              const actionsList = getRoleActionsList(role);

              return (
                <Card key={role.id} className="border-border/80 bg-card/60 flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-foreground">{role.name}</CardTitle>
                      <Badge
                        variant="outline"
                        style={{ borderColor: faction?.color, color: faction?.color }}
                        className="text-[10px] font-mono uppercase"
                      >
                        {faction?.name || role.alignment}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1 line-clamp-2">
                      {role.abilityDescription || "Standard role without special abilities."}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {actionsList.length === 0 ? (
                        <span className="font-mono text-[11px]">Passive</span>
                      ) : (
                        actionsList.map((act, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 flex items-center gap-1">
                            <span>{act.timing === "day" ? "☀️" : act.timing === "any" ? "✨" : "🌙"}</span>
                            <span>{act.name || act.type}</span>
                            {act.hasLimit && act.maxUses ? <span className="opacity-80">({act.maxUses}-Shot)</span> : null}
                            {act.isHostAction && <span className="text-amber-400 font-semibold">(Host Action)</span>}
                            {act.hasCondition && <span className="text-indigo-400 font-semibold">(⚡ If-Condition)</span>}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditRole(role)}
                        title={`Edit ${role.name}`}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (confirm(`Delete role "${role.name}"?`)) {
                            await deleteMafiaRole(role.id);
                            await loadDetails();
                          }
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: TIMELINE & LOGS */}
      {/* ========================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-card p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Phase Transition Logs</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No phase logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-muted/20 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                      <span>
                        {log.phase} {log.phaseNumber}
                      </span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIALOGS */}
      {/* ------------------------------------------------------------- */}

      {/* Bulk Add Players Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleBulkAddPlayers}>
            <DialogHeader>
              <DialogTitle>Add Players to Roster</DialogTitle>
              <DialogDescription className="text-xs">
                Paste player usernames or forum handles (one per line) to add them to this game.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Textarea
                placeholder="PlayerOne&#10;PlayerTwo&#10;PlayerThree..."
                rows={6}
                value={bulkPlayerNames}
                onChange={(e) => setBulkPlayerNames(e.target.value)}
                className="text-xs font-mono"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingPlayers || !bulkPlayerNames.trim()} size="sm">
                {isAddingPlayers ? "Adding..." : "Add to Roster"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Advance Phase Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Advance to {isDay ? "Night" : "Day"} {isDay ? game.phaseNumber : game.phaseNumber + 1}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm phase transition. You can optionally log a story summary or phase announcement note.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Phase Transition Summary (Optional)</label>
            <Textarea
              placeholder="e.g. Day 1 ended with PlayerX being lynched. They were a Vanilla Townie."
              rows={3}
              value={phaseSummary}
              onChange={(e) => setPhaseSummary(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdvanceDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdvancePhase}
              disabled={isAdvancing}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isAdvancing ? "Advancing..." : "Confirm & Advance Phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set / Change Game Phase Dialog */}
      <Dialog open={showEditPhaseDialog} onOpenChange={setShowEditPhaseDialog}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSavePhaseChange}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <DialogTitle>Set Game Phase</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Manually set or correct the active game phase and number (e.g. Night 1, Day 1, Night 0).
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Phase Type</label>
                <Select value={editPhaseType} onValueChange={(val: any) => setEditPhaseType(val)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Night">🌙 Night Phase</SelectItem>
                    <SelectItem value="Day">☀️ Day Phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Phase Number</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={editPhaseNumber}
                  onChange={(e) => setEditPhaseNumber(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditPhaseDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingPhase} size="sm" className="bg-primary text-primary-foreground">
                {isSavingPhase ? "Saving..." : "Set Phase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Custom Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddCustomRole}>
            <DialogHeader>
              <DialogTitle>Add Custom Role</DialogTitle>
              <DialogDescription className="text-xs">
                Create a role with custom alignment, actions, timing (day/night), and usage limits.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium">Role Name *</label>
                  <Input
                    placeholder="e.g. Jack of All Trades, Day Vigilante"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium">Faction / Alignment</label>
                  <Select value={newRoleFactionId} onValueChange={(val) => setNewRoleFactionId(val || "")}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Faction..." />
                    </SelectTrigger>
                    <SelectContent>
                      {factions.map((f: any) => (
                        <SelectItem key={f.id} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Abilities List */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Role Actions & Abilities ({newRoleActions.length})</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewRoleActions([
                        ...newRoleActions,
                        { id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, name: "", type: "kill", customType: "", timing: "night", hasLimit: false, maxUses: 1 },
                      ])
                    }
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Action
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {newRoleActions.map((act, index) => (
                    <div key={act.id} className="p-3 rounded-lg border bg-muted/20 space-y-2 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Action Name / Label</label>
                          <Input
                            placeholder="e.g. Protect, Shoot"
                            value={act.name}
                            onChange={(e) => {
                              const updated = [...newRoleActions];
                              updated[index].name = e.target.value;
                              setNewRoleActions(updated);
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Action Type</label>
                          <Select
                            value={act.type}
                            onValueChange={(val) => {
                              const updated = [...newRoleActions];
                              updated[index].type = val || "none";
                              setNewRoleActions(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (Passive)</SelectItem>
                              <SelectItem value="kill">Kill (Attack)</SelectItem>
                              <SelectItem value="protect">Protect (Defense)</SelectItem>
                              <SelectItem value="investigate">Investigate (Check)</SelectItem>
                              <SelectItem value="block">Block (Roleblock)</SelectItem>
                              <SelectItem value="track">Track (Visit Tracker)</SelectItem>
                              <SelectItem value="watch">Watch (Visitor Watcher)</SelectItem>
                              <SelectItem value="custom">Custom Action Type...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Phase / Timing</label>
                          <Select
                            value={act.timing || "night"}
                            onValueChange={(val: any) => {
                              const updated = [...newRoleActions];
                              updated[index].timing = val;
                              setNewRoleActions(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="night">🌙 Night Only</SelectItem>
                              <SelectItem value="day">☀️ Day Only</SelectItem>
                              <SelectItem value="any">✨ Any Phase (Day/Night)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {act.type === "custom" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Custom Type Identifier</label>
                          <Input
                            placeholder="e.g. Poison, Silence, Redirect"
                            value={act.customType || ""}
                            onChange={(e) => {
                              const updated = [...newRoleActions];
                              updated[index].customType = e.target.value;
                              setNewRoleActions(updated);
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      )}

                      {act.type !== "none" && (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            {/* Shot Limit Checkbox & Input */}
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={act.hasLimit}
                                  onChange={(e) => {
                                    const updated = [...newRoleActions];
                                    updated[index].hasLimit = e.target.checked;
                                    setNewRoleActions(updated);
                                  }}
                                  className="rounded border-border"
                                />
                                <span>Limit shots/charges</span>
                              </label>

                              {act.hasLimit && (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={act.maxUses || 1}
                                    onChange={(e) => {
                                      const updated = [...newRoleActions];
                                      updated[index].maxUses = parseInt(e.target.value, 10) || 1;
                                      setNewRoleActions(updated);
                                    }}
                                    className="h-6 w-14 text-center font-mono text-xs bg-background"
                                  />
                                  <span className="text-[11px] text-muted-foreground">uses</span>
                                </div>
                              )}
                            </div>

                            {/* Host Action Checkbox */}
                            <label className="flex items-center gap-1.5 cursor-pointer text-amber-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={act.isHostAction}
                                onChange={(e) => {
                                  const updated = [...newRoleActions];
                                  updated[index].isHostAction = e.target.checked;
                                  setNewRoleActions(updated);
                                }}
                                className="rounded border-amber-500/50"
                              />
                              <span>Requires Host Action</span>
                            </label>

                            {/* Condition / Modifier Checkbox */}
                            <label className="flex items-center gap-1.5 cursor-pointer text-indigo-400 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={act.hasCondition}
                                onChange={(e) => {
                                  const updated = [...newRoleActions];
                                  updated[index].hasCondition = e.target.checked;
                                  if (e.target.checked && !updated[index].conditionType) {
                                    updated[index].conditionType = "phase_gte";
                                    updated[index].conditionValue = "5";
                                    updated[index].conditionEffect = "vote_2x";
                                  }
                                  setNewRoleActions(updated);
                                }}
                                className="rounded border-indigo-500/50"
                              />
                              <span>⚡ If-Condition</span>
                            </label>

                            {newRoleActions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewRoleActions(newRoleActions.filter((_, i) => i !== index));
                                }}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                              >
                                Remove
                              </Button>
                            )}
                          </div>

                          {/* Host Action Instructions Input */}
                          {act.isHostAction && (
                            <div className="space-y-1 bg-amber-500/5 border border-amber-500/20 p-2 rounded-md">
                              <label className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                                <span>Host Action Instructions / Notes</span>
                              </label>
                              <Input
                                placeholder="e.g. Anything the host needs to do (RNG check, secret PM, manual condition, item distribution, etc.)..."
                                value={act.hostInstructions || ""}
                                onChange={(e) => {
                                  const updated = [...newRoleActions];
                                  updated[index].hostInstructions = e.target.value;
                                  setNewRoleActions(updated);
                                }}
                                className="h-7 text-xs bg-background border-amber-500/30 font-mono"
                              />
                            </div>
                          )}

                          {/* Condition Builder Inputs */}
                          {act.hasCondition && (
                            <div className="space-y-2 bg-indigo-500/5 border border-indigo-500/25 p-2.5 rounded-md">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-400">
                                <span>⚡ Conditional Modifier (IF ➔ THEN)</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-semibold text-muted-foreground">IF (Trigger)</label>
                                  <Select
                                    value={act.conditionType || "phase_gte"}
                                    onValueChange={(val: any) => {
                                      const updated = [...newRoleActions];
                                      updated[index].conditionType = val;
                                      setNewRoleActions(updated);
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="phase_gte">Phase reaches (e.g. Day 5+)</SelectItem>
                                      <SelectItem value="odd_phases">Odd Phases (1, 3, 5...)</SelectItem>
                                      <SelectItem value="even_phases">Even Phases (2, 4, 6...)</SelectItem>
                                      <SelectItem value="phase_1">Phase 1 Only</SelectItem>
                                      <SelectItem value="custom">Custom Condition...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-semibold text-muted-foreground">THEN (Effect)</label>
                                  <Select
                                    value={act.conditionEffect || "vote_2x"}
                                    onValueChange={(val: any) => {
                                      const updated = [...newRoleActions];
                                      updated[index].conditionEffect = val;
                                      setNewRoleActions(updated);
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="vote_2x">Vote counts as 2x (Double Vote)</SelectItem>
                                      <SelectItem value="vote_3x">Vote counts as 3x (Triple Vote)</SelectItem>
                                      <SelectItem value="vote_0x">Vote counts as 0x (Silenced)</SelectItem>
                                      <SelectItem value="bulletproof">Bulletproof (Immune to Kills)</SelectItem>
                                      <SelectItem value="extra_action">Grants Extra Action Charge</SelectItem>
                                      <SelectItem value="custom">Custom Effect / Text...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {act.conditionType === "phase_gte" && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[11px] text-muted-foreground">Target Phase Number:</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={act.conditionValue || "5"}
                                    onChange={(e) => {
                                      const updated = [...newRoleActions];
                                      updated[index].conditionValue = e.target.value;
                                      setNewRoleActions(updated);
                                    }}
                                    className="h-6 w-16 text-center font-mono text-xs bg-background"
                                  />
                                  <span className="text-[11px] text-muted-foreground">(e.g. Day 5 or later)</span>
                                </div>
                              )}

                              {(act.conditionType === "custom" || act.conditionEffect === "custom") && (
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Custom Condition Description</label>
                                  <Input
                                    placeholder="e.g. If target dies, gains 1-shot bulletproof; or If investigated guilty, switches alignment..."
                                    value={act.conditionCustomText || ""}
                                    onChange={(e) => {
                                      const updated = [...newRoleActions];
                                      updated[index].conditionCustomText = e.target.value;
                                      setNewRoleActions(updated);
                                    }}
                                    className="h-7 text-xs bg-background font-mono"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium">Ability Description</label>
                <Textarea
                  placeholder="Describe the role's powers, win condition, and restrictions..."
                  rows={2}
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddRoleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newRoleName.trim()} size="sm">
                Save Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {editingRole && (
            <form onSubmit={handleSaveEditRole}>
              <DialogHeader>
                <DialogTitle>Edit Role: {editingRole.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Modify the role name, alignment, actions, phase timing, host actions, conditions, and usage limits.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium">Role Name *</label>
                    <Input
                      placeholder="Role Name"
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium">Faction / Alignment</label>
                    <Select value={editRoleFactionId} onValueChange={(val) => setEditRoleFactionId(val || "")}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Select Faction..." />
                      </SelectTrigger>
                      <SelectContent>
                        {factions.map((f: any) => (
                          <SelectItem key={f.id} value={f.name}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Edit Actions List */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Role Actions & Abilities ({editRoleActions.length})</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditRoleActions([
                          ...editRoleActions,
                          { id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, name: "", type: "kill", customType: "", timing: "night", hasLimit: false, maxUses: 1, isHostAction: false, hostInstructions: "", hasCondition: false },
                        ])
                      }
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Action
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {editRoleActions.map((act, index) => (
                      <div key={act.id} className="p-3 rounded-lg border bg-muted/20 space-y-2 relative">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Action Name / Label</label>
                            <Input
                              placeholder="e.g. Protect, Shoot"
                              value={act.name}
                              onChange={(e) => {
                                const updated = [...editRoleActions];
                                updated[index].name = e.target.value;
                                setEditRoleActions(updated);
                              }}
                              className="h-8 text-xs bg-background"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Action Type</label>
                            <Select
                              value={act.type}
                              onValueChange={(val) => {
                                const updated = [...editRoleActions];
                                updated[index].type = val || "none";
                                setEditRoleActions(updated);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (Passive)</SelectItem>
                                <SelectItem value="kill">Kill (Attack)</SelectItem>
                                <SelectItem value="protect">Protect (Defense)</SelectItem>
                                <SelectItem value="investigate">Investigate (Check)</SelectItem>
                                <SelectItem value="block">Block (Roleblock)</SelectItem>
                                <SelectItem value="track">Track (Visit Tracker)</SelectItem>
                                <SelectItem value="watch">Watch (Visitor Watcher)</SelectItem>
                                <SelectItem value="custom">Custom Action Type...</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Phase / Timing</label>
                            <Select
                              value={act.timing || "night"}
                              onValueChange={(val: any) => {
                                const updated = [...editRoleActions];
                                updated[index].timing = val;
                                setEditRoleActions(updated);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="night">🌙 Night Only</SelectItem>
                                <SelectItem value="day">☀️ Day Only</SelectItem>
                                <SelectItem value="any">✨ Any Phase (Day/Night)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {act.type === "custom" && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">Custom Type Identifier</label>
                            <Input
                              placeholder="e.g. Poison, Silence, Redirect"
                              value={act.customType || ""}
                              onChange={(e) => {
                                const updated = [...editRoleActions];
                                updated[index].customType = e.target.value;
                                setEditRoleActions(updated);
                              }}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        )}

                        {act.type !== "none" && (
                          <div className="space-y-2 pt-1 border-t border-border/40">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                              {/* Shot Limit Checkbox & Input */}
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={act.hasLimit}
                                    onChange={(e) => {
                                      const updated = [...editRoleActions];
                                      updated[index].hasLimit = e.target.checked;
                                      setEditRoleActions(updated);
                                    }}
                                    className="rounded border-border"
                                  />
                                  <span>Limit shots/charges</span>
                                </label>

                                {act.hasLimit && (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={act.maxUses || 1}
                                      onChange={(e) => {
                                        const updated = [...editRoleActions];
                                        updated[index].maxUses = parseInt(e.target.value, 10) || 1;
                                        setEditRoleActions(updated);
                                      }}
                                      className="h-6 w-14 text-center font-mono text-xs bg-background"
                                    />
                                    <span className="text-[11px] text-muted-foreground">uses</span>
                                  </div>
                                )}
                              </div>

                              {/* Host Action Checkbox */}
                              <label className="flex items-center gap-1.5 cursor-pointer text-amber-500 font-medium select-none">
                                <input
                                  type="checkbox"
                                  checked={act.isHostAction}
                                  onChange={(e) => {
                                    const updated = [...editRoleActions];
                                    updated[index].isHostAction = e.target.checked;
                                    setEditRoleActions(updated);
                                  }}
                                  className="rounded border-amber-500/50"
                                />
                                <span>Requires Host Action</span>
                              </label>

                              {/* Condition / Modifier Checkbox */}
                              <label className="flex items-center gap-1.5 cursor-pointer text-indigo-400 font-medium select-none">
                                <input
                                  type="checkbox"
                                  checked={act.hasCondition}
                                  onChange={(e) => {
                                    const updated = [...editRoleActions];
                                    updated[index].hasCondition = e.target.checked;
                                    if (e.target.checked && !updated[index].conditionType) {
                                      updated[index].conditionType = "phase_gte";
                                      updated[index].conditionValue = "5";
                                      updated[index].conditionEffect = "vote_2x";
                                    }
                                    setEditRoleActions(updated);
                                  }}
                                  className="rounded border-indigo-500/50"
                                />
                                <span>⚡ If-Condition</span>
                              </label>

                              {editRoleActions.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditRoleActions(editRoleActions.filter((_, i) => i !== index));
                                  }}
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>

                            {/* Host Action Instructions Input */}
                            {act.isHostAction && (
                              <div className="space-y-1 bg-amber-500/5 border border-amber-500/20 p-2 rounded-md">
                                <label className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                                  <span>Host Action Instructions / Notes</span>
                                </label>
                                <Input
                                  placeholder="e.g. Anything the host needs to do (RNG check, secret PM, manual condition, item distribution, etc.)..."
                                  value={act.hostInstructions || ""}
                                  onChange={(e) => {
                                    const updated = [...editRoleActions];
                                    updated[index].hostInstructions = e.target.value;
                                    setEditRoleActions(updated);
                                  }}
                                  className="h-7 text-xs bg-background border-amber-500/30 font-mono"
                                />
                              </div>
                            )}

                            {/* Condition Builder Inputs */}
                            {act.hasCondition && (
                              <div className="space-y-2 bg-indigo-500/5 border border-indigo-500/25 p-2.5 rounded-md">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-400">
                                  <span>⚡ Conditional Modifier (IF ➔ THEN)</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-semibold text-muted-foreground">IF (Trigger)</label>
                                    <Select
                                      value={act.conditionType || "phase_gte"}
                                      onValueChange={(val: any) => {
                                        const updated = [...editRoleActions];
                                        updated[index].conditionType = val;
                                        setEditRoleActions(updated);
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="phase_gte">Phase reaches (e.g. Day 5+)</SelectItem>
                                        <SelectItem value="odd_phases">Odd Phases (1, 3, 5...)</SelectItem>
                                        <SelectItem value="even_phases">Even Phases (2, 4, 6...)</SelectItem>
                                        <SelectItem value="phase_1">Phase 1 Only</SelectItem>
                                        <SelectItem value="custom">Custom Condition...</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-semibold text-muted-foreground">THEN (Effect)</label>
                                    <Select
                                      value={act.conditionEffect || "vote_2x"}
                                      onValueChange={(val: any) => {
                                        const updated = [...editRoleActions];
                                        updated[index].conditionEffect = val;
                                        setEditRoleActions(updated);
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="vote_2x">Vote counts as 2x (Double Vote)</SelectItem>
                                        <SelectItem value="vote_3x">Vote counts as 3x (Triple Vote)</SelectItem>
                                        <SelectItem value="vote_0x">Vote counts as 0x (Silenced)</SelectItem>
                                        <SelectItem value="bulletproof">Bulletproof (Immune to Kills)</SelectItem>
                                        <SelectItem value="extra_action">Grants Extra Action Charge</SelectItem>
                                        <SelectItem value="custom">Custom Effect / Text...</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {act.conditionType === "phase_gte" && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[11px] text-muted-foreground">Target Phase Number:</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={act.conditionValue || "5"}
                                      onChange={(e) => {
                                        const updated = [...editRoleActions];
                                        updated[index].conditionValue = e.target.value;
                                        setEditRoleActions(updated);
                                      }}
                                      className="h-6 w-16 text-center font-mono text-xs bg-background"
                                    />
                                    <span className="text-[11px] text-muted-foreground">(e.g. Day 5 or later)</span>
                                  </div>
                                )}

                                {(act.conditionType === "custom" || act.conditionEffect === "custom") && (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-muted-foreground">Custom Condition Description</label>
                                    <Input
                                      placeholder="e.g. If target dies, gains 1-shot bulletproof; or If investigated guilty, switches alignment..."
                                      value={act.conditionCustomText || ""}
                                      onChange={(e) => {
                                        const updated = [...editRoleActions];
                                        updated[index].conditionCustomText = e.target.value;
                                        setEditRoleActions(updated);
                                      }}
                                      className="h-7 text-xs bg-background font-mono"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium">Ability Description</label>
                  <Textarea
                    placeholder="Describe role abilities and constraints..."
                    rows={2}
                    value={editRoleDescription}
                    onChange={(e) => setEditRoleDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editRoleName.trim()} size="sm">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
