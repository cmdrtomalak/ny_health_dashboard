import ReconnectingWebSocket from 'reconnecting-websocket';

interface SyncStatusUpdate {
  type: 'sync_status';
  status: 'scheduled' | 'buffered' | 'rejected' | 'running' | 'success' | 'failed';
  message?: string;
  timestamp: string;
}

interface ConnectionUpdate {
  type: 'connection_established';
  timestamp: string;
}

type WebSocketMessage = SyncStatusUpdate | ConnectionUpdate;

export class RealtimeService {
  private socket: ReconnectingWebSocket;
  private listeners: Set<(message: WebSocketMessage) => void> = new Set();

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new ReconnectingWebSocket(wsUrl);
    
    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        this.notifyListeners(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    });
  }

  subscribe(callback: (message: WebSocketMessage) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(message: WebSocketMessage) {
    this.listeners.forEach(listener => listener(message));
  }
}

export const realtimeService = new RealtimeService();