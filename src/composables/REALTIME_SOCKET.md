# VPS Realtime Socket Documentation

## Tổng quan

Kết nối WebSocket trực tiếp từ browser đến VPS SmartOne để nhận tick data realtime.

## File chính
`client/src/composables/useVpsWebSocket.ts`

## VPS WebSocket Connection

### URL
```
wss://web4.vps.com.vn/Push/socket.io/
```

### Symbol Mapping
| Symbol hiển thị | Symbol đăng ký |
|-----------------|----------------|
| VN30F2512 | VN30F2512 |

## Protocol (Engine.IO + Socket.IO)

### 1. Handshake Flow

```
Server → Client: 0{"sid":"...","upgrades":[],"pingInterval":25000,"pingTimeout":60000}
Client → Server: 40
Server → Client: 40
Client → Server: 4{"eventName":"register",...}
```

### 2. Message Types

| Prefix | Type | Mô tả |
|--------|------|-------|
| `0` | Open | Engine.IO handshake |
| `2` | Ping | Heartbeat ping |
| `3` | Pong | Heartbeat pong |
| `4` | Message | Socket.IO message |
| `40` | Connect | Socket.IO connect |
| `42` | Event | Socket.IO event (JSON) |
| `45` | Binary | Binary event indicator |
| Binary | Data | Protobuf encoded tick |

### 3. Subscribe Message

```javascript
const msg = {
  eventName: 'register',
  channelTopic: 'ticker',
  args: { channel: 'VN30F2512' }
};
ws.send(`4${JSON.stringify(msg)}`);
```

### 4. Heartbeat

```javascript
// Gửi ping mỗi 25 giây
setInterval(() => ws.send('2'), 25000);

// Nhận ping từ server → trả pong
if (msg === '2') ws.send('3');
```

## Protobuf Schema

### AnyWrapper (Outer)
```protobuf
message AnyWrapper {
  string type_url = 1;  // "type.googleapis.com/market_api.TopPrice"
  bytes value = 2;      // Inner message bytes
}
```

### TopPrice (Inner - Tick Data)
```protobuf
message TopPrice {
  string secCd = 1;        // Symbol
  double lastPrice = 2;    // Giá khớp
  double lastQty = 3;      // Khối lượng
  double hightPrice = 6;   // Giá cao nhất
  double lowPrice = 7;     // Giá thấp nhất
  double totalQty = 8;     // Tổng KL
}
```

### LastSale (Alternative)
```protobuf
message LastSale {
  string secCd = 2;
  double lastPrice = 5;
  double lastQty = 6;
  double hightPrice = 10;
  double lowPrice = 11;
  int32 matTime = 15;      // HHMMSS format (e.g. 93045 = 09:30:45)
}
```

## Decode Flow

```javascript
ws.binaryType = 'arraybuffer';

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    // 1. Decode AnyWrapper
    const wrapper = AnyWrapperType.decode(new Uint8Array(event.data));
    
    // 2. Decode inner message based on type_url
    if (wrapper.type_url.includes('TopPrice')) {
      const tick = TopPriceType.decode(wrapper.value);
      processTick(tick);
    }
  }
};
```

## Usage

```typescript
import { useVpsWebSocket } from '@/composables/useVpsWebSocket';

const vpsWs = useVpsWebSocket();

// Connect
vpsWs.connect();

// Check status
console.log(vpsWs.connected.value);
console.log(vpsWs.lastPrice.value);

// Disconnect
vpsWs.disconnect();
```

## Exposed State

| Property | Type | Mô tả |
|----------|------|-------|
| `connected` | `Ref<boolean>` | Trạng thái kết nối |
| `lastPrice` | `Ref<number>` | Giá mới nhất |
| `lastTime` | `Ref<number>` | Thời gian tick cuối |
| `tickCount` | `Ref<number>` | Số tick đã nhận |
| `status` | `Ref<string>` | Status chi tiết |

## Config

```typescript
const WS_URL = 'wss://web4.vps.com.vn/Push/socket.io/';
const SYMBOL = 'VN30F2512';
const HEARTBEAT_INTERVAL = 25000;  // 25s
const RECONNECT_DELAY = 3000;      // 3s
```

## Troubleshooting

### Connection Timeout
- VPS có thể block nếu request quá nhiều
- Thử đổi network hoặc đợi vài phút

### No Data
- Kiểm tra thời gian giao dịch (9:00-11:30, 13:00-14:45)
- Kiểm tra symbol đăng ký

### Protobuf Error
- Cần load protobuf.js trước: `<script src="protobuf.min.js">`
- Binary data có thể là AnyWrapper hoặc direct message
