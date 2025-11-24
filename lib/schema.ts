import { pgTable, text, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import type { SupportedLanguage } from './types/language';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const interviewSessions = pgTable('interview_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  interviewType: varchar('interview_type', { length: 50 }).notNull(),
  targetRole: varchar('target_role', { length: 100 }),
  difficulty: varchar('difficulty', { length: 20 }),
  spokenLanguage: varchar('spoken_language', { length: 20 }).default('zh-TW').$type<SupportedLanguage>(),
  status: varchar('status', { length: 20 }).default('scheduled'),
  roomName: varchar('room_name', { length: 255 }).notNull().unique(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'),
  recordingUrl: text('recording_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversationTurns = pgTable('conversation_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => interviewSessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const evaluationReports = pgTable('evaluation_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => interviewSessions.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score'),
  clarityScore: integer('clarity_score'),
  structureScore: integer('structure_score'),
  confidenceScore: integer('confidence_score'),
  strengths: text('strengths'), // Plain text, not array
  improvements: text('improvements'), // Plain text, not array
  detailedFeedback: text('detailed_feedback'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

// TypeScript types for database models
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type NewInterviewSession = typeof interviewSessions.$inferInsert;

export type ConversationTurn = typeof conversationTurns.$inferSelect;
export type NewConversationTurn = typeof conversationTurns.$inferInsert;

export type EvaluationReport = typeof evaluationReports.$inferSelect;
export type NewEvaluationReport = typeof evaluationReports.$inferInsert;
