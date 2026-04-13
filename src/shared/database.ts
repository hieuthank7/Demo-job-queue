import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? undefined,
  database: process.env.DB_NAME || "demo_job_queue",

  // Connection pool config
  waitForConnections: true, // wait if no connections available instead of throwing error
  connectionLimit: 10, // max 10 concurrent connections
  queueLimit: 0, // unlimited queue for waiting connections
});

export default pool;
