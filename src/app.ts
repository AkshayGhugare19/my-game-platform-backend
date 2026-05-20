import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import env from "./config/env.ts";
import { errorHandler } from "./middlewares/error.middleware.ts";
import { initAssociations } from "./config/associations.ts";
import apiRouter from "./route/index.ts";
import { spec as swaggerSpec } from "./docs/swagger.js";

dotenv.config();

const app = express();

// ─── Security & utils ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initAssociations();

// ─── Swagger ───────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── 404 + global error handler ────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use(errorHandler);

export default app;
