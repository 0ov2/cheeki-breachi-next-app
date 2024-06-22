// pages/index.tsx
"use client" // Add this line at the top

import { getBreacherPlayerDetails, getPlayerNames } from "../libs/fetchFunction"
import { useEffect, useState } from "react"

interface PlayerDetails {
  rank: string
  playerName: string
  kd: string
}

async function getFilteredPlayerDetails(): Promise<{ playerName: string; id: string }[]> {
  const playerNames = await getPlayerNames()
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

async function getPlayerData(playerId: string, playerName: string): Promise<PlayerDetails | null> {
  const response = await fetch(`https://breacherstracker.com/api/players/${playerId}?mode=competitive`, {
    cache: "force-cache",
  })
  const playerData = await response.json()
  const playerKD = await calculateKillDeathRatio(playerData)
  const playerRank = getPlayerRank(playerData)
  return {
    rank: playerRank,
    playerName: playerName,
    kd: playerKD.toString(),
  }
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

    let shiftedNum = Math.floor((totalKills / totalDeaths) * 100)
    return shiftedNum / 100
  } catch (error) {
    console.error("Error calculating K/D ratio:", error)
    return 0
  }
}

const playerRow = (playerStats: PlayerDetails, index: number) => {
  return (
    <div className="player-row w-full flex justify-between items-center">
      <div className="min-w-[144px] flex justify-center items-center">
        <span>{playerStats.playerName}</span>
      </div>
      <div className="min-w-[144px] flex justify-center items-center">
        <span>{playerStats.rank}</span>
      </div>
      <div className="min-w-[144px] flex justify-center items-center">
        <span>{playerStats.kd}</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState<PlayerDetails[]>([])

  useEffect(() => {
    async function fetchData() {
      const leaderboardValues = await getFilteredPlayerDetails()
      const statsPromises = leaderboardValues.map(leaderboardValue =>
        getPlayerData(leaderboardValue.id, leaderboardValue.playerName)
      )
      const stats = await Promise.all(statsPromises)
      setStats(stats.filter((stat): stat is PlayerDetails => stat !== null))
    }

    fetchData()
  }, [])

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
