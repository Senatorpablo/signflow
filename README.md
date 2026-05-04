# SignFlow — Open Source E-Signature Platform

> **DocuSign without the tax.** Self-host for free, or use our cloud at 52% less cost.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)

## 🚀 Features

- **✍️ Unlimited Signatures** — No envelope limits. Ever.
- **📄 PDF Upload & Signing** — Drag-and-drop fields, mobile-responsive signing
- **🔒 Self-Hostable** — Your data stays on your servers. One Docker command.
- **💰 52% Cheaper** — Professional tier at $19/mo vs DocuSign's $40/mo
- **🎨 White-Label** — Custom branding, domain, and email
- **🔌 Full API** — REST API + Webhooks for integrations
- **📱 Mobile Ready** — Sign documents on any device
- **📊 Audit Trails** — Immutable signing logs for compliance

## 📊 Pricing Comparison

| Feature | DocuSign Business Pro | SignFlow Professional |
|---------|----------------------|---------------------|
| **Price** | $40/mo per user | **$19/mo per user** |
| **Envelopes** | 100/year limit | **Unlimited** |
| **Templates** | Limited | **Unlimited** |
| **API Access** | Enterprise add-on | **Included** |
| **Self-Host** | ❌ Not available | **✅ Free** |
| **White-Label** | Enterprise only | **Professional** |

**Savings for 50-person team:** $12,600/year

## 🐳 Quick Start (Self-Hosted)

```bash
# Clone repository
git clone https://github.com/signflowco/signflow.git
cd signflow

# Start with Docker Compose
docker-compose up -d

# Access the app
open http://localhost:3000
```

## 🛠️ Development Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Architecture

```
signflow/
├── backend/           # Node.js + Express + PostgreSQL
│   ├── prisma/         # Database schema
│   ├── routes/         # API endpoints
│   └── services/       # PDF, email, storage
├── frontend/          # Vue 3 + Vite + Tailwind
│   ├── src/
│   └── components/     # Reusable UI components
└── docker-compose.yml  # One-command deployment
```

## 📖 Documentation

- [Installation Guide](docs/INSTALL.md)
- [Self-Hosting Guide](docs/SELF_HOSTING.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

- **Open Source:** [AGPL-3.0](LICENSE) — Free for self-hosting
- **Commercial:** [Commercial License](COMMERCIAL-LICENSE.md) — For SaaS and white-label use

## 🔒 Security

Report vulnerabilities to security@signflow.io. See [SECURITY.md](SECURITY.md).

## 💬 Support

- 📧 Email: support@signflow.io
- 💬 Discord: [Join our community](https://discord.gg/signflow)
- 🐛 Issues: [GitHub Issues](https://github.com/signflowco/signflow/issues)

---

**Built with ❤️ by the SignFlow team.**
