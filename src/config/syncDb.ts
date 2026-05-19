/**
 * Dev convenience: `npm run db:sync` — creates/updates all tables from the
 * Sequelize models. Use sequelize-cli migrations for production
 * (`npm run db:migrate`).
 */
import sequelize from "./db.ts";
import { initAssociations } from "./associations.ts";
import { registerModels } from "./models.ts";

const sync = async () => {
  registerModels();
  initAssociations();
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  // eslint-disable-next-line no-console
  console.log("✅ Database synced");
  process.exit(0);
};

sync().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("❌ Sync failed:", e);
  process.exit(1);
});
