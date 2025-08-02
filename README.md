# Attendance Management System - Backend

This directory contains the Node.js, Express, and MongoDB backend for the Martex application.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a MongoDB Atlas connection string.

## Setup Instructions

### 1. Install Dependencies

Navigate into the `backend` directory and install the required npm packages.

```bash
cd backend
npm install
```

### 2. Create Environment File

Create a `.env` file in the root of the `backend` directory. Copy the contents of `.env.example` into it.

```
cp .env.example .env
```

### 3. Configure Environment Variables

Open the newly created `.env` file and fill in your details:

- **`MONGO_URI`**: Your MongoDB connection string.
- For a local MongoDB instance, this will typically be `mongodb://localhost:27017/martex`.
- For MongoDB Atlas, use the connection string provided in your Atlas dashboard.
- **`JWT_SECRET`**: A long, random, and secret string used for signing authentication tokens. You can generate one easily online.

### 4. Seed the Database (Optional but Recommended)

To quickly get started with pre-populated admin and employee users, you can run the seeder script. This will delete any existing data and insert the sample users from `constants.ts`.

**Import data:**
```bash
npm run data:import
```

**Destroy data:**
```bash
npm run data:destroy
```

## Running the Server

Once setup is complete, you can start the backend server.

```bash
npm run server
```

The server will start on `http://localhost:5001` (or the port specified in your `.env` file). The frontend application should now be able to successfully communicate with the backend API.
