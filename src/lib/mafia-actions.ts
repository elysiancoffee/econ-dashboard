"use server";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// Auto-create Mafia tables if not already existing
let tablesInitialized = false;
async function ensureMafiaTables() {
  if (tablesInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mafia_games" (
        "id" text PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "status" text DEFAULT 'setup' NOT NULL,
        "current_phase" text DEFAULT 'Day' NOT NULL,
        "phase_number" integer DEFAULT 1 NOT NULL,
        "deadline" text,
        "settings" jsonb DEFAULT '{}' NOT NULL,
        "created_at" text NOT NULL,
        "created_by" text DEFAULT 'Boss' NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "mafia_factions" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "name" text NOT NULL,
        "color" text DEFAULT '#ef4444' NOT NULL,
        "is_evil" boolean DEFAULT false NOT NULL,
        "win_condition" text
      );
      CREATE TABLE IF NOT EXISTS "mafia_roles" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "faction_id" text,
        "name" text NOT NULL,
        "alignment" text DEFAULT 'Town' NOT NULL,
        "priority" integer DEFAULT 3 NOT NULL,
        "ability_description" text,
        "night_action_type" text DEFAULT 'none' NOT NULL,
        "max_uses" integer
      );
      ALTER TABLE "mafia_roles" ADD COLUMN IF NOT EXISTS "max_uses" integer;
      ALTER TABLE "mafia_roles" ADD COLUMN IF NOT EXISTS "actions_config" jsonb DEFAULT '[]';
      CREATE TABLE IF NOT EXISTS "mafia_players" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "username" text NOT NULL,
        "role_id" text,
        "is_alive" boolean DEFAULT true NOT NULL,
        "death_phase" text,
        "death_cause" text,
        "claimed_role" text,
        "notes" text
      );
      CREATE TABLE IF NOT EXISTS "mafia_actions" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "phase" text DEFAULT 'Night' NOT NULL,
        "phase_number" integer DEFAULT 1 NOT NULL,
        "source_player_id" text NOT NULL,
        "action_config_id" text,
        "target_player_id" text,
        "action_type" text NOT NULL,
        "result" text,
        "is_resolved" boolean DEFAULT false NOT NULL,
        "notes" text
      );
      ALTER TABLE "mafia_actions" ADD COLUMN IF NOT EXISTS "action_config_id" text;
      CREATE TABLE IF NOT EXISTS "mafia_votes" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "phase_number" integer DEFAULT 1 NOT NULL,
        "voter_player_id" text NOT NULL,
        "target_player_id" text,
        "timestamp" text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "mafia_phase_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "game_id" text NOT NULL,
        "phase" text NOT NULL,
        "phase_number" integer NOT NULL,
        "summary" text NOT NULL,
        "created_at" text NOT NULL
      );
    `);
    tablesInitialized = true;
  } catch (err) {
    console.warn("Error ensuring mafia tables:", err);
  }
}

// -------------------------------------------------------------
// GAME CRUD
// -------------------------------------------------------------

export async function fetchAllMafiaGames() {
  await ensureMafiaTables();
  try {
    const games = await db.select().from(schema.mafiaGames).orderBy(desc(schema.mafiaGames.createdAt));
    return games;
  } catch (err) {
    console.error("Failed to fetch mafia games:", err);
    return [];
  }
}

export async function fetchMafiaGameDetails(gameId: string) {
  await ensureMafiaTables();
  try {
    const [gameRows, factions, roles, players, actions, votes, logs] = await Promise.all([
      db.select().from(schema.mafiaGames).where(eq(schema.mafiaGames.id, gameId)).limit(1),
      db.select().from(schema.mafiaFactions).where(eq(schema.mafiaFactions.gameId, gameId)),
      db.select().from(schema.mafiaRoles).where(eq(schema.mafiaRoles.gameId, gameId)),
      db.select().from(schema.mafiaPlayers).where(eq(schema.mafiaPlayers.gameId, gameId)),
      db.select().from(schema.mafiaActions).where(eq(schema.mafiaActions.gameId, gameId)),
      db.select().from(schema.mafiaVotes).where(eq(schema.mafiaVotes.gameId, gameId)),
      db.select().from(schema.mafiaPhaseLogs).where(eq(schema.mafiaPhaseLogs.gameId, gameId)).orderBy(desc(schema.mafiaPhaseLogs.createdAt)),
    ]);

    if (gameRows.length === 0) return null;

    return {
      game: gameRows[0],
      factions,
      roles,
      players,
      actions,
      votes,
      logs,
    };
  } catch (err) {
    console.error("Failed to fetch game details:", err);
    return null;
  }
}

export async function createMafiaGame(
  title: string,
  description = "",
  createdBy = "Boss",
  startingPhase = "Night",
  startingPhaseNumber = 1
) {
  await ensureMafiaTables();
  const gameId = `mg-${Date.now()}`;
  const now = new Date().toISOString();

  // Create Game
  await db.insert(schema.mafiaGames).values({
    id: gameId,
    title: title.trim() || "Untitled Mafia Game",
    description: description.trim(),
    status: "setup",
    currentPhase: startingPhase,
    phaseNumber: startingPhaseNumber,
    settings: {},
    createdAt: now,
    createdBy,
  });

  // Seed Default Factions
  const townFactionId = `f-town-${Date.now()}`;
  const mafiaFactionId = `f-mafia-${Date.now()}`;
  const neutralFactionId = `f-neutral-${Date.now()}`;

  await db.insert(schema.mafiaFactions).values([
    {
      id: townFactionId,
      gameId,
      name: "Town",
      color: "#10b981", // Emerald
      isEvil: false,
      winCondition: "Eliminate all Mafia members and hostile third-party roles.",
    },
    {
      id: mafiaFactionId,
      gameId,
      name: "Mafia",
      color: "#ef4444", // Red
      isEvil: true,
      winCondition: "Achieve parity with or outnumber all living Town members.",
    },
    {
      id: neutralFactionId,
      gameId,
      name: "Third-Party",
      color: "#a855f7", // Purple
      isEvil: false,
      winCondition: "Fulfill individual personal win conditions.",
    },
  ]);

  return gameId;
}

export async function updateMafiaGame(gameId: string, updates: Partial<{
  title: string;
  description: string;
  status: string;
  currentPhase: string;
  phaseNumber: number;
  deadline: string | null;
  settings: any;
}>) {
  await ensureMafiaTables();
  await db.update(schema.mafiaGames).set(updates).where(eq(schema.mafiaGames.id, gameId));
}

export async function setMafiaGamePhase(gameId: string, phase: string, phaseNumber: number) {
  await ensureMafiaTables();
  await db.update(schema.mafiaGames).set({
    currentPhase: phase,
    phaseNumber: Math.max(0, phaseNumber),
  }).where(eq(schema.mafiaGames.id, gameId));
}

export async function deleteMafiaGame(gameId: string) {
  await ensureMafiaTables();
  await Promise.all([
    db.delete(schema.mafiaGames).where(eq(schema.mafiaGames.id, gameId)),
    db.delete(schema.mafiaFactions).where(eq(schema.mafiaFactions.gameId, gameId)),
    db.delete(schema.mafiaRoles).where(eq(schema.mafiaRoles.gameId, gameId)),
    db.delete(schema.mafiaPlayers).where(eq(schema.mafiaPlayers.gameId, gameId)),
    db.delete(schema.mafiaActions).where(eq(schema.mafiaActions.gameId, gameId)),
    db.delete(schema.mafiaVotes).where(eq(schema.mafiaVotes.gameId, gameId)),
    db.delete(schema.mafiaPhaseLogs).where(eq(schema.mafiaPhaseLogs.gameId, gameId)),
  ]);
}

// -------------------------------------------------------------
// PHASE ADVANCEMENT & TIMELINE
// -------------------------------------------------------------

export async function advanceGamePhase(
  gameId: string,
  summary = "",
  customNextPhase?: string,
  customNextNumber?: number
) {
  await ensureMafiaTables();
  const gameRows = await db.select().from(schema.mafiaGames).where(eq(schema.mafiaGames.id, gameId)).limit(1);
  if (gameRows.length === 0) return;

  const game = gameRows[0];
  const prevPhase = game.currentPhase;
  const prevNumber = game.phaseNumber;

  let nextPhase = customNextPhase || (prevPhase === "Day" ? "Night" : "Day");
  let nextNumber = typeof customNextNumber === "number"
    ? customNextNumber
    : prevPhase === "Night"
      ? prevNumber + 1
      : prevNumber;

  // Log phase transition summary if provided
  if (summary.trim()) {
    await db.insert(schema.mafiaPhaseLogs).values({
      id: `log-${Date.now()}`,
      gameId,
      phase: prevPhase,
      phaseNumber: prevNumber,
      summary: summary.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  // Update Game Phase
  await db.update(schema.mafiaGames).set({
    currentPhase: nextPhase,
    phaseNumber: nextNumber,
    status: "in_progress",
  }).where(eq(schema.mafiaGames.id, gameId));
}

// -------------------------------------------------------------
// PLAYERS & ROSTER
// -------------------------------------------------------------

export async function addMafiaPlayers(gameId: string, usernames: string[]) {
  await ensureMafiaTables();
  const cleanNames = usernames
    .map((u) => u.trim())
    .filter(Boolean);

  if (cleanNames.length === 0) return;

  const newPlayers = cleanNames.map((name, idx) => ({
    id: `mp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    gameId,
    username: name,
    roleId: null,
    isAlive: true,
    deathPhase: null,
    deathCause: null,
    claimedRole: null,
    notes: "",
  }));

  await db.insert(schema.mafiaPlayers).values(newPlayers);
}

export async function updateMafiaPlayer(playerId: string, updates: Partial<{
  username: string;
  roleId: string | null;
  isAlive: boolean;
  deathPhase: string | null;
  deathCause: string | null;
  claimedRole: string | null;
  notes: string | null;
}>) {
  await ensureMafiaTables();
  await db.update(schema.mafiaPlayers).set(updates).where(eq(schema.mafiaPlayers.id, playerId));
}

export async function deleteMafiaPlayer(playerId: string) {
  await ensureMafiaTables();
  await db.delete(schema.mafiaPlayers).where(eq(schema.mafiaPlayers.id, playerId));
}

// -------------------------------------------------------------
// FACTIONS & ROLES
// -------------------------------------------------------------

export async function addMafiaFaction(gameId: string, faction: {
  name: string;
  color: string;
  isEvil: boolean;
  winCondition?: string;
}) {
  await ensureMafiaTables();
  const id = `f-${Date.now()}`;
  await db.insert(schema.mafiaFactions).values({
    id,
    gameId,
    name: faction.name,
    color: faction.color || "#ef4444",
    isEvil: !!faction.isEvil,
    winCondition: faction.winCondition || "",
  });
  return id;
}

export async function updateMafiaFaction(factionId: string, updates: Partial<{
  name: string;
  color: string;
  isEvil: boolean;
  winCondition: string;
}>) {
  await ensureMafiaTables();
  await db.update(schema.mafiaFactions).set(updates).where(eq(schema.mafiaFactions.id, factionId));
}

export async function deleteMafiaFaction(factionId: string) {
  await ensureMafiaTables();
  await db.delete(schema.mafiaFactions).where(eq(schema.mafiaFactions.id, factionId));
}

export async function addMafiaRole(gameId: string, role: {
  factionId?: string | null;
  name: string;
  alignment: string;
  priority?: number;
  abilityDescription?: string;
  nightActionType?: string;
  maxUses?: number | null;
  actionsConfig?: any[];
}) {
  await ensureMafiaTables();
  const id = `r-${Date.now()}`;
  await db.insert(schema.mafiaRoles).values({
    id,
    gameId,
    factionId: role.factionId || null,
    name: role.name,
    alignment: role.alignment || "Town",
    priority: typeof role.priority === "number" ? role.priority : 3,
    abilityDescription: role.abilityDescription || "",
    nightActionType: role.nightActionType || "none",
    maxUses: typeof role.maxUses === "number" ? role.maxUses : null,
    actionsConfig: role.actionsConfig || [],
  });
  return id;
}

export async function updateMafiaRole(roleId: string, updates: Partial<{
  factionId: string | null;
  name: string;
  alignment: string;
  priority: number;
  abilityDescription: string;
  nightActionType: string;
  maxUses: number | null;
  actionsConfig: any[];
}>) {
  await ensureMafiaTables();
  await db.update(schema.mafiaRoles).set(updates).where(eq(schema.mafiaRoles.id, roleId));
}

export async function deleteMafiaRole(roleId: string) {
  await ensureMafiaTables();
  await db.delete(schema.mafiaRoles).where(eq(schema.mafiaRoles.id, roleId));
}

// -------------------------------------------------------------
// NIGHT ACTIONS & RESOLUTION
// -------------------------------------------------------------

export async function saveMafiaAction(action: {
  id?: string;
  gameId: string;
  phase: string;
  phaseNumber: number;
  sourcePlayerId: string;
  actionConfigId?: string | null;
  targetPlayerId?: string | null;
  actionType: string;
  result?: string | null;
  isResolved?: boolean;
  notes?: string | null;
}) {
  await ensureMafiaTables();
  const id = action.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const conditions = [
    eq(schema.mafiaActions.gameId, action.gameId),
    eq(schema.mafiaActions.phase, action.phase),
    eq(schema.mafiaActions.phaseNumber, action.phaseNumber),
    eq(schema.mafiaActions.sourcePlayerId, action.sourcePlayerId),
  ];

  if (action.actionConfigId) {
    conditions.push(eq(schema.mafiaActions.actionConfigId, action.actionConfigId));
  }

  const existing = await db.select().from(schema.mafiaActions).where(and(...conditions)).limit(1);

  if (existing.length > 0) {
    await db.update(schema.mafiaActions).set({
      targetPlayerId: action.targetPlayerId || null,
      actionConfigId: action.actionConfigId || null,
      actionType: action.actionType,
      result: action.result || null,
      isResolved: !!action.isResolved,
      notes: action.notes || null,
    }).where(eq(schema.mafiaActions.id, existing[0].id));
    return existing[0].id;
  } else {
    await db.insert(schema.mafiaActions).values({
      id,
      gameId: action.gameId,
      phase: action.phase,
      phaseNumber: action.phaseNumber,
      sourcePlayerId: action.sourcePlayerId,
      actionConfigId: action.actionConfigId || null,
      targetPlayerId: action.targetPlayerId || null,
      actionType: action.actionType,
      result: action.result || null,
      isResolved: !!action.isResolved,
      notes: action.notes || null,
    });
    return id;
  }
}

export async function deleteMafiaAction(actionId: string) {
  await ensureMafiaTables();
  await db.delete(schema.mafiaActions).where(eq(schema.mafiaActions.id, actionId));
}

// -------------------------------------------------------------
// DAY VOTES & LYNCH TRACKING
// -------------------------------------------------------------

export async function castMafiaVote(gameId: string, phaseNumber: number, voterPlayerId: string, targetPlayerId: string | null) {
  await ensureMafiaTables();
  const id = `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Upsert voter's active vote for this day phase
  const existing = await db.select().from(schema.mafiaVotes).where(
    and(
      eq(schema.mafiaVotes.gameId, gameId),
      eq(schema.mafiaVotes.phaseNumber, phaseNumber),
      eq(schema.mafiaVotes.voterPlayerId, voterPlayerId)
    )
  ).limit(1);

  if (existing.length > 0) {
    await db.update(schema.mafiaVotes).set({
      targetPlayerId,
      timestamp: now,
    }).where(eq(schema.mafiaVotes.id, existing[0].id));
  } else {
    await db.insert(schema.mafiaVotes).values({
      id,
      gameId,
      phaseNumber,
      voterPlayerId,
      targetPlayerId,
      timestamp: now,
    });
  }
}

export async function resetDayVotes(gameId: string, phaseNumber: number) {
  await ensureMafiaTables();
  await db.delete(schema.mafiaVotes).where(
    and(
      eq(schema.mafiaVotes.gameId, gameId),
      eq(schema.mafiaVotes.phaseNumber, phaseNumber)
    )
  );
}
