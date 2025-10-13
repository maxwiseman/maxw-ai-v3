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
}

export enum CanvasModuleItemType {
	Assignment = "Assignment",
	File = "File",
	Page = "Page",
	Quiz = "Quiz",
	ExternalUrl = "ExternalUrl",
	SubHeader = "SubHeader",
}

export function moduleItemDetailsUrl(classId: string, item: CanvasModuleItem) {
	if (!item) return;
	if (item.type === CanvasModuleItemType.Assignment)
		return `/classes/${classId}/assignments/${item.content_id}`;
	if (item.type === CanvasModuleItemType.File)
		return `/classes/${classId}/files/${item.content_id}`;
	if (item.type === CanvasModuleItemType.Page)
		return `/classes/${classId}/pages/${item.content_id}`;
	if (item.type === CanvasModuleItemType.Quiz)
		return `/classes/${classId}/quizzes/${item.content_id}`;
	if (item.type === CanvasModuleItemType.ExternalUrl) return item.external_url;
	return item.html_url;
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
