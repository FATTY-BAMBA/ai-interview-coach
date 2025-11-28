import { pgTable, uuid, text, timestamp, integer, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
  spokenLanguage: varchar('spoken_language', { length: 10 }).default('zh-TW'),
  
  // Candidate Profile Fields (Phase 3)
  candidateRole: varchar('candidate_role', { length: 100 }),
  candidateSeniority: varchar('candidate_seniority', { length: 50 }),
  candidateIndustry: varchar('candidate_industry', { length: 100 }),
  candidateYearsExperience: integer('candidate_years_experience'),
  
  // NEW: Feedback Mode (Phase 4 - Practice vs Real)
  feedbackMode: varchar('feedback_mode', { length: 20 }).default('real'), // 'practice' or 'real'
  
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  interviewSessions: many(interviewSessions),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewSessions.userId],
    references: [users.id],
  }),
  conversationTurns: many(conversationTurns),
  evaluationReports: many(evaluationReports),
}));

export const conversationTurnsRelations = relations(conversationTurns, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [conversationTurns.sessionId],
    references: [interviewSessions.id],
  }),
}));

export const evaluationReportsRelations = relations(evaluationReports, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [evaluationReports.sessionId],
    references: [interviewSessions.id],
  }),
}));

// ============================================
// TYPE EXPORTS (for TypeScript)
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type NewInterviewSession = typeof interviewSessions.$inferInsert;

export type ConversationTurn = typeof conversationTurns.$inferSelect;
export type NewConversationTurn = typeof conversationTurns.$inferInsert;

export type EvaluationReport = typeof evaluationReports.$inferSelect;
export type NewEvaluationReport = typeof evaluationReports.$inferInsert;

// ============================================
// CANDIDATE PROFILE CONSTANTS
// ============================================

export const SENIORITY_LEVELS = [
  { value: 'junior', label: '初階 Junior', labelEn: 'Junior (0-2 years)' },
  { value: 'mid', label: '中階 Mid-level', labelEn: 'Mid-level (2-5 years)' },
  { value: 'senior', label: '資深 Senior', labelEn: 'Senior (5-8 years)' },
  { value: 'lead', label: '主管 Lead/Manager', labelEn: 'Lead/Manager (8+ years)' },
  { value: 'executive', label: '高管 Executive', labelEn: 'Executive (10+ years)' },
] as const;

export const INDUSTRIES = [
  { value: 'tech', label: '科技業', labelEn: 'Technology' },
  { value: 'finance', label: '金融業', labelEn: 'Finance/Banking' },
  { value: 'healthcare', label: '醫療業', labelEn: 'Healthcare' },
  { value: 'ecommerce', label: '電商業', labelEn: 'E-commerce/Retail' },
  { value: 'manufacturing', label: '製造業', labelEn: 'Manufacturing' },
  { value: 'consulting', label: '顧問業', labelEn: 'Consulting' },
  { value: 'media', label: '媒體業', labelEn: 'Media/Entertainment' },
  { value: 'education', label: '教育業', labelEn: 'Education' },
  { value: 'government', label: '公部門', labelEn: 'Government/Public Sector' },
  { value: 'other', label: '其他', labelEn: 'Other' },
] as const;

export const COMMON_ROLES = [
  // Tech
  { value: 'software-engineer', label: '軟體工程師', labelEn: 'Software Engineer' },
  { value: 'frontend-engineer', label: '前端工程師', labelEn: 'Frontend Engineer' },
  { value: 'backend-engineer', label: '後端工程師', labelEn: 'Backend Engineer' },
  { value: 'fullstack-engineer', label: '全端工程師', labelEn: 'Fullstack Engineer' },
  { value: 'data-scientist', label: '資料科學家', labelEn: 'Data Scientist' },
  { value: 'data-engineer', label: '資料工程師', labelEn: 'Data Engineer' },
  { value: 'ml-engineer', label: 'ML工程師', labelEn: 'ML Engineer' },
  { value: 'devops-engineer', label: 'DevOps工程師', labelEn: 'DevOps Engineer' },
  { value: 'product-manager', label: '產品經理', labelEn: 'Product Manager' },
  { value: 'project-manager', label: '專案經理', labelEn: 'Project Manager' },
  { value: 'engineering-manager', label: '工程經理', labelEn: 'Engineering Manager' },
  { value: 'ux-designer', label: 'UX設計師', labelEn: 'UX Designer' },
  { value: 'ui-designer', label: 'UI設計師', labelEn: 'UI Designer' },
  // General
  { value: 'marketing-manager', label: '行銷經理', labelEn: 'Marketing Manager' },
  { value: 'sales-manager', label: '業務經理', labelEn: 'Sales Manager' },
  { value: 'hr-manager', label: '人資經理', labelEn: 'HR Manager' },
  { value: 'business-analyst', label: '商業分析師', labelEn: 'Business Analyst' },
  { value: 'consultant', label: '顧問', labelEn: 'Consultant' },
  { value: 'other', label: '其他職位', labelEn: 'Other Role' },
] as const;

// ============================================
// FEEDBACK MODE CONSTANTS (Phase 4)
// ============================================

export const FEEDBACK_MODES = [
  { value: 'practice', label: '練習模式', labelEn: 'Practice Mode', icon: '🎓' },
  { value: 'real', label: '實戰模式', labelEn: 'Real Mode', icon: '💼' },
] as const;