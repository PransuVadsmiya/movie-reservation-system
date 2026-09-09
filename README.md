# Ticketify: High-Concurrency Movie Reservation System 🎟️

A modern, full-stack movie reservation platform designed to handle high-concurrency ticket booking. Built with **FastAPI**, **Next.js**, **PostgreSQL**, **Redis**, and **Celery**, this application solves the classic "double-booking" problem using distributed locking and atomic database transactions.

---

## 🚀 Tech Stack

- **Frontend:** Next.js (React), TailwindCSS, Framer Motion
- **Backend:** FastAPI (Python), SQLAlchemy (ORM), Alembic (Migrations)
- **Database:** PostgreSQL (Persistent Storage for Transactions)
- **Cache & Locks:** Redis (Distributed In-Memory Seat Locking)
- **Background Tasks:** Celery (Asynchronous Email Delivery & Job Scheduling)
- **Infrastructure:** Docker & Docker Compose

---

## ✨ Key Features

- **Concurrency Control (No Double-Bookings):** Uses temporary 5-minute Redis locks when a user selects a seat. The lock automatically expires if payment isn't completed, freeing the seat. A final PostgreSQL unique constraint acts as a bulletproof safety net during checkout.
- **Dynamic Hero Movie Ranking:** Automatically highlights the most relevant movie on the dashboard using a weighted algorithm: `0.4(Rating) + 0.3(Popularity) + 0.2(Trending) + 0.1(New Release Decay)`.
- **Asynchronous Processing:** Sending confirmation emails is offloaded to a Celery background worker to ensure the API responds to users instantly after booking.
- **Automated Ticket Expiry:** A Celery Beat scheduled background job runs continuously to scan for and cancel expired tickets when a movie's showtime passes.
- **Beautiful, Responsive UI:** A cinematic, glassmorphism-inspired dark mode UI with interactive seat maps and smooth animations.

---

## 🛠️ How to Run Locally

The entire stack is containerized using Docker Compose, making it incredibly easy to spin up.

### 1. Prerequisites
- Docker and Docker Compose installed on your machine.
- Git.

### 2. Setup
Clone the repository and set up your environment variables:
```bash
git clone https://github.com/PransuVadsmiya/movie-reservation-system.git
cd movie-reservation-system

# Create the backend environment file
cp api/.env.example api/.env
```

### 3. Launch the Stack
Run the following command to build and start the API, Postgres database, Redis cache, and Celery worker:
```bash
docker-compose up --build -d
```

### 4. Run the Frontend
In a new terminal window, navigate to the `frontend` folder and start the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```

### 5. Access the Application
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger):** [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 🏗️ Architecture Highlights

### The Seat Locking Mechanism
When two users look at a theater screen at the same time, we must prevent them from buying the same seat. 
1. **Selection:** User A clicks Seat 1. The backend immediately writes a lock to Redis with a 5-minute TTL (Time-To-Live).
2. **Exclusivity:** If User B clicks Seat 1, the backend checks Redis and rejects the action.
3. **Checkout/Release:** If User A completes checkout, the seat is permanently written to Postgres and the Redis lock is deleted. If User A closes their browser, the Redis lock naturally expires after 5 minutes, allowing User B to select it again without requiring any manual database cleanup.
