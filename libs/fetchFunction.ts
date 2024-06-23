// fetchFunctions.ts
import { setCache, getCache } from './cache';

interface Player {
  playerName: string;
}

interface Team {
  team: {
    players: Player[];
  };
}

interface BreacherPlayer {
  id: string;
  playerName: string;
  clan_tag: string;
}

interface PlayerDetails {
  rank: string;
  playerName: string;
  kd: string;
}

const TTL = 1000 * 60 * 60; // 60 minutes

export async function getPlayerNames(): Promise<string[]> {
  const cacheKey = "playerNames";
  const cachedPlayerNames = getCache<string[]>(cacheKey);
  if (cachedPlayerNames) return cachedPlayerNames;

  try {
    const response = await fetch("https://api.vrmasterleague.com/Teams/yajg_EC-gHj7I67wy7E5fA2", {
      cache: "force-cache",
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const team: Team = await response.json();
    const playerNames = team.team.players.map(player => player.playerName);
    setCache(cacheKey, playerNames, TTL);
    return playerNames;
  } catch (error) {
    console.error("Error fetching player names:", error);
    return [];
  }
}

export async function getBreacherPlayerDetails(playerName: string): Promise<BreacherPlayer | null> {
  const cacheKey = `breacherPlayer_${playerName}`;
  const cachedPlayer = getCache<BreacherPlayer | null>(cacheKey);
  if (cachedPlayer !== null) return cachedPlayer;

  try {
    console.log(`Fetching details for player: ${playerName}`);
    const response = await fetch(`/api?playerName=${playerName}`, {
      cache: "force-cache",
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok for player ${playerName}`);
    }
    const data = await response.json();
    const filteredPlayer = data.users.find((player: BreacherPlayer) => player.clan_tag === "CHBR");
    setCache(cacheKey, filteredPlayer || null, TTL);
    return filteredPlayer || null;
  } catch (error) {
    console.error(`Error fetching details for player ${playerName}:`, error);
    return null;
  }
}

