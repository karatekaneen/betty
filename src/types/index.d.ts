export type MatchEntry = {
    MatchID: string
    [key: string]: unknown
    HomeTeamGoals: number
    AwayTeamGoals: number
}

export type Shot = {
    MatchID: string
    EventTypeID: number
    EventMinute: number
    EventSeconds: number
    Prob: number
    PeriodID: 1 | 2
    HomeTeamID: number
    EventTeamID: number
    [key: string]: unknown
}

export type EnrichedMatch = MatchEntry & { shots: Shot[] }
