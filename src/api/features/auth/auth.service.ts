import { ResultSetHeader } from "mysql2/promise";
import pool from "../../../shared/database";
import { addJob } from "../../../shared/queue/mysql-queue";

interface RegisterInput {
  email: string;
  name: string;
}

export async function registerUser(input: RegisterInput) {
  const { email, name } = input;

  // 1. Create user in database
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO users (email, name) VALUES (?, ?)",
    [email, name],
  );

  const userId = result.insertId;

  // 2. Push email job to queue (do NOT send email here)
  const jobId = await addJob({
    queue: "email",
    type: "welcome_email",
    payload: { userId, email, name },
  });

  return { userId, jobId };
}
