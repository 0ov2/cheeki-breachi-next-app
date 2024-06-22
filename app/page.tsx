import Image from "next/image"

interface Player {
  playerName: string
}

interface Team {
  team: {
    players: Player[]
  }
}

interface BreacherPlayer {
  id: string
  playerName: string
  clan_tag: string
}

interface playerDetails {
  rank: string
  playerName: string
  kd: string
}

const playerCache: { [key: string]: BreacherPlayer | null } = {}

async function getPlayerNames(): Promise<string[]> {
  try {
    const response = await fetch("https://api.vrmasterleague.com/Teams/yajg_EC-gHj7I67wy7E5fA2", {
      cache: "force-cache",
    })
    if (!response.ok) {
      throw new Error("Network response was not ok")
    }
    const team: Team = await response.json()
    const playerNames = team.team.players.map(player => player.playerName)
    return playerNames
  } catch (error) {
    console.error("Error fetching player names:", error)
    return []
  }
}

async function getBreacherPlayerDetails(playerName: string): Promise<BreacherPlayer | null> {
  if (playerCache[playerName] !== undefined) {
    return playerCache[playerName]
  }

  try {
    const response = await fetch(`https://breacherstracker.com/api/players/search/${playerName}`, {
      cache: "force-cache",
    })
    if (!response.ok) {
      throw new Error(`Network response was not ok for player ${playerName}`)
    }
    const data = await response.json()
    const filteredPlayer = data.users.find((player: BreacherPlayer) => player.clan_tag === "CHBR")
    playerCache[playerName] = filteredPlayer || null
    return filteredPlayer || null
  } catch (error) {
    console.error(`Error fetching details for player ${playerName}:`, error)
    return null
  }
}

async function getFilteredPlayerDetails(): Promise<{ playerName: string; id: string }[]> {
  const playerNames = await getPlayerNames()
  const playerDetailsPromises = playerNames.map(async playerName => {
    const details = await getBreacherPlayerDetails(playerName)
    if (details) {
      return { playerName: playerName, id: details.id }
    }
    return null
  })

  const playerDetails = await Promise.all(playerDetailsPromises)
  return playerDetails.filter((details): details is { playerName: string; id: string } => details !== null)
}

async function getPlayerData(playerId: string): Promise<playerDetails | null> {
  // https://breacherstracker.com/api/players/db1367aa-ecb8-6ed3-dfba-79fd1edbec9b
  const response = await fetch(`https://breacherstracker.com/api/players/${playerId}`, { cache: "force-cache" })
  const playerData = await response.json()
  console.log(playerData)

  return null
}

export default async function Home() {
  const leaderboardValues = await getFilteredPlayerDetails()
  const stats = await getPlayerData(leaderboardValues[0].id)
  console.log(stats);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-[2rem] sm:p-[4rem] md:p-[6rem]">
      <div className="content-container">
        <div className="content-header w-full">
          <h1 className="text-[25px] sm:text-[30px]">Cheeki Tracker</h1>
        </div>
        <div className="leaderboard-container"></div>
      </div>
    </main>
  )
}
