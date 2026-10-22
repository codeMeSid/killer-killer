/** An expected failure whose message is safe to show the player. (Own file so node --test can load it.) */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
