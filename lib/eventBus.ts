type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

// Define standard events
export const EVENTS = {
  SUPABASE_RECONNECTED: 'supabase:reconnected',
  SESSION_RESTORED: 'auth:session:restored',
  DATA_REFRESH_NEEDED: 'data:refresh:needed'
}; 