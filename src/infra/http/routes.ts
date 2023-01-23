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
        created_at: today,
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
        created_at: {
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

  app.patch("/habit/:id/toggle", async (request) => {
    const toggleHbaitParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = toggleHbaitParamsSchema.parse(request.params);

    const today = dayjs().startOf("day").toDate();

    let day = await prismaService.day.findFirst({
      where: {
        date: today,
      },
    });

    if (!day) {
      day = await prismaService.day.create({
        data: {
          date: today,
        },
      });
    }

    const dayHabit = await prismaService.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        },
      },
    });

    // Desmarcar como habito completado
    if (dayHabit) {
      await prismaService.dayHabit.delete({
        where: {
          id: dayHabit.id,
        },
      });
    } else {
      // Completar o habito desse dia
      await prismaService.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
        },
      });
    }
  });

  app.get("/summary", async () => {
    // [{date: 17-01-2023, amount: 5, completed:1}, {date: 18-01-2023 amount: 2, completed:2}, {}]

    const summary = await prismaService.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE
            HWD.week_day = EXTRACT(DOW FROM D.date)
            AND H.created_at <= D.date
        ) as amount
      FROM days D
    `;

    return summary;
  });
}
