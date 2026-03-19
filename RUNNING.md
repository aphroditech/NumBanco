# Quick start (development)

1. Copy `.env.example` to `.env` in `server/` and fill values.
2. From project root (requires Docker):
   ```
   docker-compose up --build
   ```
3. Frontend will be at http://localhost:5173 and API at http://localhost

# Quick start (without Docker)

- Backend:
  ```
  cd server
  npm install
  cp .env.example .env
  # set MONGO_URI mongodb://localhost:27017/Num2Bet
  npm run dev
  ```

- Frontend:
  ```
  cd client
  npm install
  npm run dev
  ```

