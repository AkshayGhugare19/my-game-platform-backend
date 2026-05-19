import { EventEmitter } from "events";
import { logger } from "../utils/logger.ts";

/**
 * In-process domain event bus. This is the single seam to swap for
 * BullMQ / Redis Streams when running engines in dedicated workers
 * (see DEPLOYMENT.md) — publishers/subscribers stay unchanged.
 *
 * Handlers are async and isolated: one failing subscriber must not break
 * the emitter or sibling subscribers.
 */
class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<T>(event: string, handler: (payload: T) => Promise<void> | void): void {
    this.emitter.on(event, (payload: T) => {
      Promise.resolve()
        .then(() => handler(payload))
        .catch((err) =>
          logger.error("Event handler failed", {
            event,
            error: (err as Error).message,
          })
        );
    });
  }

  emit<T>(event: string, payload: T): void {
    logger.debug("event", { event });
    this.emitter.emit(event, payload);
  }
}

export const bus = new EventBus();
