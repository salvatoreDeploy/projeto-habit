import fastify from "fastify";
import cors from "@fastify/cors";
import { appRoutes } from "./routes";

const app = fastify();

app.register(cors, {
  origin: ["*"],
  methods: "GET,POST",
});
app.register(appRoutes);

app
  .listen({ port: 3333, host: "0.0.0.0" })
  .then(() => console.log("HTTP Server Running!"));
