# PushCloud - Automated Deployment Platform

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</div>

## 📌 Overview

PushCloud is a **scalable cloud deployment platform** inspired by Vercel, built to automate the process of deploying static websites from Git repositories. The system uses **microservices architecture** with **Docker containers**, **AWS ECS**, and **S3** to provide seamless, real-time deployments with live build logs.

### 🎯 Key Features

- ⚡ **Automated Deployments** - Deploy from GitHub repositories with a single API call
- 🐳 **Containerized Builds** - Isolated build environments using Docker
- ☁️ **Cloud Infrastructure** - Leverages AWS ECS Fargate for serverless container orchestration
- 📊 **Real-time Logs** - Live build logs streamed via Redis pub/sub and Socket.IO
- 🌐 **Custom Subdomains** - Each deployment gets a unique subdomain
- 🔄 **Reverse Proxy** - HTTP proxy server for routing requests to S3-hosted sites

---

## 🏗️ Architecture
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│             │      │              │      │             │
│  API Server │─────▶│ Build Server │─────▶│  S3 Bucket  │
│  (Express)  │      │  (Docker +   │      │  (Static    │
│             │      │   AWS ECS)   │      │   Hosting)  │
└──────┬──────┘      └──────┬───────┘      └─────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│             │      │              │
│   Redis     │◀─────│  Socket.IO   │
│  (Pub/Sub)  │      │   (Logs)     │
│             │      │              │
└─────────────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│  Reverse    │
│  Proxy      │
│  Server     │
└─────────────┘
```

### Components

1. **API Server** (`api-server/`)
   - Accepts deployment requests
   - Triggers AWS ECS tasks
   - Manages WebSocket connections for real-time logs

2. **Build Server** (`build-server/`)
   - Runs inside Docker containers on AWS ECS Fargate
   - Clones Git repositories
   - Installs dependencies and builds projects
   - Uploads build artifacts to S3
   - Publishes logs to Redis

3. **Reverse Proxy** (`s3-reverse-proxy/`)
   - Routes incoming requests based on subdomain
   - Serves static content from S3
   - Handles index.html resolution

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker
- AWS Account (ECS, S3, IAM configured)
- Redis instance (Upstash or local)

### Environment Variables

Create `.env` files in each service directory:

#### `api-server/.env`
```env
ACCESS_KEY=your_aws_access_key
SECRET_KEY=your_aws_secret_key
REDIS_URL=your_redis_connection_string
```

#### `build-server/.env`
```env
ACCESS_KEY=your_aws_access_key
SECRET_KEY=your_aws_secret_key
BUCKET_NAME=your_s3_bucket_name
REDIS_URL=your_redis_connection_string
```

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ShivamJuyal24/Vercel.git
cd Vercel
```

### 2. Install Dependencies
```bash
# API Server
cd api-server
npm install

# Build Server
cd ../build-server
npm install

# Reverse Proxy
cd ../s3-reverse-proxy
npm install
```

### 3. Configure AWS

#### Create S3 Bucket
```bash
aws s3 mb s3://your-bucket-name --region eu-north-1
```

#### Set up ECS Cluster
```bash
aws ecs create-cluster --cluster-name builder-cluster
```

#### Build and Push Docker Image
```bash
cd build-server
docker build -t your-ecr-repo/builder-image:latest .
docker push your-ecr-repo/builder-image:latest
```

#### Create ECS Task Definition
- Configure task with your Docker image
- Set environment variables
- Assign appropriate IAM roles

---

## 🎮 Usage

### 1. Start the Services
```bash
# Terminal 1: API Server
cd api-server
node index.js

# Terminal 2: Reverse Proxy
cd s3-reverse-proxy
node index.js
```

### 2. Deploy a Project

**Make a POST request to the API:**
```bash
curl -X POST http://localhost:9000/project \
  -H "Content-Type: application/json" \
  -d '{
    "gitUrl": "https://github.com/username/react-app"
  }'
```

**Response:**
```json
{
  "status": "queued",
  "data": {
    "projectId": "clever-lion-42",
    "url": "http://clever-lion-42.localhost:8000"
  }
}
```

### 3. Monitor Logs via WebSocket
```javascript
const socket = io('http://localhost:9001');
socket.emit('subscribe', 'logs:clever-lion-42');
socket.on('message', (log) => {
  console.log(log);
});
```

### 4. Access Your Deployed Site

Visit: `http://clever-lion-42.localhost:8000`

---

## 🔧 How It Works

### Deployment Flow

1. **User submits Git URL** → API Server receives request
2. **Generate unique project ID** → Random slug (e.g., `clever-lion-42`)
3. **Trigger ECS Task** → AWS Fargate spins up container
4. **Clone & Build** → Build server clones repo, runs `npm install && npm run build`
5. **Upload to S3** → Build artifacts uploaded to `s3://bucket/__outputs/clever-lion-42/`
6. **Real-time Logs** → Redis pub/sub streams logs to connected clients
7. **Reverse Proxy** → Routes `clever-lion-42.localhost:8000` to S3 content

---

## 📂 Project Structure
```
Vercel/
├── api-server/
│   ├── index.js           # Express API + Socket.IO
│   ├── package.json
│   └── .env
├── build-server/
│   ├── script.js          # Build logic
│   ├── main.sh            # Entrypoint script
│   ├── Dockerfile         # Container definition
│   ├── package.json
│   └── .env
├── s3-reverse-proxy/
│   ├── index.js           # HTTP proxy server
│   ├── package.json
│   └── .env
└── README.md
```

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Node.js, Express.js |
| **Real-time** | Socket.IO, Redis (pub/sub) |
| **Cloud** | AWS ECS, S3, Fargate |
| **Containerization** | Docker |
| **Build Tools** | npm, Git |
| **Proxy** | http-proxy |

---







## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Shivam Juyal**

- GitHub: [@ShivamJuyal24](https://github.com/ShivamJuyal24)
- LinkedIn: [Shivam Juyal](https://www.linkedin.com/in/shivam-juyal-034273219/)
- Portfolio: [shivamjuyal24.netlify.app](https://shivamjuyal24.netlify.app/)

---

## 🙏 Acknowledgments

- Inspired by [Vercel](https://vercel.com)
- Built as a learning project to understand cloud deployment platforms

---

## 📸 Screenshots

### API Response
```json
{
  "status": "queued",
  "data": {
    "projectId": "clever-lion-42",
    "url": "http://clever-lion-42.localhost:8000"
  }
}
```

### Real-time Build Logs
```
🚀 Build started...
📦 Installing dependencies...
✅ Build completed
⬆️ Uploading: index.html
⬆️ Uploading: main.js
🎉 Deployment completed successfully!
```

---

<div align="center">
  <p>If you found this project helpful, please consider giving it a ⭐️</p>
  <p>Made with ❤️ by Shivam Juyal</p>
</div>
```

---


