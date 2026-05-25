import http from "http";
import env from "./config/env.ts";
import app from "./app.ts";
import sequelize from "./config/db.ts";
import { registerModels } from "./config/models.ts";
import { initAssociations } from "./config/associations.ts";
import { registerEventHandlers } from "./events/registerHandlers.ts";
import { initSocket } from "./realtime/socket.ts";
import { startCronJobs } from "./jobs/index.ts";
import { logger } from "./utils/logger.ts";

const startServer = async (): Promise<void> => {
  try {
    registerModels();
    initAssociations();
    registerEventHandlers();

    await sequelize.authenticate();
    logger.info("✅ PostgreSQL connected");
    console.log("✅ PostgreSQL connected");

    const server = http.createServer(app);
    initSocket(server);
    startCronJobs();

    server.listen(env.port, () => {
      logger.info(`🚀 Server on http://localhost:${env.port}`);
      logger.info(`📚 Swagger: http://localhost:${env.port}/api/docs`);
    });
  } catch (error) {
    logger.error("❌ Server startup failed", { error });
    // eslint-disable-next-line no-console
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
