export function isPrintableKeyboardStartEvent(event: unknown): event is KeyboardEvent {
  return typeof KeyboardEvent !== 'undefined'
    && event instanceof KeyboardEvent
    && event.key.length === 1
    && !event.ctrlKey
    && !event.altKey
    && !event.metaKey;
}
