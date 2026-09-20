export class RollLoopError extends Error {
  constructor(readonly rounds: number) {
    super(`the computation still asks for rolls after ${rounds} rounds`)
    this.name = 'RollLoopError'
  }
}
