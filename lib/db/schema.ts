import { pgTable, uuid, text, timestamp, integer, jsonb, varchar } from 'drizzle-orm/pg-core';

// Users table - simplified for our needs
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'), // Optional - empty for OAuth users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Interview sessions
export const interviewSessions = pgTable('interview_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  roomName: varchar('room_name', { length: 255 }).notNull().unique(),
  interviewType: varchar('interview_type', { length: 50 }).notNull(),
  targetRole: varchar('target_role', { length: 255 }).default('Software Engineer'),
  difficulty: varchar('difficulty', { length: 50 }).default('medium'),
  status: varchar('status', { length: 50 }).default('scheduled'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'),
  recordingUrl: text('recording_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversation turns (transcript)
export const conversationTurns = pgTable('conversation_turns', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => interviewSessions.id).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Evaluation reports
export const evaluationReports = pgTable('evaluation_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => interviewSessions.id).notNull(),
  overallScore: integer('overall_score').notNull(),
  clarityScore: integer('clarity_score').notNull(),
  structureScore: integer('structure_score').notNull(),
  confidenceScore: integer('confidence_score').notNull(),
  strengths: jsonb('strengths').notNull(),
  improvements: jsonb('improvements').notNull(),
  detailedFeedback: text('detailed_feedback').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});
