import dayjs from "dayjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prismaService } from "../database/prismaService";

export async function appRoutes(app: FastifyInstance) {
  app.post("/habit", async (request) => {
    const createHabitBodySchema = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = createHabitBodySchema.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    await prismaService.habit.create({
      data: {
        title,
        createdAt: today,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            };
          }),
        },
      },
    });
  });

  app.get("/day", async (request) => {
    const getDayParamsSchema = z.object({
      date: z.coerce.date(),
    });

    const { date } = getDayParamsSchema.parse(request.query);

    const parsedDate = dayjs(date).startOf("day");
    const weekDay = parsedDate.get("day");

    const possibleHabit = await prismaService.habit.findMany({
      where: {
        createdAt: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const day = await prismaService.day.findFirst({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits = day?.dayHabits.map((dayHabit) => {
      return dayHabit.habit_id;
    });

    return { possibleHabit, completedHabits };
  });
}
