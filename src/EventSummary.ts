import { Shot } from "./types"

export class EventSummary {
    public xg = 0
    public bet = null as { minute: number, seconds: number } | null
    public goals = 0
    public xgChanges = [] as { prob: number, xg: number, minute: number, seconds: number }[]
    public betSuccessful = false
    public lastPeriodId = 0

    constructor() { }

    get shouldBet(): boolean {
        return this.xg > 1.1 && this.goals === 0 && !this.bet
    }

    addShot(shot: Shot) {
        this.xg += shot.Prob
        this.lastPeriodId = shot.PeriodID

        this.xgChanges.push({
            prob: shot.Prob,
            xg: this.xg,
            minute: shot.EventMinute,
            seconds: shot.EventSeconds
        })

        if (shot.EventTypeID === 16) {
            this.goals += 1

            if (this.bet) {
                this.betSuccessful = true
            }
        } else if (this.shouldBet) {

        }
    }

    addBet(shot: Shot): void {
        this.bet = {
            minute: shot.EventMinute,
            seconds: shot.EventSeconds
        }
    }


}