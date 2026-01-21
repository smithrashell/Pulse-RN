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
  quarterlyGoalId: integer('quarterly_goal_id'), // FK added via relation, references quarterlyGoals
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

export const weeklyReviews = sqliteTable('weekly_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  week: text('week').notNull(), // YYYY-Www format
  whatWorked: text('what_worked'),
  whatDidntWork: text('what_didnt_work'),
  tryNextWeek: text('try_next_week'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const monthlyReviews = sqliteTable('monthly_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(), // YYYY-MM format
  biggestWin: text('biggest_win'),
  carryForward: text('carry_forward'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// Quarterly Goal Status - reuses OutcomeStatus pattern
export type QuarterlyGoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export const quarterlyGoals = sqliteTable('quarterly_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quarter: text('quarter').notNull(), // YYYY-Qq format (e.g., "2026-Q1")
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull(), // 1-6
  focusAreaId: integer('focus_area_id').references(() => focusAreas.id, { onDelete: 'set null' }),
  lifeGoalId: integer('life_goal_id'), // Link to life goal if created from one
  status: text('status').notNull().default('NOT_STARTED').$type<QuarterlyGoalStatus>(),
  completionReflection: text('completion_reflection'),

  // Flinch Test fields
  wasStretched: integer('was_stretched', { mode: 'boolean' }).notNull().default(false),
  originalGoal: text('original_goal'), // What they first wrote (before stretching)

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const quarterlyReviews = sqliteTable('quarterly_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quarter: text('quarter').notNull(), // YYYY-Qq format
  biggestWin: text('biggest_win'),
  biggestChallenge: text('biggest_challenge'),
  lessonsLearned: text('lessons_learned'),
  focusNextQuarter: text('focus_next_quarter'),
  goalsCompleted: integer('goals_completed'),
  goalsTotal: integer('goals_total'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// Discipline Types
export type DisciplineFrequency =
  | 'DAILY' // Every day
  | 'WEEKDAYS' // Mon-Fri
  | 'WEEKENDS' // Sat-Sun
  | 'SPECIFIC_DAYS' // Custom (e.g., Tue/Thu/Sun)
  | 'ALWAYS'; // Contextual - "no phone in bedroom"

export type DisciplineStatus =
  | 'ACTIVE' // Currently tracking
  | 'INGRAINED' // Graduated - automatic now
  | 'EVOLVED' // Leveled up to new version
  | 'RETIRED'; // No longer tracking

export type DisciplineRating = 'NAILED_IT' | 'CLOSE' | 'MISSED';

export const disciplines = sqliteTable('disciplines', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Content
  title: text('title').notNull(), // "Wake up at 5 AM"
  description: text('description'), // Why this matters

  // Schedule
  frequency: text('frequency').notNull().$type<DisciplineFrequency>(),
  specificDays: text('specific_days'), // JSON: ["monday", "wednesday", "friday"]

  // For time-based disciplines
  targetTime: text('target_time'), // "05:00" or null
  flexibilityMinutes: integer('flexibility_minutes').default(15), // ±15 min = success

  // Which quarter (optional - can be ongoing)
  quarter: text('quarter'), // YYYY-Qq or null for ongoing

  // Status & lifecycle
  status: text('status').notNull().default('ACTIVE').$type<DisciplineStatus>(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  ingrainedAt: integer('ingrained_at', { mode: 'timestamp_ms' }),

  // Evolution tracking
  evolvedFromId: integer('evolved_from_id'),

  // Reflections
  ingrainedReflection: text('ingrained_reflection'), // "This is just who I am now"
  retiredReason: text('retired_reason'),

  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const disciplineChecks = sqliteTable('discipline_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  disciplineId: integer('discipline_id')
    .references(() => disciplines.id, { onDelete: 'cascade' })
    .notNull(),

  date: text('date').notNull(), // YYYY-MM-DD

  // Self-assessment (not binary - reduces shame)
  rating: text('rating').notNull().$type<DisciplineRating>(),

  // For time-based disciplines
  actualTime: text('actual_time'), // "05:12" - optional

  // Optional note
  note: text('note'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

// Life Goals Types
export type TimeWindow = 'SHORT_TERM' | 'MID_TERM' | 'MID_LATE_TERM' | 'LONG_TERM';
// SHORT_TERM: 1-2 years
// MID_TERM: 3-5 years
// MID_LATE_TERM: 6-9 years
// LONG_TERM: 10-20 years

export type LifeGoalStatus = 'ACTIVE' | 'IN_MOTION' | 'ACHIEVED' | 'DEFERRED' | 'RELEASED';

export const lifeGoals = sqliteTable('life_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Core content
  title: text('title').notNull(),
  description: text('description'),

  // Organization
  category: text('category').notNull(),
  timeWindow: text('time_window').notNull().$type<TimeWindow>(),

  // Status tracking
  status: text('status').notNull().default('ACTIVE').$type<LifeGoalStatus>(),

  // Stretch indicator (second 50 goals)
  isStretchGoal: integer('is_stretch_goal', { mode: 'boolean' }).notNull().default(false),

  // Optional linking
  focusAreaId: integer('focus_area_id').references(() => focusAreas.id, { onDelete: 'set null' }),

  // Reflection
  achievedAt: integer('achieved_at', { mode: 'timestamp_ms' }),
  achievementReflection: text('achievement_reflection'),

  // Metadata
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const lifeGoalCheckIns = sqliteTable('life_goal_check_ins', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // When (first Monday of each month)
  month: text('month').notNull(), // YYYY-MM format

  // Reflection
  goalsAchievedCount: integer('goals_achieved_count').notNull().default(0),
  goalsInMotionCount: integer('goals_in_motion_count').notNull().default(0),
  newConnectionsNote: text('new_connections_note'),
  generalReflection: text('general_reflection'),

  // Timestamps
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

// Accountability Partner Types
export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export const accountabilityPartner = sqliteTable('accountability_partner', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Partner info (just a name - no account needed)
  name: text('name').notNull(),

  // Check-in schedule
  checkInDay: text('check_in_day').notNull().default('Monday').$type<DayOfWeek>(),
  checkInTime: text('check_in_time'), // Optional preferred time "10:00"

  // Contact info (optional, for context)
  contactMethod: text('contact_method'), // e.g., "Call", "Coffee at Blue Bottle"

  // Status
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const partnerCheckIns = sqliteTable('partner_check_ins', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  partnerId: integer('partner_id')
    .references(() => accountabilityPartner.id, { onDelete: 'cascade' })
    .notNull(),

  // When
  week: text('week').notNull(), // YYYY-Www format
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),

  // What was discussed
  topicsDiscussed: text('topics_discussed'),
  partnerFeedback: text('partner_feedback'), // What did they say?
  commitmentMade: text('commitment_made'), // What did you commit to?

  // Quality
  feltProductiveRating: integer('felt_productive_rating'), // 1-5

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
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
  quarterlyGoal: one(quarterlyGoals, {
    fields: [monthlyOutcomes.quarterlyGoalId],
    references: [quarterlyGoals.id],
  }),
  weeklyIntentions: many(weeklyIntentions),
}));

export const weeklyIntentionsRelations = relations(weeklyIntentions, ({ one }) => ({
  monthlyOutcome: one(monthlyOutcomes, {
    fields: [weeklyIntentions.monthlyOutcomeId],
    references: [monthlyOutcomes.id],
  }),
}));

export const quarterlyGoalsRelations = relations(quarterlyGoals, ({ one, many }) => ({
  focusArea: one(focusAreas, {
    fields: [quarterlyGoals.focusAreaId],
    references: [focusAreas.id],
  }),
  monthlyOutcomes: many(monthlyOutcomes),
}));

export const disciplinesRelations = relations(disciplines, ({ one, many }) => ({
  evolvedFrom: one(disciplines, {
    fields: [disciplines.evolvedFromId],
    references: [disciplines.id],
    relationName: 'evolution',
  }),
  evolvedTo: many(disciplines, { relationName: 'evolution' }),
  checks: many(disciplineChecks),
}));

export const disciplineChecksRelations = relations(disciplineChecks, ({ one }) => ({
  discipline: one(disciplines, {
    fields: [disciplineChecks.disciplineId],
    references: [disciplines.id],
  }),
}));

export const accountabilityPartnerRelations = relations(accountabilityPartner, ({ many }) => ({
  checkIns: many(partnerCheckIns),
}));

export const partnerCheckInsRelations = relations(partnerCheckIns, ({ one }) => ({
  partner: one(accountabilityPartner, {
    fields: [partnerCheckIns.partnerId],
    references: [accountabilityPartner.id],
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
export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviews.$inferInsert;
export type MonthlyReview = typeof monthlyReviews.$inferSelect;
export type NewMonthlyReview = typeof monthlyReviews.$inferInsert;
export type QuarterlyGoal = typeof quarterlyGoals.$inferSelect;
export type NewQuarterlyGoal = typeof quarterlyGoals.$inferInsert;
export type QuarterlyReview = typeof quarterlyReviews.$inferSelect;
export type NewQuarterlyReview = typeof quarterlyReviews.$inferInsert;
export type Discipline = typeof disciplines.$inferSelect;
export type NewDiscipline = typeof disciplines.$inferInsert;
export type DisciplineCheck = typeof disciplineChecks.$inferSelect;
export type NewDisciplineCheck = typeof disciplineChecks.$inferInsert;
export type LifeGoal = typeof lifeGoals.$inferSelect;
export type NewLifeGoal = typeof lifeGoals.$inferInsert;
export type LifeGoalCheckIn = typeof lifeGoalCheckIns.$inferSelect;
export type NewLifeGoalCheckIn = typeof lifeGoalCheckIns.$inferInsert;
export type AccountabilityPartner = typeof accountabilityPartner.$inferSelect;
export type NewAccountabilityPartner = typeof accountabilityPartner.$inferInsert;
export type PartnerCheckIn = typeof partnerCheckIns.$inferSelect;
export type NewPartnerCheckIn = typeof partnerCheckIns.$inferInsert;
