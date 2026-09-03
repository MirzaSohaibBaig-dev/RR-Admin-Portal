# R&R Dispatcher - Admin Portal & Backend

Enterprise Dispatcher & Admin Management System with dedicated **Frontend** and **Backend** directories.

---

## 📁 Project Structure

```
admin portal/
├── backend/                  # Complete Node.js + Express + MongoDB Backend
│   ├── config/
│   │   └── db.js             # Mongoose & MongoDB connection
│   ├── controllers/
│   │   ├── driverController.js
│   │   ├── requestController.js
│   │   └── assignmentController.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── responseHandler.js
│   ├── models/
│   │   ├── Driver.js         # Drivers collection schema
│   │   ├── Request.js        # Requests (Rides) collection schema
│   │   ├── Assignment.js     # Assignments collection schema
│   │   ├── AdminStats.js     # Admin KPI stats collection schema
│   │   └── dbAdapter.js      # Robust dual-mode DB adapter
│   ├── routes/
│   │   ├── driverRoutes.js
│   │   ├── requestRoutes.js
│   │   └── assignmentRoutes.js
│   ├── seed/
│   │   └── seedData.js       # Database seeder script
│   ├── .env                  # Port 5000 & MongoDB URI configuration
│   ├── package.json
│   ├── postman_collection.json # Exportable Postman collection for all APIs
│   ├── server.js             # Express entrypoint on Port 5000
│   └── test_api.js           # Automated API verification test runner
│
└── frontend/                 # React 19 + Vite Frontend
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── layouts/
    │   ├── pages/            # 1. Driver Approval, 2. Ride Dispatch, 3. Ride Pool, 4. Pending Rides
    │   └── utils/
    │       ├── api.js        # Unified API Client for backend endpoints
    │       └── mockData.js
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 How to Run

### 1. Start the Backend Server (Port 5000)
```bash
cd backend
npm install
npm start
```
*The server will start on `http://localhost:5000` and automatically seed initial data for all 4 screens if the database is fresh.*

To run automated API tests:
```bash
cd backend
node test_api.js
```

### 2. Start the Frontend App (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Endpoints Summary

All endpoints return the standard JSON response format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation message",
  "error": null
}
```

### Drivers (`/api/drivers`)
- `GET /api/drivers?status=PENDING&page=1&limit=20`
- `GET /api/drivers/stats`
- `GET /api/drivers/available?rideLocation=...&vehicleType=...`
- `GET /api/drivers/:id`
- `POST /api/drivers`
- `PUT /api/drivers/:id/approve`
- `PUT /api/drivers/:id/reject`

### Requests / Rides (`/api/requests`)
- `GET /api/requests?status=...&page=1&limit=20`
- `GET /api/requests/pending`
- `GET /api/requests/stats`
- `GET /api/requests/:id`
- `POST /api/requests`
- `PUT /api/requests/:id`
- `PUT /api/requests/:id/visibility`
- `GET /api/requests/:id/driver-requests`

### Assignments (`/api/assignments`)
- `POST /api/assignments`
- `GET /api/assignments`

---

## 📮 Postman Collection
Import `backend/postman_collection.json` directly into Postman to test all routes instantly.
