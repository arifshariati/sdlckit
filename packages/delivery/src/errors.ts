/**
 * A refusal or usage error. `code` is the CLI exit code: 1 usage or environment, 2 a refused
 * move (preconditions or evidence missing), 3 no manifest.
 */
export class DeliveryError extends Error {
  readonly code: number;

  constructor(message: string, code = 1) {
    super(message);
    this.code = code;
  }
}
