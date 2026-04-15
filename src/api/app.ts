import express from "express";
import authRoutes from "./features/auth/auth.routes";
import adminRoutes from "./features/admin/admin.routes";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import {
  emailQueue,
  imageQueue,
  reportQueue,
  userQueue,
} from "../shared/queue/bullmq-queue";

const app = express();

// -------------- Parse JSON body --------------
app.use(express.json());

// -------------- Bull Board dashboard --------------
const serverAdapter = new ExpressAdapter(); // connect Bull Board to Express
serverAdapter.setBasePath("/admin/queues"); // URL to access dashboard

// register 3 queues to dashboard
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(imageQueue),
    new BullMQAdapter(reportQueue),
    new BullMQAdapter(userQueue),
  ],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

// -------------- Mount routes --------------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

export default app;
