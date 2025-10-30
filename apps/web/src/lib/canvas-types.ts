export interface CanvasDiscussionView {
  unread_entries: number[];
  forced_entries: number[];
  entry_ratings: { [key: string]: number };
  participants: User[];
  view: CanvasDiscussionEntry[];
  new_entries: number[];
}

export interface CanvasDiscussionEntry {
  id: number;
  user_id: number;
  parent_id: null;
  created_at: Date;
  updated_at: Date;
  rating_count: number | null;
  rating_sum: number | null;
  message: string;
  replies?: CanvasDiscussionEntry[];
  editor_id?: number;
}

export interface CanvasDiscussion {
  id: number;
  title: string;
  assignment_id: number;
  delayed_post_at: Date;
  lock_at: null;
  created_at: Date;
  last_reply_at: Date;
  posted_at: Date;
  root_topic_id: null;
  podcast_has_student_posts: boolean;
  discussion_type: string;
  position: null;
  allow_rating: boolean;
  only_graders_can_rate: boolean;
  sort_by_rating: boolean;
  is_section_specific: boolean;
  anonymous_state: null;
  summary_enabled: boolean;
  user_name: null;
  discussion_subentry_count: number;
  permissions: Permissions;
  require_initial_post: null;
  user_can_see_posts: boolean;
  podcast_url: null;
  read_state: string;
  unread_count: number;
  subscribed: boolean;
  attachments: any[];
  published: boolean;
  can_unpublish: boolean;
  locked: boolean;
  can_lock: boolean;
  comments_disabled: boolean;
  author: User;
  html_url: string;
  url: string;
  pinned: boolean;
  group_category_id: null;
  can_group: boolean;
  topic_children: any[];
  group_topic_children: any[];
  locked_for_user: boolean;
  message: string;
  assignment: CanvasAssignment;
  todo_date: null;
  is_announcement: boolean;
  sort_order: string;
  sort_order_locked: boolean;
  expanded: boolean;
  expanded_locked: boolean;
}

export interface CanvasPage {
  url: string;
  title: string;
  created_at: Date;
  editing_roles: string;
  page_id: number;
  last_edited_by: User;
  published: boolean;
  hide_from_students: boolean;
  front_page: boolean;
  html_url: string;
  todo_date: null;
  publish_at: null;
  updated_at: Date;
  locked_for_user: boolean;
  body: string;
}

export type CanvasAssignment = {
  id: number;
  description: string;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  points_possible: number;
  grading_type: string;
  assignment_group_id: number;
  grading_standard_id: number | null;
  created_at: string;
  updated_at: string;
  peer_reviews: boolean;
  automatic_peer_reviews: boolean;
  position: number;
  grade_group_students_individually: boolean;
  anonymous_peer_reviews: boolean;
  group_category_id: number | null;
  post_to_sis: boolean;
  moderated_grading: boolean;
  omit_from_final_grade: boolean;
  intra_group_peer_reviews: boolean;
  anonymous_instructor_annotations: boolean;
  anonymous_grading: boolean;
  graders_anonymous_to_graders: boolean;
  grader_count: number;
  grader_comments_visible_to_graders: boolean;
  final_grader_id: number | null;
  grader_names_visible_to_final_grader: boolean;
  allowed_attempts: number;
  annotatable_attachment_id: number | null;
  hide_in_gradebook: boolean;
  suppress_assignment: boolean;
  secure_params: string;
  lti_context_id: string;
  course_id: number;
  name: string;
  submission_types: string[];
  has_submitted_submissions: boolean;
  due_date_required: boolean;
  max_name_length: number;
  in_closed_grading_period: boolean;
  graded_submissions_exist: boolean;
  is_quiz_assignment: boolean;
  can_duplicate: boolean;
  original_course_id: number | null;
  original_assignment_id: number | null;
  original_lti_resource_link_id: number | null;
  original_assignment_name: string | null;
  original_quiz_id: number | null;
  workflow_state: string;
  important_dates: boolean;
  muted: boolean;
  html_url: string;
  allowed_extensions: string[];
  use_rubric_for_grading: boolean;
  free_form_criterion_comments: boolean;
  rubric: RubricItem[];
  rubric_settings: RubricSettings;
  published: boolean;
  only_visible_to_overrides: boolean;
  visible_to_everyone: boolean;
  locked_for_user: boolean;
  submissions_download_url: string;
  post_manually: boolean;
  anonymize_students: boolean;
  require_lockdown_browser: boolean;
  restrict_quantitative_data: boolean;
};

type RubricItem = {
  id: string;
  points: number;
  description: string;
  long_description: string | null;
  ignore_for_scoring: boolean | null;
  criterion_use_range: boolean;
  ratings: RatingItem[];
};

type RatingItem = {
  id: string;
  points: number;
  description: string;
  long_description: string;
};

type RubricSettings = {
  id: number;
  title: string;
  points_possible: number;
  free_form_criterion_comments: boolean;
  hide_score_total: boolean;
  hide_points: boolean;
};

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  unlock_at: null;
  require_sequential_progress: boolean;
  requirement_type: CanvasModuleItemRequirementType;
  publish_final_grade: boolean;
  prerequisite_module_ids: any[];
  state: State;
  completed_at: Date;
  items_count: number;
  items_url: string;
  items: CanvasModuleItem[];
}

export interface CanvasModuleItem {
  id: number;
  title: string;
  position: number;
  indent: number;
  quiz_lti: boolean;
  type: CanvasModuleItemType;
  module_id: number;
  html_url: string;
  external_url?: string;
  page_url?: string;
  publish_at?: null;
  url: string;
  content_id?: number;
  content_details?: CanvasContentDetails;
}

export interface CanvasContentDetails {
  due_at?: Date;
  locked_for_user?: boolean;
  points_possible?: number;
  unlock_at?: Date;
  lock_at?: Date;
  lock_info?: LockInfo;
  lock_explanation?: string;
  display_name?: string;
  thumbnail_url?: null;
}

export enum CanvasModuleItemType {
  Assignment = "Assignment",
  File = "File",
  Page = "Page",
  Quiz = "Quiz",
  Discussion = "Discussion",
  ExternalUrl = "ExternalUrl",
  SubHeader = "SubHeader",
}

export enum CanvasModuleItemRequirementType {
  All = "all",
}

export enum State {
  Completed = "completed",
}

export interface CanvasPage {
  title: string;
  created_at: Date;
  url: string;
  editing_roles: string;
  page_id: number;
  last_edited_by: User;
  published: boolean;
  hide_from_students: boolean;
  front_page: boolean;
  html_url: string;
  todo_date: null;
  publish_at: null;
  updated_at: Date;
  locked_for_user: boolean;
  body: string;
}

export interface User {
  id: number;
  anonymous_id: string;
  display_name: string;
  avatar_image_url: string;
  html_url: string;
  pronouns: null;
}

export interface Course {
  id: number;
  name: string;
  account_id: number;
  uuid: string;
  start_at: Date | null;
  grading_standard_id: number | null;
  is_public: boolean | null;
  created_at: Date;
  course_code: string;
  default_view: string;
  root_account_id: number;
  enrollment_term_id: number;
  license: License;
  grade_passback_setting: null;
  end_at: Date | null;
  public_syllabus: boolean;
  public_syllabus_to_auth: boolean;
  storage_quota_mb: number;
  is_public_to_auth_users: boolean;
  homeroom_course: boolean;
  course_color: null;
  friendly_name: null;
  apply_assignment_group_weights: boolean;
  teachers: User[];
  calendar: Calendar;
  time_zone: TimeZone;
  original_name?: string;
  blueprint: boolean;
  template: boolean;
  enrollments: Enrollment[];
  hide_final_grades: boolean;
  workflow_state: WorkflowState;
  restrict_enrollments_to_course_dates: boolean;
}

export interface Calendar {
  ics: string;
}

export interface Enrollment {
  type: Type;
  role: Role;
  role_id: number;
  user_id: number;
  enrollment_state: EnrollmentState;
  limit_privileges_to_course_section: boolean;
}

export enum EnrollmentState {
  Active = "active",
}

export enum Role {
  StudentEnrollment = "StudentEnrollment",
}

export enum Type {
  Student = "student",
}

export enum License {
  Private = "private",
}

export enum TimeZone {
  AmericaNewYork = "America/New_York",
}

export enum WorkflowState {
  Available = "available",
}
