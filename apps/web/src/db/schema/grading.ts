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
  "other",
]);

export const gradingSplitModeEnum = pgEnum("grading_split_mode", [
  "fixed_pages",
  // future: "similarity" — match page 1 of blank across full scan
]);

// ── Question detail shapes (stored as JSONB) ──────────────────────────────────

export type MultipleChoiceOption = {
  /** Short label shown to students, e.g. "A", "B", "C", "D" */
  identifier?: string;
  text: string;
  correct: boolean;
};

export type MultipleChoiceDetails = {
  prompt: string;
  options: MultipleChoiceOption[];
};

export type ShortAnswerDetails = {
  prompt: string;
  sampleAnswer: string;
  explanation?: string;
  /** Things that must be present (or absent) in the response */
  criteria?: string[];
};

export type OtherDetails = {
  prompt: string;
  answer: string;
  explanation?: string;
};

export type QuestionDetails =
  | MultipleChoiceDetails
  | ShortAnswerDetails
  | OtherDetails;

export type StudentAnswer = {
  questionNumber: string;
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
  /** String to support labels like "1B", "2a", etc. */
  questionNumber: text("question_number").notNull(),
  questionType: gradingQuestionTypeEnum("question_type").notNull(),
  details: jsonb("details").$type<QuestionDetails>().notNull(),
  points: integer("points").notNull().default(1),
  /** Position in the original exam; used for stable sort since questionNumber is a string */
  sortOrder: integer("sort_order").notNull().default(0),
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
