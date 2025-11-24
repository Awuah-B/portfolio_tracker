import { useState, useEffect, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/prices';

export interface PriceUpdate {
    type: 'price_update';
    ticker: string;
    price: number;
    timestamp: string;
}

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<PriceUpdate | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'price_update') {
                        setLastMessage(data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);
                // Reconnect after 5 seconds
                setTimeout(connect, 5000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                ws.current?.close();
            };
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.onclose = null; // Prevent reconnect on unmount
                ws.current.close();
            }
        };
    }, []);

    return { isConnected, lastMessage };
};
