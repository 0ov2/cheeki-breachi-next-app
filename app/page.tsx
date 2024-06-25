// pages/index.tsx
"use client" // Add this line at the top

import { getCache, setCache } from "@/libs/cache"
import { getBreacherPlayerDetails, getPlayerNames } from "../libs/fetchFunction"
import { useEffect, useState } from "react"

import CircularProgress from "@mui/material/CircularProgress"
import { styled } from "@mui/system"
interface PlayerDetails {
  rank: string
  playerName: string
  breachersTrackerID: string
  kd: string
  dateInserted?: Date
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
  const TTL = 1000 * 60 * 60 // 60 minutes

  //
  //  First check if we have cached data for this player and return the data if we do
  const cacheKey = `breacherPlayerData_${playerName}`
  const cachedPlayer = getCache<PlayerDetails | null>(cacheKey)
  if (cachedPlayer) {
    return cachedPlayer
  }

  //
  //  If there is no cached data, then fetch it via AWS Lambda
  const response = await fetch(
    `https://3jwycoqrz6q74c3mdk2de6md6y0bhbgq.lambda-url.eu-west-2.on.aws/?playerID=${playerId}`,
    {
      cache: "force-cache",
    }
  )

  //
  //  Throw an error if we can rate-limited
  if (response.status === 429) {
    throw new Error("Rate limit exceeded")
  }
  //
  //  Process the data got from the response
  const playerData = await response.json()
  const playerKD = await calculateKillDeathRatio(playerData)
  const playerRank = getPlayerRank(playerData)
  const playerDetails = {
    rank: playerRank,
    breachersTrackerID: playerId,
    playerName: playerName,
    kd: playerKD.toString(),
  }

  //
  //  Set the cache for next time
  setCache(cacheKey, playerDetails, TTL)
  //
  //  Return the data for next steps
  return playerDetails
}

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
    const kdRatio = totalKills / totalDeaths;

    return Math.round((kdRatio + Number.EPSILON) * 100) / 100;
  } catch (error) {
    console.error("Error calculating K/D ratio:", error)
    return 0
  }
}

const playerRow = (playerStats: PlayerDetails, index: number) => {
  return (
    <div key={index} className="flex justify-between items-center p-4 border-b border-gray-200">
      <div className="flex items-center">
        <div className="text-lg font-semibold text-[#a9b9d4]">
          <a
            href={`https://breacherstracker.com/profile/${playerStats.breachersTrackerID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <p>{playerStats.playerName}</p>
          </a>
        </div>
      </div>
      <div className="flex items-center space-x-8">
        <div className="text-[#a9b9d4]">{playerStats.rank}</div>
        <div className="text-[#a9b9d4]">{playerStats.kd}</div>
      </div>
    </div>
  )
}

const LoadingContainer = styled("div")({
  width: "100%",
  textAlign: "center",
  padding: "1rem",
})

export default function Home() {
  const [stats, setStats] = useState<PlayerDetails[]>([])
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const leaderboardValues = await getFilteredPlayerDetails()
        const statsPromises = leaderboardValues.map(async (leaderboardValue, index) => {
          //
          // Adding delay to avoid rate limit, can adjust this value
          await new Promise(resolve => setTimeout(resolve, index * 500))
          return fetchPlayerData(leaderboardValue.id, leaderboardValue.playerName)
        })
        //
        //  Ensure all requests are waited for
        const stats = await Promise.all(statsPromises)

        //
        //  Update our state with the players data
        setStats(stats.filter((stat): stat is PlayerDetails => stat !== null))
        setLoading(false)
      } catch (err) {
        setError(err)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-[#40537a] text-white">
      <div className="content-container w-full max-w-3xl">
        <div className="content-header w-full flex justify-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Cheeki Tracker</h1>
        </div>
        {loading ? (
          <LoadingContainer>
            <CircularProgress color="secondary" />
          </LoadingContainer>
        ) : null}
        <div
          className={`leaderboard-container bg-gray-800 rounded-lg shadow-lg transition-all duration-500 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
        >
          {!loading ? (
            <div className="leaderboard-content">{stats.map((stat, index) => playerRow(stat, index))}</div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
