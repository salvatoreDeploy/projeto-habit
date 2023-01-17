import fastify from "fastify";
import { prismaService } from "./infra/database/prismaService";
import cors from "@fastify/cors";

const app = fastify();

app.register(cors);

app.get("/", async () => {
  const habit = await prismaService.habit.findMany({});

  return habit;
});

app.listen({ port: 3333 }).then(() => console.log("HTTP Server Running!"));
