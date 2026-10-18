import { run } from "./cli.js";
import { DeliveryError } from "./errors.js";

// Entry point of the plugin's bin/sdlckit-delivery (decision 26).
try {
  process.exitCode = run(process.argv.slice(2), process.cwd());
} catch (cause) {
  if (cause instanceof DeliveryError) {
    process.stderr.write(`sdlckit-delivery: ${cause.message}\n`);
    process.exitCode = cause.code;
  } else {
    const detail =
      cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`sdlckit-delivery: ${detail}\n`);
    process.exitCode = 1;
  }
}
