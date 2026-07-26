# FreshSabjiHub Backend Server

This is the Node.js / Express server that powers the FreshSabjiHub platform. It handles the API, database interactions, authentication, and payments.

## Tech Stack
- **Node.js & Express**
- **Database:** MySQL
- **Authentication:** Firebase Admin SDK & JWT
- **Payments:** Razorpay
- **Emails:** Nodemailer
- **File Uploads:** Multer & Sharp

## Prerequisites
- Node.js
- MySQL Server running locally or remotely

## Setup Instructions
1. Navigate to the `Backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Fill in your MySQL credentials, Firebase config, JWT secret, and Razorpay keys.
4. Run database setup scripts or import the schema from `scripts/init_db.sql` into your MySQL database.
5. Start the development server:
   ```bash
   npm start
   ```
   *This uses `nodemon` to automatically restart the server on file changes.*

## Important Information
- The server exposes REST API endpoints used by both the App and the Website.
- File uploads are managed using `multer` and processed with `sharp`. Ensure the `uploads` directory exists and has proper read/write permissions.
- You can run the server without nodemon using `npm run start-node`.
