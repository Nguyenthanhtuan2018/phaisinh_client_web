# Waves Analysis Client

Ứng dụng phân tích sóng Elliott cho thị trường phái sinh VN30F.

## Tech Stack

- Vue 3 + TypeScript
- Vite
- Pinia (State Management)
- Lightweight Charts (TradingView)
- Protobuf.js (Realtime data)

## Cài đặt

```bash
npm install
```

## Development

```bash
npm run dev
```

Mở http://localhost:5173

## Build Production

```bash
npm run build
```

Output trong folder `dist/`

## Deploy

### Option 1: Static Hosting (Vercel, Netlify, GitHub Pages)

```bash
npm run build
# Upload folder dist/ lên hosting
```

### Option 2: Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/waves-client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

### Option 3: Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Cấu hình

File `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Production:

```env
VITE_API_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
```

## Cấu trúc

```
src/
├── components/     # Vue components
├── composables/    # Logic hooks
├── config/         # Settings, rules
├── stores/         # Pinia stores
├── types/          # TypeScript types
├── views/          # Page views
└── lib/            # External libs (protobuf)
```

## Tính năng

- 📊 Chart realtime với nhiều timeframe (1s, 1m, 5m)
- 🔄 Refresh data từ VPS API
- 📈 Phân tích sóng Elliott tự động
- ✅ Validation rules trading
