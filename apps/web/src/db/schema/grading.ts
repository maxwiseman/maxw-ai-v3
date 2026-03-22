import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const gradingSessionStatusEnum = pgEnum("grading_session_status", [
  "draft",
  "answer_key_ready",
  "processing",
  "complete",
  "error",
]);

export const gradingQuestionTypeEnum = pgEnum("grading_question_type", [
  "multiple_choice",
  "short_answer",
  "true_false",
]);

export const gradingSplitModeEnum = pgEnum("grading_split_mode", [
  "fixed_pages",
  // future: "similarity" — match page 1 of blank across full scan
]);

export type StudentAnswer = {
  questionNumber: number;
  givenAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  feedback: string;
};

export const gradingSession = pgTable("grading_session", {
  id: text("id").primaryKey().$defaultFn(crypto.randomUUID),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: gradingSessionStatusEnum("status").notNull().default("draft"),
  blankPdfR2Key: text("blank_pdf_r2_key"),
  fullScanR2Key: text("full_scan_r2_key"),
  pagesPerStudent: integer("pages_per_student"),
  splitMode: gradingSplitModeEnum("split_mode")
    .notNull()
    .default("fixed_pages"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const gradingAnswerKey = pgTable("grading_answer_key", {
  id: text("id").primaryKey().$defaultFn(crypto.randomUUID),
  sessionId: text("session_id")
    .notNull()
    .references(() => gradingSession.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  questionType: gradingQuestionTypeEnum("question_type").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
});

export const gradingResult = pgTable("grading_result", {
  id: text("id").primaryKey().$defaultFn(crypto.randomUUID),
  sessionId: text("session_id")
    .notNull()
    .references(() => gradingSession.id, { onDelete: "cascade" }),
  studentIndex: integer("student_index").notNull(),
  studentName: text("student_name"),
  r2Key: text("r2_key"),
  score: integer("score"),
  maxScore: integer("max_score"),
  answers: jsonb("answers").$type<StudentAnswer[]>(),
  gradedAt: timestamp("graded_at"),
});

export const gradingSessionRelations = relations(
  gradingSession,
  ({ many }) => ({
    answerKey: many(gradingAnswerKey),
    results: many(gradingResult),
  }),
);

export const gradingAnswerKeyRelations = relations(
  gradingAnswerKey,
  ({ one }) => ({
    session: one(gradingSession, {
      fields: [gradingAnswerKey.sessionId],
      references: [gradingSession.id],
    }),
  }),
);

export const gradingResultRelations = relations(gradingResult, ({ one }) => ({
  session: one(gradingSession, {
    fields: [gradingResult.sessionId],
    references: [gradingSession.id],
  }),
}));

export type GradingSession = typeof gradingSession.$inferSelect;
export type GradingAnswerKey = typeof gradingAnswerKey.$inferSelect;
export type GradingResult = typeof gradingResult.$inferSelect;
