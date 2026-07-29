Asthropic ChatApp 🚀

Asthropic ChatApp is an enterprise-grade real-time chat application designed to support 1000+ concurrent users with zero latency, minimal CPU/memory footprint, and a highly scalable cloud-native infrastructure model.

📂 System Architecture
asthropic_chatapp/
├── backend/             # Node.js + Express + Socket.io + MongoDB + Redis + Gemini AI
├── frontend/            # Flutter Android Core Codebase with Local Caching & WhatsApp UI
└── k8s/                 # Kubernetes Manifests, Ingress, HPA, Prometheus & Grafana configs

✨ System Highlights & Application Strategy

7-Day Automatic Message Auto-Delete: Configured via MongoDB TTL index (expireAfterSeconds: 604800) on createdAt to optimize storage.

Instant Local Cache Engine: Caches user sessions, chat lists, and message history locally on the device to guarantee zero load-time lag on cold startup.

Presence System: Redis O(1) state engine tracking online/offline status and live last-seen timestamps.

Native Gemini AI Integration: Direct Gemini AI assistant tab and in-chat @gemini trigger for smart assistance

🛠️ Step-by-Step Setup & Deployment Commands

If you want to set up and run this project locally or in a Kubernetes/Minikube cluster, follow the commands below step-by-step:

Clone the Repository
git clone https://github.com/your-username/asthropic-chatapp.git
cd asthropic-chatapp

Run Backend Locally
cd backend
npm install

Set up your .env file with MongoDB, Redis, and Gemini API keys
npm start

Run Frontend (Flutter)
cd ../frontend
flutter pub get
flutter run

Deploy Infrastructure & Kubernetes Manifests
Make sure you have minikube and kubectl running:
minikube start

Navigate to the Kubernetes configurations directory and apply the manifests:
cd ../k8s
kubectl apply -f .

Verify Running Pods & Services
To check if all backend apps, monitoring tools, and databases are running successfully:
kubectl get pods -A
kubectl get svc -A

Access Monitoring & Dashboards

Prometheus UI (NodePort):
minikube service prometheus-service -n monitoring

Grafana Dashboard (NodePort):
minikube service grafana-service -n monitoring
(Default login: admin / admin)

https://asthropic-chatapp.onrender.com 
