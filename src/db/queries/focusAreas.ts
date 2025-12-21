import { eq, and, isNull, ne } from 'drizzle-orm';
import { db } from '../client';
import { focusAreas, FocusArea, NewFocusArea, FocusAreaType, FocusAreaStatus } from '../schema';

// ============ HIERARCHY RULES ============
// Only AREA type can have children
// Focus areas (SKILL, HABIT, PROJECT, MAINTENANCE) cannot be parents
// When querying for potential parents, only return AREA types

export const focusAreaQueries = {
  // Get all active focus areas
  async getAllActive(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(and(eq(focusAreas.status, 'ACTIVE'), eq(focusAreas.archived, false)))
      .orderBy(focusAreas.sortOrder);
  },

  // Get all focus areas (including inactive)
  async getAll(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(eq(focusAreas.archived, false))
      .orderBy(focusAreas.sortOrder);
  },

  // Get focus area by ID
  async getById(id: number): Promise<FocusArea | undefined> {
    const results = await db.select().from(focusAreas).where(eq(focusAreas.id, id)).limit(1);
    return results[0];
  },

  // ============ ROOT LEVEL QUERIES (for Quick Start slider) ============

  // Get all root-level active focus areas (no parent)
  // These appear directly in the Quick Start slider
  async getRootActive(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(
        and(
          eq(focusAreas.status, 'ACTIVE'),
          eq(focusAreas.archived, false),
          isNull(focusAreas.parentFocusAreaId)
        )
      )
      .orderBy(focusAreas.sortOrder);
  },

  // Get all root-level focus areas (for Logs screen)
  async getRoot(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(and(eq(focusAreas.archived, false), isNull(focusAreas.parentFocusAreaId)))
      .orderBy(focusAreas.sortOrder);
  },

  // ============ HIERARCHY QUERIES ============

  // Get children of an Area (for expanding in Quick Start)
  async getChildren(parentId: number): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(and(eq(focusAreas.parentFocusAreaId, parentId), eq(focusAreas.archived, false)))
      .orderBy(focusAreas.sortOrder);
  },

  // Get active children only
  async getActiveChildren(parentId: number): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(
        and(
          eq(focusAreas.parentFocusAreaId, parentId),
          eq(focusAreas.status, 'ACTIVE'),
          eq(focusAreas.archived, false)
        )
      )
      .orderBy(focusAreas.sortOrder);
  },

  // Get potential parents for a focus area
  // IMPORTANT: Only AREA types can be parents!
  async getPotentialParents(excludeId?: number): Promise<FocusArea[]> {
    const conditions = [
      eq(focusAreas.type, 'AREA' as FocusAreaType),
      eq(focusAreas.status, 'ACTIVE'),
      eq(focusAreas.archived, false),
    ];

    if (excludeId) {
      conditions.push(ne(focusAreas.id, excludeId));
    }

    return db
      .select()
      .from(focusAreas)
      .where(and(...conditions))
      .orderBy(focusAreas.name);
  },

  // Get parent of a focus area
  async getParent(childId: number): Promise<FocusArea | undefined> {
    const child = await this.getById(childId);
    if (!child?.parentFocusAreaId) return undefined;
    return this.getById(child.parentFocusAreaId);
  },

  // ============ TYPE-BASED QUERIES ============

  // Get trackable focus areas (everything except AREA)
  // These can have timers started on them
  async getTrackable(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(
        and(
          ne(focusAreas.type, 'AREA' as FocusAreaType),
          eq(focusAreas.status, 'ACTIVE'),
          eq(focusAreas.archived, false)
        )
      )
      .orderBy(focusAreas.sortOrder);
  },

  // Get only Areas (parent containers)
  async getAreas(): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(and(eq(focusAreas.type, 'AREA' as FocusAreaType), eq(focusAreas.archived, false)))
      .orderBy(focusAreas.sortOrder);
  },

  // Get focus areas by type
  async getByType(type: FocusAreaType): Promise<FocusArea[]> {
    return db
      .select()
      .from(focusAreas)
      .where(and(eq(focusAreas.type, type), eq(focusAreas.archived, false)))
      .orderBy(focusAreas.sortOrder);
  },

  // ============ CRUD OPERATIONS ============

  // Create a new focus area
  async create(data: NewFocusArea): Promise<FocusArea> {
    // Validate: only AREA type can have children assigned to it
    if (data.parentFocusAreaId) {
      const parent = await this.getById(data.parentFocusAreaId);
      if (!parent || parent.type !== 'AREA') {
        throw new Error('Focus areas can only be assigned to Areas, not to other focus areas');
      }
    }

    const now = new Date();
    const results = await db
      .insert(focusAreas)
      .values({
        ...data,
        startedAt: data.startedAt || now,
        createdAt: data.createdAt || now,
      })
      .returning();
    return results[0];
  },

  // Update a focus area
  async update(id: number, data: Partial<NewFocusArea>): Promise<FocusArea> {
    // Validate parent assignment
    if (data.parentFocusAreaId !== undefined && data.parentFocusAreaId !== null) {
      const parent = await this.getById(data.parentFocusAreaId);
      if (!parent || parent.type !== 'AREA') {
        throw new Error('Focus areas can only be assigned to Areas, not to other focus areas');
      }
    }

    const results = await db.update(focusAreas).set(data).where(eq(focusAreas.id, id)).returning();
    return results[0];
  },

  // Update status with optional reflection
  async updateStatus(
    id: number,
    status: FocusAreaStatus,
    reflection?: { completion?: string; abandonment?: string }
  ): Promise<FocusArea> {
    const updateData: Partial<NewFocusArea> = {
      status,
      completedAt: status === 'COMPLETED' || status === 'ABANDONED' ? new Date() : undefined,
    };

    if (reflection?.completion) {
      updateData.completionReflection = reflection.completion;
    }
    if (reflection?.abandonment) {
      updateData.abandonmentReason = reflection.abandonment;
    }

    return this.update(id, updateData);
  },

  // Assign to parent (with validation)
  async assignToParent(id: number, parentId: number | null): Promise<FocusArea> {
    if (parentId !== null) {
      const parent = await this.getById(parentId);
      if (!parent || parent.type !== 'AREA') {
        throw new Error('Focus areas can only be assigned to Areas');
      }
    }
    return this.update(id, { parentFocusAreaId: parentId });
  },

  // Archive (soft delete)
  async archive(id: number): Promise<void> {
    await db.update(focusAreas).set({ archived: true }).where(eq(focusAreas.id, id));
  },

  // Unarchive
  async unarchive(id: number): Promise<void> {
    await db.update(focusAreas).set({ archived: false }).where(eq(focusAreas.id, id));
  },

  // Hard delete
  async delete(id: number): Promise<void> {
    await db.delete(focusAreas).where(eq(focusAreas.id, id));
  },

  // ============ UTILITY FUNCTIONS ============

  // Check if a focus area can have children (only AREA type)
  canHaveChildren(focusArea: FocusArea): boolean {
    return focusArea.type === 'AREA';
  },

  // Check if a focus area is trackable (can start timer)
  isTrackable(focusArea: FocusArea): boolean {
    return focusArea.type !== 'AREA';
  },

  // Get count of children for an Area
  async getChildCount(parentId: number): Promise<number> {
    const children = await this.getChildren(parentId);
    return children.length;
  },
};

export default focusAreaQueries;
