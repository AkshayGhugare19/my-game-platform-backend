import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gamify Engage API",
      version: "1.0.0",
      description:
        "Gamification platform — auth, XP, levels, ranks, missions, rewards, leaderboards, realtime notifications.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/route/*.ts", "./dist/route/*.js"],
});
