# Frontend — Role Agents Mesh UI

React + Tailwind CSS frontend for the always-on multi-agent system. Served on Vite (port 5173) and proxies API calls to the FastAPI backend (port 8000).

## Structure
```
frontend/
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  src/
    main.jsx        # React entry point
    index.css       # Tailwind directives + design tokens + component CSS
    App.jsx         # Main layout: gallery sidebar + chat panel (+ inline sub-components)
    services/       # api.js (REST client + WebSocket helper)
    hooks/          # useWebSocket (live log streaming)
    utils/          # markdownRenderer.js, formatLog.js
```

## Run

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Make sure the backend is running (`python main.py` from `backend/`) on port 8000.

## Features
- Agent gallery with all 12 roles (click to select)
- Interactive query input with live submission
- WebSocket-streamed live processing log
- Markdown-rendered agent responses (links, images, lists)
- Per-session conversational memory
- Responsive design (collapsible sidebar on mobile)
