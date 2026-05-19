import http from "http";
import env from "./config/env";
import app from "./app";
import sequelize from "./config/db";
import { registerModels } from "./config/models";
import { initAssociations } from "./config/associations";
import { registerEventHandlers } from "./events/registerHandlers";
import { initSocket } from "./realtime/socket";
import { startCronJobs } from "./jobs";
import { logger } from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    registerModels();
    initAssociations();
    registerEventHandlers();

    await sequelize.authenticate();
    logger.info("✅ PostgreSQL connected");

    const server = http.createServer(app);
    initSocket(server);
    startCronJobs();

    server.listen(env.port, () => {
      logger.info(`🚀 Server on http://localhost:${env.port}`);
      logger.info(`📚 Swagger: http://localhost:${env.port}/api/docs`);
    });
  } catch (error) {
    logger.error("❌ Startup failed", { error: (error as Error).message });
    process.exit(1);
  }
};

startServer();
