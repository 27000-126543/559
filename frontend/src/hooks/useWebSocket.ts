import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_BASE_URL } from '@/utils/constants';
import { useDispatch } from 'react-redux';
import { addNotification } from '@/store/notificationSlice';
import { Notification, Task } from '@/types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onTaskUpdate?: (task: Task) => void;
  onNotification?: (notification: Notification) => void;
}

interface UseWebSocketReturn {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  isConnected: boolean;
  lastMessage: any;
}

export const useWebSocket = (
  channel: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const { autoConnect = true, onTaskUpdate, onNotification } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const dispatch = useDispatch();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No token available, cannot connect WebSocket');
      return;
    }

    const wsUrl = `${WS_BASE_URL}/${channel}/?token=${token}`;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const fullUrl = `${protocol}//${window.location.host}${wsUrl}`;

    try {
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connected to ${channel}`);
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (data.type === 'task_update' && onTaskUpdate) {
            onTaskUpdate(data.task);
          }

          if (data.type === 'notification') {
            dispatch(addNotification(data.notification));
            if (onNotification) {
              onNotification(data.notification);
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error in ${channel}:`, error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected from ${channel}:`, event.code, event.reason);
        setIsConnected(false);

        if (event.code !== 1000 && event.code !== 1001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting to ${channel}...`);
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [channel, dispatch, onTaskUpdate, onNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected,
    lastMessage,
  };
};
