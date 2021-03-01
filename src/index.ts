import fs from 'fs/promises'
import { EventSummary } from './EventSummary'
import { EnrichedMatch, MatchEntry, Shot } from './types'

const linkShotsWithMatches = async () => {
  const allMatches = JSON.parse(
    (await fs.readFile('./data/allMatches.json')).toString()
  ) as MatchEntry[]
  const allShots = JSON.parse((await fs.readFile('./data/allShots.json')).toString()) as Shot[]

  const matchMap = new Map(allMatches.map((m) => [m.MatchID, m]))
  const missingMatches = new Set()
  allShots.forEach((s) => {
    const match = matchMap.get(s.MatchID)

    if (!match) {
      missingMatches.add(s.MatchID)
    } else {
      const shots = (match.shots || []) as Shot[]
      shots.push(s)

      matchMap.set(s.MatchID, { ...match, shots })
    }
  })

  const matchesWithShots = [...matchMap.values()].filter((m: EnrichedMatch) => m.shots?.length > 0)

  await fs.writeFile('./data/matchesWithShots.json', JSON.stringify(matchesWithShots, null, 2))

  console.log(matchesWithShots.length, missingMatches.size)
}

const run = async () => {
  const matches = JSON.parse(
    (await fs.readFile('./data/matchesWithShots.json')).toString()
  ) as EnrichedMatch[]

  const summaries = matches.reduce((acc, match) => {
    const { home, away } = match.shots
      .sort((a, b) => {
        const aTime = parseFloat(`${a.EventMinute}.${a.EventSeconds}`)
        const bTime = parseFloat(`${b.EventMinute}.${b.EventSeconds}`)

        return aTime - bTime
      })
      .reduce(
        (acc, shot) => {
          const team = getTeam(shot) === 'HOME' ? acc.home : acc.away

          team.addShot(shot)

          const noGoals = acc.home.goals + acc.away.goals === 0
          const timeFilter = shot.EventMinute <= 60

          if (team.shouldBet && timeFilter && shot.PeriodID < 3) {
            team.addBet(shot as Shot)
          }

          return acc
        },
        { home: new EventSummary(), away: new EventSummary() }
      )

    if (away.goals + home.goals !== match.HomeTeamGoals + match.AwayTeamGoals) {
      // console.warn(`Invalid sum (probably due to penalties and/or overtime.
      // H: ${home.goals}, A: ${away.goals}, Sum: ${match.HomeTeamGoals + match.AwayTeamGoals}`)
    }

    acc.push(home, away)
    return acc
  }, [] as EventSummary[])

  const totalMatches = summaries.length
  const withBets = summaries.filter((s) => s.bet)
  const { winners, losers } = withBets.reduce(
    (acc, s) => {
      if (s.betSuccessful) {
        acc.winners.push(s)
      } else {
        acc.losers.push(s)
      }

      return acc
    },
    { winners: [] as EventSummary[], losers: [] as EventSummary[] }
  )

  console.log('Total Matches', totalMatches)
  console.log(`
    Matches with bets ${withBets.length} (${withBets.length / totalMatches})
    Winning bets ${winners.length} (${winners.length / withBets.length})
    
    Avg minute win ${getAverageMinute(winners)}
    Avg minute loss ${getAverageMinute(losers)}
    
    Avg # events win ${getAverageNumberEvents(winners)}
    Avg # events loss ${getAverageNumberEvents(losers)}
    
    Avg event prob win ${getAverageProb(winners)}
    Avg event prob loss ${getAverageProb(losers)}

`)
}

const getAverageMinute = (arr: EventSummary[]): number => {
  return arr.reduce((sum, s) => (sum += s.bet.minute), 0) / arr.length
}
const getAverageNumberEvents = (arr: EventSummary[]): number => {
  return (
    arr.reduce((sum, s) => (sum += s.xgChanges.filter((x) => x.minute <= s.bet.minute).length), 0) /
    arr.length
  )
}
const getAverageProb = (arr: EventSummary[]): number => {
  return (
    arr.reduce((sum, s) => {
      const prob = s.xgChanges
        .filter((x) => x.minute <= s.bet.minute)
        .map((x) => x.prob)
        .reduce((tempSum, x) => (tempSum += x), 0)

      sum += prob
      return sum
    }, 0) / arr.length
  )
}

const getTeam = (shot: Shot): 'HOME' | 'AWAY' => {
  return shot.EventTeamID === shot.HomeTeamID ? 'HOME' : 'AWAY'
}

run()
