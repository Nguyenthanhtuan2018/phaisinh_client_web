import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useChartStore } from './chart';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);

  const connect = () => {
    if (socket.value?.connected) return;

    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    
    socket.value = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500
    });

    socket.value.on('connect', () => {
      console.log('✅ Connected to server');
      connected.value = true;
    });

    socket.value.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      connected.value = false;
    });

    // Listen for market data
    socket.value.on('market-data', (data: any) => {
      const chartStore = useChartStore();
      chartStore.processTick(data);
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
    }
  };

  const subscribe = (symbols: string[]) => {
    socket.value?.emit('subscribe', symbols);
  };

  const unsubscribe = (symbols: string[]) => {
    socket.value?.emit('unsubscribe', symbols);
  };

  return {
    socket,
    connected,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
});
