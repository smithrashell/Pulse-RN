import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../client';
import {
  disciplines,
  disciplineChecks,
  Discipline,
  NewDiscipline,
  DisciplineCheck,
  NewDisciplineCheck,
  DisciplineStatus,
  DisciplineRating,
} from '../schema';

export const disciplineQueries = {
  // Get all disciplines
  async getAll(): Promise<Discipline[]> {
    return db.select().from(disciplines).orderBy(desc(disciplines.createdAt));
  },

  // Get active disciplines
  async getActive(): Promise<Discipline[]> {
    return db
      .select()
      .from(disciplines)
      .where(eq(disciplines.status, 'ACTIVE'))
      .orderBy(asc(disciplines.createdAt));
  },

  // Get disciplines by status
  async getByStatus(status: DisciplineStatus): Promise<Discipline[]> {
    return db
      .select()
      .from(disciplines)
      .where(eq(disciplines.status, status))
      .orderBy(desc(disciplines.createdAt));
  },

  // Get discipline by ID
  async getById(id: number): Promise<Discipline | undefined> {
    const results = await db
      .select()
      .from(disciplines)
      .where(eq(disciplines.id, id))
      .limit(1);
    return results[0];
  },

  // Get disciplines for a quarter
  async getForQuarter(quarter: string): Promise<Discipline[]> {
    return db
      .select()
      .from(disciplines)
      .where(eq(disciplines.quarter, quarter))
      .orderBy(asc(disciplines.createdAt));
  },

  // Get active count
  async getActiveCount(): Promise<number> {
    const results = await db
      .select()
      .from(disciplines)
      .where(eq(disciplines.status, 'ACTIVE'));
    return results.length;
  },

  // ============ CRUD OPERATIONS ============

  async create(data: Omit<NewDiscipline, 'createdAt' | 'updatedAt'>): Promise<Discipline> {
    const now = new Date();
    const results = await db
      .insert(disciplines)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewDiscipline>): Promise<Discipline> {
    const results = await db
      .update(disciplines)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(disciplines.id, id))
      .returning();
    return results[0];
  },

  async updateStatus(id: number, status: DisciplineStatus): Promise<Discipline> {
    const updateData: Partial<NewDiscipline> = { status };
    if (status === 'INGRAINED') {
      updateData.ingrainedAt = new Date();
    }
    return this.update(id, updateData);
  },

  async graduate(id: number, reflection: string): Promise<Discipline> {
    return this.update(id, {
      status: 'INGRAINED',
      ingrainedAt: new Date(),
      ingrainedReflection: reflection,
    });
  },

  async retire(id: number, reason: string): Promise<Discipline> {
    return this.update(id, {
      status: 'RETIRED',
      retiredReason: reason,
    });
  },

  async evolve(id: number, newDisciplineData: Omit<NewDiscipline, 'createdAt' | 'updatedAt' | 'evolvedFromId'>): Promise<Discipline> {
    // Mark old discipline as evolved
    await this.update(id, { status: 'EVOLVED' });

    // Create new evolved discipline
    return this.create({
      ...newDisciplineData,
      evolvedFromId: id,
    });
  },

  async delete(id: number): Promise<void> {
    await db.delete(disciplines).where(eq(disciplines.id, id));
  },
};

export const disciplineCheckQueries = {
  // Get all checks for a discipline
  async getForDiscipline(disciplineId: number): Promise<DisciplineCheck[]> {
    return db
      .select()
      .from(disciplineChecks)
      .where(eq(disciplineChecks.disciplineId, disciplineId))
      .orderBy(desc(disciplineChecks.date));
  },

  // Get check for a specific date
  async getForDate(disciplineId: number, date: string): Promise<DisciplineCheck | undefined> {
    const results = await db
      .select()
      .from(disciplineChecks)
      .where(
        and(
          eq(disciplineChecks.disciplineId, disciplineId),
          eq(disciplineChecks.date, date)
        )
      )
      .limit(1);
    return results[0];
  },

  // Get all checks for a date (all disciplines)
  async getAllForDate(date: string): Promise<DisciplineCheck[]> {
    return db
      .select()
      .from(disciplineChecks)
      .where(eq(disciplineChecks.date, date));
  },

  // Get checks in date range
  async getInDateRange(
    disciplineId: number,
    startDate: string,
    endDate: string
  ): Promise<DisciplineCheck[]> {
    return db
      .select()
      .from(disciplineChecks)
      .where(
        and(
          eq(disciplineChecks.disciplineId, disciplineId),
          // SQLite string comparison works for YYYY-MM-DD format
        )
      )
      .orderBy(desc(disciplineChecks.date));
  },

  // Get recent checks for a discipline
  async getRecent(disciplineId: number, limit: number = 30): Promise<DisciplineCheck[]> {
    return db
      .select()
      .from(disciplineChecks)
      .where(eq(disciplineChecks.disciplineId, disciplineId))
      .orderBy(desc(disciplineChecks.date))
      .limit(limit);
  },

  // ============ CRUD OPERATIONS ============

  async create(data: Omit<NewDisciplineCheck, 'createdAt'>): Promise<DisciplineCheck> {
    // Check if a check already exists for this date
    const existing = await this.getForDate(data.disciplineId, data.date);
    if (existing) {
      // Update existing check
      return this.update(existing.id, data);
    }

    const results = await db
      .insert(disciplineChecks)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewDisciplineCheck>): Promise<DisciplineCheck> {
    const results = await db
      .update(disciplineChecks)
      .set(data)
      .where(eq(disciplineChecks.id, id))
      .returning();
    return results[0];
  },

  async delete(id: number): Promise<void> {
    await db.delete(disciplineChecks).where(eq(disciplineChecks.id, id));
  },

  // Upsert - create or update check for a date
  async upsert(data: Omit<NewDisciplineCheck, 'createdAt'>): Promise<DisciplineCheck> {
    return this.create(data);
  },
};

export default {
  disciplines: disciplineQueries,
  checks: disciplineCheckQueries,
};
