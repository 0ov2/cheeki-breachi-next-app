// pages/index.tsx
"use client" // Add this line at the top

import { getCache, setCache } from "@/libs/cache"
import { getBreacherPlayerDetails, getPlayerNames } from "../libs/fetchFunction"
import { useEffect, useState } from "react"

interface PlayerDetails {
  rank: string
  playerName: string
  kd: string
}

async function getFilteredPlayerDetails(): Promise<{ playerName: string; id: string }[]> {
  //
  //  Get the player names for Cheeki Breachi, we can use the public VRML API to get this information 
  const playerNames = await getPlayerNames()
  //
  //  Now get some player details which we can use to get more specific information later on
  const playerDetailsPromises = playerNames.map(async (playerName: any) => {
    const details = await getBreacherPlayerDetails(playerName)
    if (details) {
      return { playerName: playerName, id: details.id }
    }
    return null
  })

  const playerDetails = await Promise.all(playerDetailsPromises)
  return playerDetails.filter((details: any): details is { playerName: string; id: string } => details !== null)
}

const fetchPlayerData = async (playerId: string, playerName: string): Promise<PlayerDetails | null> => {
  const TTL = 1000 * 60 * 60; // 60 minutes

  //
  //  First check if we have cached data for this player and return the data if we do
  const cacheKey = `breacherPlayerData_${playerName}`;
  const cachedPlayer = getCache<PlayerDetails | null>(cacheKey);
  if (cachedPlayer) {
    return cachedPlayer;
  }

  //
  //  If there is no cached data, then fetch it via AWS Lambda
  const response = await fetch(
    `https://3jwycoqrz6q74c3mdk2de6md6y0bhbgq.lambda-url.eu-west-2.on.aws/?playerID=${playerId}`,
    {
      cache: "force-cache",
    }
  );

  //
  //  Throw an error if we can rate-limited
  if (response.status === 429) {
    throw new Error("Rate limit exceeded");
  }
  //
  //  Process the data got from the response 
  const playerData = await response.json();
  const playerKD = await calculateKillDeathRatio(playerData);
  const playerRank = getPlayerRank(playerData);
  const playerDetails = {
    rank: playerRank,
    playerName: playerName,
    kd: playerKD.toString(),
  };

  //
  //  Set the cache for next time
  setCache(cacheKey, playerDetails, TTL);
  //
  //  Return the data for next steps
  return playerDetails;
};

function getPlayerRank(data: any) {
  try {
    return data.rank
  } catch (error) {
    console.error("Error getting the player rank:", error)
  }
}

async function calculateKillDeathRatio(data: any): Promise<number> {
  try {
    const weapons = data.statistics.Weapons
    let totalKills = 0
    for (const weapon in weapons) {
      if (weapons.hasOwnProperty(weapon)) {
        totalKills += weapons[weapon].Kills
      }
    }

    const totalDeaths = data.statistics.Deaths

    if (totalDeaths === 0) {
      return totalKills
    }

    let shiftedNum = Math.floor((totalKills / totalDeaths) * 100)
    return shiftedNum / 100
  } catch (error) {
    console.error("Error calculating K/D ratio:", error)
    return 0
  }
}

const playerRow = (playerStats: PlayerDetails, index: number) => {
  return (
    <div key={index} className="player-row w-full flex justify-between items-center">
      <div className="min-w-[144px] flex items-center">
        <span>{playerStats.playerName}</span>
      </div>
      <div className="min-w-[144px] flex items-center">
        <span>{playerStats.rank}</span>
      </div>
      <div className="min-w-[144px] flex items-center">
        <span>{playerStats.kd}</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState<PlayerDetails[]>([])
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leaderboardValues = await getFilteredPlayerDetails();
        const statsPromises = leaderboardValues.map(async (leaderboardValue, index) => {
          //
          // Adding delay to avoid rate limit, can adjust this value 
          await new Promise((resolve) => setTimeout(resolve, index * 500));
          return fetchPlayerData(leaderboardValue.id, leaderboardValue.playerName);
        });
        //
        //  Ensure all requests are waited for
        const stats = await Promise.all(statsPromises);

        //
        //  Update our state with the players data
        setStats(stats.filter((stat): stat is PlayerDetails => stat !== null));
      } catch (err) {
        setError(err);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-[2rem] sm:p-[4rem] md:p-[6rem]">
      <div className="content-container w-full">
        <div className="content-header w-full flex justify-center">
          <h1 className="text-[25px] sm:text-[30px]">Cheeki Tracker</h1>
        </div>
        <div className="leaderboard-container">{stats.map((stat, index) => playerRow(stat, index))}</div>
      </div>
    </main>
  )
}
