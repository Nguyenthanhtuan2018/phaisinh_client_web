// useVpsWebSocket.ts - Raw WebSocket to web4.vps.com.vn
import { ref, onUnmounted } from 'vue';
import { useChartStore } from '@/stores/chart';

// Config - URL giống hệt app bạn bạn (không có query params)
const WS_URL = 'wss://web4.vps.com.vn/Push/socket.io/';
const SYMBOL = 'VN30F2512'; // VN30F2512
const HEARTBEAT_INTERVAL = 25000;
const RECONNECT_DELAY = 3000;

export function useVpsWebSocket() {
  const connected = ref(false);
  const lastPrice = ref<number | null>(null);
  const lastTime = ref<number | null>(null);
  const tickCount = ref(0);
  const status = ref<string>('disconnected');

  let ws: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let LastSaleType: any = null;

  const chartStore = useChartStore();

  let AnyWrapperType: any = null;
  let TopPriceType: any = null;

  // Load protobuf
  function loadProtobuf() {
    if (LastSaleType) return true;

    try {
      const protobuf = (window as any).protobuf;
      if (!protobuf) {
        console.warn('⚠️ Protobuf not loaded');
        return false;
      }

      const root = protobuf.Root.fromJSON({
        nested: {
          market_api: {
            nested: {
              AnyWrapper: {
                fields: {
                  type_url: { type: 'string', id: 1 },
                  value: { type: 'bytes', id: 2 }
                }
              },
              TopPrice: {
                fields: {
                  secCd: { type: 'string', id: 1 },
                  lastPrice: { type: 'double', id: 2 },
                  lastQty: { type: 'double', id: 3 },
                  changePoint: { type: 'double', id: 4 },
                  changePercent: { type: 'double', id: 5 },
                  hightPrice: { type: 'double', id: 6 },
                  lowPrice: { type: 'double', id: 7 },
                  totalQty: { type: 'double', id: 8 },
                  totalAmt: { type: 'double', id: 9 },
                  refPrice: { type: 'double', id: 10 },
                  ceilingPrice: { type: 'double', id: 11 },
                  floorPrice: { type: 'double', id: 12 },
                  bidPrice1: { type: 'double', id: 13 },
                  bidQty1: { type: 'double', id: 14 },
                  askPrice1: { type: 'double', id: 15 },
                  askQty1: { type: 'double', id: 16 }
                }
              },
              LastSale: {
                fields: {
                  marketCd: { type: 'string', id: 1 },
                  secCd: { type: 'string', id: 2 },
                  changePoint: { type: 'double', id: 3 },
                  changePercent: { type: 'double', id: 4 },
                  lastPrice: { type: 'double', id: 5 },
                  lastQty: { type: 'double', id: 6 },
                  lastAmt: { type: 'double', id: 7 },
                  totalQty: { type: 'double', id: 8 },
                  totalAmt: { type: 'double', id: 9 },
                  hightPrice: { type: 'double', id: 10 },
                  lowPrice: { type: 'double', id: 11 },
                  avgPrice: { type: 'double', id: 12 },
                  matTime: { type: 'int32', id: 15 }
                }
              }
            }
          }
        }
      });

      AnyWrapperType = root.lookupType('market_api.AnyWrapper');
      TopPriceType = root.lookupType('market_api.TopPrice');
      LastSaleType = root.lookupType('market_api.LastSale');
      console.log('✅ Protobuf schema loaded');
      return true;
    } catch (e) {
      console.warn('⚠️ Protobuf load error:', e);
      return false;
    }
  }

  // Decode protobuf - handle AnyWrapper
  function decodeProtobuf(buffer: ArrayBuffer): any | null {
    if (!AnyWrapperType) return null;

    try {
      const uint8 = new Uint8Array(buffer);
      
      // First try to decode as AnyWrapper
      const wrapper = AnyWrapperType.decode(uint8);
      const wrapperObj = AnyWrapperType.toObject(wrapper, { defaults: true });
      
      // console.log('🔍 Wrapper type_url:', wrapperObj.type_url);
      
      // If it's wrapped, decode the inner value
      if (wrapperObj.value && wrapperObj.value.length > 0) {
        const innerBuffer = wrapperObj.value;
        
        try {
          if (wrapperObj.type_url?.includes('TopPrice')) {
            const inner = TopPriceType.decode(innerBuffer);
            return TopPriceType.toObject(inner, { longs: Number, defaults: true });
          } else if (wrapperObj.type_url?.includes('LastSale')) {
            const inner = LastSaleType.decode(innerBuffer);
            return LastSaleType.toObject(inner, { longs: Number, defaults: true });
          }
        } catch (innerErr) {
          // Ignore inner decode errors
          return null;
        }
      }
      
      // Fallback: try direct decode as LastSale
      const direct = LastSaleType.decode(uint8);
      return LastSaleType.toObject(direct, { longs: Number, defaults: true });
    } catch (e) {
      // Ignore decode errors silently
      return null;
    }
  }

  // Parse matTime
  function parseMatTime(matTime: number): number {
    if (!matTime || matTime <= 0) return Math.floor(Date.now() / 1000);

    const now = new Date();
    const hours = Math.floor(matTime / 10000);
    const minutes = Math.floor((matTime % 10000) / 100);
    const seconds = matTime % 100;

    now.setHours(hours, minutes, seconds, 0);
    return Math.floor(now.getTime() / 1000);
  }

  // Process tick
  function processTick(data: any) {
    if (!data) return;

    const sym = data.secCd || data.symbol || '';
    // Filter chỉ VN30F2512
    if (!sym || !String(sym).includes('VN30F2512')) return;

    const price = parseFloat(data.lastPrice || data.price || data.close);
    
    // Log giá bất thường
    if (price > 2500 || price < 1500) {
      console.warn('⚠️ Giá bất thường:', sym, price, data);
      return;
    }
    
    if (!Number.isFinite(price) || price <= 0) return;

    const time = data.matTime ? parseMatTime(data.matTime) : Math.floor(Date.now() / 1000);

    lastPrice.value = price;
    lastTime.value = time;
    tickCount.value++;

    chartStore.processTick({
      time,
      price,
      open: price,
      high: parseFloat(data.hightPrice || data.high) || price,
      low: parseFloat(data.lowPrice || data.low) || price,
      close: price
    });

    console.log(`📈 ${sym || 'VN30F'}: ${price} @ ${new Date(time * 1000).toLocaleTimeString()}`);
  }

  // Handle message
  function handleMessage(data: string | ArrayBuffer) {
    // Binary data (protobuf)
    if (data instanceof ArrayBuffer) {
      const decoded = decodeProtobuf(data);
      if (decoded) {
        processTick(decoded);
      }
      return;
    }

    const msg = data as string;
    // console.log('📩 Text message:', msg.substring(0, 100));

    // Engine.IO open packet: 0{...}
    if (msg.startsWith('0')) {
      console.log('📡 Engine.IO handshake');
      // Subscribe ngay sau handshake (không cần đợi 40)
      status.value = 'connected';
      subscribe();
      return;
    }

    // Ping
    if (msg === '2') {
      ws?.send('3');
      return;
    }

    // Pong
    if (msg === '3') return;

    // Socket.IO connect: 40
    if (msg === '40' || msg.startsWith('40{')) {
      console.log('✅ Socket.IO connected, subscribing...');
      status.value = 'subscribed';
      subscribe();
      return;
    }

    // Binary event indicator: 451-[...]
    if (msg.startsWith('451-') || msg.startsWith('45')) {
      console.log('📦 Binary event indicator');
      return;
    }

    // Socket.IO event: 42[...]
    if (msg.startsWith('42')) {
      try {
        const jsonStr = msg.substring(2);
        const parsed = JSON.parse(jsonStr);
        console.log('📨 Event:', parsed[0]);
      } catch (e) {
        // ignore
      }
      return;
    }
  }

  // Subscribe
  function subscribe() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Format: 4{"eventName":"register","channelTopic":"ticker","args":{"channel":"41I1FB000"}}
    const msg = {
      eventName: 'register',
      channelTopic: 'ticker',
      args: { channel: SYMBOL }
    };
    const message = `4${JSON.stringify(msg)}`;
    ws.send(message);
    console.log('📡 Sent register:', message);
  }

  // Heartbeat
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send('2');
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // Reconnect
  function scheduleReconnect() {
    if (reconnectTimer) return;
    status.value = 'reconnecting';
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      console.log('🔄 Reconnecting...');
      connect();
    }, RECONNECT_DELAY);
  }

  // Connect - raw WebSocket
  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;

    loadProtobuf();

    console.log('🔌 Connecting to web4.vps.com.vn...');
    console.log('🔌 URL:', WS_URL);
    status.value = 'connecting';

    try {
      ws = new WebSocket(WS_URL);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('✅ WebSocket OPEN');
        connected.value = true;
        status.value = 'open';
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        handleMessage(event.data);
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket CLOSED:', event.code, event.reason);
        connected.value = false;
        status.value = 'disconnected';
        stopHeartbeat();
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket ERROR:', error);
        status.value = 'error';
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      status.value = 'error';
      scheduleReconnect();
    }
  }

  // Disconnect
  function disconnect() {
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected.value = false;
    status.value = 'disconnected';
    console.log('🔌 Disconnected');
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    connected,
    lastPrice,
    lastTime,
    tickCount,
    status,
    connect,
    disconnect,
    subscribe
  };
}
