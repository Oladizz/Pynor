# ⚡ Pynor — Enterprise Uptime & Performance Monitoring

> **Flagship Free Utility of [Oladizz Agency](https://oladizz.xyz)**  
> Real-time uptime monitoring, incident lifecycle tracking, instant Telegram & Webhook alerts, and shareable public status pages.

---

## 🌟 Features

- ⏱️ **Real-Time Uptime Monitoring**: Precision HTTP/HTTPS health checks with strict timeout handling (`AbortController`), status code tracking, and latency percentiles.
- 🔄 **Automated Cloud Scheduler**: Configurable check frequencies (1 min, 5 min, 15 min, 30 min, 1 hr, 6 hr, 12 hr, 24 hr) powered by Firebase Cloud Functions v2.
- 🚨 **Incident State Machine**: Automatically flags downtime, opens ongoing incident records, computes exact outage duration, and resolves incidents when services recover.
- 📱 **Instant Alert Dispatching**:
  - **Telegram Bot**: Immediate downtime and recovery notifications sent directly to your phone.
  - **Webhooks**: Discord, Slack, and generic JSON webhook support for DevOps incident management.
- 🌐 **Shareable Public Status Pages**: Publicly accessible status URLs (`?status=<url>`) for users to showcase reliability to their clients without authentication.
- 🤖 **AI Root-Cause Diagnostics**: Integrated Gemini AI assistant to analyze historical ping trends, DNS issues, and server latency spikes.
- 🛡️ **Enterprise Security**: Firestore security rules enforcing user ownership and role-based access (User / Premium / Admin).

---

## 🏗️ Architecture

```text
[ Cloud Scheduler (1 min) ]
            │
            ▼
[ schedulePings (Cloud Function v2) ]
            │
            ├──► [ Target Websites / APIs (HTTP Pings) ]
            │
            ├──► [ Firestore: ping_results & incidents ]
            │
            └──► [ Alert Dispatcher: Telegram & Webhooks ]
```

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: Firebase Cloud Functions (Node.js 24 runtime, TypeScript)
- **Database**: Google Cloud Firestore (indexed by target URL, user ID, and timestamp)
- **Testing**: Jest + ts-jest unit test coverage

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+ (Node 24 recommended)
- Firebase CLI (`npm install -g firebase-tools`)

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### 3. Local Development
```bash
# Start frontend
npm run dev

# Run unit tests
cd functions && npm test
```

### 4. Build for Production
```bash
# Build frontend bundle
npm run build

# Build cloud functions
cd functions && npm run build
```

---

## 🌐 Public Status Page Usage

Share your live status with your clients or users using the query parameter:
```text
https://your-domain.com/?status=https%3A%2F%2Fapi.yourcompany.com
```

---

## 🏢 Oladizz Agency Ecosystem

Pynor is part of the **Oladizz Agency** 10-product suite.
- Portfolio: [https://oladizz.xyz](https://oladizz.xyz)
- Codebase: [https://github.com/Oladizz/Pynor](https://github.com/Oladizz/Pynor)
