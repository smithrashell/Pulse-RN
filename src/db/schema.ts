import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Focus Area Types
export type FocusAreaType = 'SKILL' | 'HABIT' | 'PROJECT' | 'MAINTENANCE' | 'AREA';
export type FocusAreaStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ABANDONED';
export type ProgressUnit = 'COUNT' | 'PERCENTAGE' | 'PAGES' | 'REPS' | 'CUSTOM';
export type OutcomeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// ============ TABLES ============

export const focusAreas = sqliteTable('focus_areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull().$type<FocusAreaType>(),
  status: text('status').notNull().default('ACTIVE').$type<FocusAreaStatus>(),
  description: text('description'),
  targetOutcome: text('target_outcome'),
  targetTimeWeeklyMinutes: integer('target_time_weekly_minutes'),
  targetFrequency: integer('target_frequency'),
  identityStatement: text('identity_statement'),
  icon: text('icon').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  progressUnit: text('progress_unit').$type<ProgressUnit>(),
  progressUnitLabel: text('progress_unit_label'),
  progressTarget: integer('progress_target'),
  timeRequired: integer('time_required', { mode: 'boolean' }).notNull().default(true),
  completionReflection: text('completion_reflection'),
  abandonmentReason: text('abandonment_reason'),
  parentFocusAreaId: integer('parent_focus_area_id').references(() => focusAreas.id, {
    onDelete: 'set null',
  }),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  focusAreaId: integer('focus_area_id').references(() => focusAreas.id, { onDelete: 'set null' }),
  startTime: integer('start_time', { mode: 'timestamp_ms' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp_ms' }),
  durationMinutes: integer('duration_minutes'),
  qualityRating: integer('quality_rating'),
  note: text('note'),
});

export const dailyLogs = sqliteTable('daily_logs', {
  date: text('date').primaryKey(), // YYYY-MM-DD format
  morningIntention: text('morning_intention'),
  proofCommitment: text('proof_commitment'),
  eveningReflection: text('evening_reflection'),
  feelingRating: integer('feeling_rating'),
});

export const monthlyOutcomes = sqliteTable('monthly_outcomes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(), // YYYY-MM format
  title: text('title').notNull(),
  focusAreaId: integer('focus_area_id').references(() => focusAreas.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('NOT_STARTED').$type<OutcomeStatus>(),
  dueDate: text('due_date'), // YYYY-MM-DD format
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const weeklyIntentions = sqliteTable('weekly_intentions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  week: text('week').notNull(), // YYYY-Www format
  title: text('title').notNull(),
  monthlyOutcomeId: integer('monthly_outcome_id').references(() => monthlyOutcomes.id, {
    onDelete: 'set null',
  }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ============ RELATIONS ============

export const focusAreasRelations = relations(focusAreas, ({ one, many }) => ({
  parent: one(focusAreas, {
    fields: [focusAreas.parentFocusAreaId],
    references: [focusAreas.id],
    relationName: 'parentChild',
  }),
  children: many(focusAreas, { relationName: 'parentChild' }),
  sessions: many(sessions),
  monthlyOutcomes: many(monthlyOutcomes),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  focusArea: one(focusAreas, {
    fields: [sessions.focusAreaId],
    references: [focusAreas.id],
  }),
}));

export const monthlyOutcomesRelations = relations(monthlyOutcomes, ({ one, many }) => ({
  focusArea: one(focusAreas, {
    fields: [monthlyOutcomes.focusAreaId],
    references: [focusAreas.id],
  }),
  weeklyIntentions: many(weeklyIntentions),
}));

export const weeklyIntentionsRelations = relations(weeklyIntentions, ({ one }) => ({
  monthlyOutcome: one(monthlyOutcomes, {
    fields: [weeklyIntentions.monthlyOutcomeId],
    references: [monthlyOutcomes.id],
  }),
}));

// ============ TYPE EXPORTS ============

export type FocusArea = typeof focusAreas.$inferSelect;
export type NewFocusArea = typeof focusAreas.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type NewDailyLog = typeof dailyLogs.$inferInsert;
export type MonthlyOutcome = typeof monthlyOutcomes.$inferSelect;
export type NewMonthlyOutcome = typeof monthlyOutcomes.$inferInsert;
export type WeeklyIntention = typeof weeklyIntentions.$inferSelect;
export type NewWeeklyIntention = typeof weeklyIntentions.$inferInsert;
