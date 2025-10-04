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
