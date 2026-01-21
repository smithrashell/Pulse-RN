import { eq, desc, and } from 'drizzle-orm';
import { db } from '../client';
import {
  accountabilityPartner,
  partnerCheckIns,
  AccountabilityPartner,
  NewAccountabilityPartner,
  PartnerCheckIn,
  NewPartnerCheckIn,
} from '../schema';

export const accountabilityPartnerQueries = {
  // Get active partner (only one allowed for simplicity)
  async getActive(): Promise<AccountabilityPartner | undefined> {
    const results = await db
      .select()
      .from(accountabilityPartner)
      .where(eq(accountabilityPartner.isActive, true))
      .limit(1);
    return results[0];
  },

  // Get all partners
  async getAll(): Promise<AccountabilityPartner[]> {
    return db.select().from(accountabilityPartner).orderBy(desc(accountabilityPartner.createdAt));
  },

  // Get by ID
  async getById(id: number): Promise<AccountabilityPartner | undefined> {
    const results = await db
      .select()
      .from(accountabilityPartner)
      .where(eq(accountabilityPartner.id, id))
      .limit(1);
    return results[0];
  },

  // Create partner
  async create(
    data: Omit<NewAccountabilityPartner, 'createdAt' | 'updatedAt'>
  ): Promise<AccountabilityPartner> {
    const now = new Date();
    const results = await db
      .insert(accountabilityPartner)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  // Update partner
  async update(
    id: number,
    data: Partial<NewAccountabilityPartner>
  ): Promise<AccountabilityPartner> {
    const results = await db
      .update(accountabilityPartner)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accountabilityPartner.id, id))
      .returning();
    return results[0];
  },

  // Deactivate partner
  async deactivate(id: number): Promise<void> {
    await db
      .update(accountabilityPartner)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accountabilityPartner.id, id));
  },

  // Delete partner
  async delete(id: number): Promise<void> {
    await db.delete(accountabilityPartner).where(eq(accountabilityPartner.id, id));
  },
};

export const partnerCheckInQueries = {
  // Get check-ins for a partner
  async getForPartner(partnerId: number): Promise<PartnerCheckIn[]> {
    return db
      .select()
      .from(partnerCheckIns)
      .where(eq(partnerCheckIns.partnerId, partnerId))
      .orderBy(desc(partnerCheckIns.week));
  },

  // Get check-in for a specific week
  async getForWeek(partnerId: number, week: string): Promise<PartnerCheckIn | undefined> {
    const results = await db
      .select()
      .from(partnerCheckIns)
      .where(and(eq(partnerCheckIns.partnerId, partnerId), eq(partnerCheckIns.week, week)))
      .limit(1);
    return results[0];
  },

  // Get recent check-ins
  async getRecent(partnerId: number, limit: number = 10): Promise<PartnerCheckIn[]> {
    return db
      .select()
      .from(partnerCheckIns)
      .where(eq(partnerCheckIns.partnerId, partnerId))
      .orderBy(desc(partnerCheckIns.week))
      .limit(limit);
  },

  // Create check-in
  async create(data: Omit<NewPartnerCheckIn, 'createdAt'>): Promise<PartnerCheckIn> {
    const results = await db
      .insert(partnerCheckIns)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return results[0];
  },

  // Update check-in
  async update(id: number, data: Partial<NewPartnerCheckIn>): Promise<PartnerCheckIn> {
    const results = await db
      .update(partnerCheckIns)
      .set(data)
      .where(eq(partnerCheckIns.id, id))
      .returning();
    return results[0];
  },

  // Complete check-in
  async complete(id: number): Promise<PartnerCheckIn> {
    const results = await db
      .update(partnerCheckIns)
      .set({ completedAt: new Date() })
      .where(eq(partnerCheckIns.id, id))
      .returning();
    return results[0];
  },

  // Delete check-in
  async delete(id: number): Promise<void> {
    await db.delete(partnerCheckIns).where(eq(partnerCheckIns.id, id));
  },
};

export default {
  partner: accountabilityPartnerQueries,
  checkIns: partnerCheckInQueries,
};
