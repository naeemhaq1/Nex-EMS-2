CREATE TABLE "access_control_ext" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" text,
	"emp_code" text,
	"all_fields" jsonb,
	"pulled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "action_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"user_type" varchar(20) NOT NULL,
	"user_name" varchar(100),
	"command" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(100),
	"target_name" varchar(200),
	"parameters" jsonb,
	"result" varchar(50) NOT NULL,
	"result_message" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"display_duration" integer DEFAULT 5,
	"color" text DEFAULT 'text-blue-400',
	"template" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"target_type" text DEFAULT 'all' NOT NULL,
	"target_ids" text[],
	"target_departments" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"is_auto_generated" boolean DEFAULT false NOT NULL,
	"auto_message_category" text,
	"display_duration" integer DEFAULT 5,
	"color" text DEFAULT 'text-blue-400',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"show_from" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "app_mode_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"current_mode" text DEFAULT 'demo' NOT NULL,
	"last_mode_change" timestamp DEFAULT now(),
	"changed_by" integer,
	"is_locked" boolean DEFAULT false,
	"demo_data_enabled" boolean DEFAULT true,
	"location_reporting_enabled" boolean DEFAULT true,
	"network_resume_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_mode_data_population" (
	"id" serial PRIMARY KEY NOT NULL,
	"population_type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_total" integer DEFAULT 0,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"started_at" timestamp,
	"completed_at" timestamp,
	"failure_reason" text,
	"triggered_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_mode_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"previous_mode" text NOT NULL,
	"new_mode" text NOT NULL,
	"changed_by" integer,
	"change_reason" text,
	"change_timestamp" timestamp DEFAULT now(),
	"system_state" jsonb,
	"data_snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "app_mode_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" numeric(10, 2) NOT NULL,
	"metric_unit" text,
	"timestamp" timestamp DEFAULT now(),
	"additional_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "app_mode_network_resume" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_type" text NOT NULL,
	"last_sync" timestamp,
	"sync_gap" integer,
	"resume_action" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"records_recovered" integer DEFAULT 0,
	"gaps_filled" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failure_reason" text,
	"triggered_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assembled_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"shift_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_external" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"check_type" varchar(10) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"accuracy" integer,
	"location_name" text,
	"device_info" jsonb,
	"job_site_id" integer,
	"job_site_name" varchar(200),
	"photo_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"synced_to_attendance" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_policy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"grace_period_minutes" integer DEFAULT 30 NOT NULL,
	"late_arrival_1st_occurrence_hours" numeric(3, 1) DEFAULT '0' NOT NULL,
	"late_arrival_2nd_occurrence_hours" numeric(3, 1) DEFAULT '0.5' NOT NULL,
	"late_arrival_3rd_occurrence_hours" numeric(3, 1) DEFAULT '1' NOT NULL,
	"significant_delay_1st_occurrence_hours" numeric(3, 1) DEFAULT '1' NOT NULL,
	"significant_delay_2nd_occurrence_hours" numeric(3, 1) DEFAULT '2' NOT NULL,
	"significant_delay_3rd_occurrence_hours" numeric(3, 1) DEFAULT '3' NOT NULL,
	"extended_delay_treated_as_half_day" boolean DEFAULT true NOT NULL,
	"late_deduction_per_minute" numeric(10, 2) DEFAULT '10' NOT NULL,
	"absent_deduction_per_day" numeric(10, 2) DEFAULT '1000' NOT NULL,
	"half_day_deduction" numeric(10, 2) DEFAULT '500' NOT NULL,
	"standard_shift_hours" integer DEFAULT 8 NOT NULL,
	"minimum_weekly_hours" integer DEFAULT 50 NOT NULL,
	"shift_start_time" time DEFAULT '09:00:00' NOT NULL,
	"shift_end_time" time DEFAULT '18:00:00' NOT NULL,
	"half_day_minimum_hours" integer DEFAULT 4 NOT NULL,
	"overtime_threshold_hours" integer DEFAULT 8 NOT NULL,
	"overtime_multiplier" numeric(3, 2) DEFAULT '1.5' NOT NULL,
	"weekend_days" text[] DEFAULT ARRAY['Saturday', 'Sunday'] NOT NULL,
	"effective_date" date DEFAULT now() NOT NULL,
	"last_updated_by" integer,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_pull_ext" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" text,
	"emp_code" text,
	"punch_time" timestamp,
	"all_fields" jsonb,
	"pulled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" text,
	"employee_id" integer,
	"employee_code" text NOT NULL,
	"date" timestamp NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"break_in" timestamp,
	"break_out" timestamp,
	"total_hours" numeric(4, 2) DEFAULT '0',
	"regular_hours" numeric(4, 2) DEFAULT '0',
	"overtime_hours" numeric(4, 2) DEFAULT '0',
	"late_minutes" integer DEFAULT 0,
	"status" text NOT NULL,
	"notes" text,
	"forced_checkout_by" integer,
	"forced_checkout_at" timestamp,
	"original_checkout_time" timestamp,
	"payroll_hours" numeric(4, 2),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"gps_accuracy" numeric(6, 2),
	"location_source" text DEFAULT 'N',
	"proximity_employee_id" integer,
	"bluetooth_device_id" text,
	"device_info" text,
	"job_site_id" integer,
	"punch_source" text DEFAULT 'terminal',
	"arrival_status" text DEFAULT 'on_time',
	"departure_status" text DEFAULT 'on_time',
	"early_minutes" integer DEFAULT 0,
	"grace_minutes" integer DEFAULT 0,
	"early_departure_minutes" integer DEFAULT 0,
	"late_departure_minutes" integer DEFAULT 0,
	"expected_arrival" timestamp,
	"actual_arrival" timestamp,
	"expected_departure" timestamp,
	"actual_departure" timestamp,
	"timing_processed" boolean DEFAULT false,
	"timing_processed_at" timestamp,
	"punch_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_rejected" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"employee_code" varchar(50),
	"date" date,
	"check_in" timestamp,
	"check_out" timestamp,
	"break_in" timestamp,
	"break_out" timestamp,
	"total_hours" varchar(10),
	"regular_hours" varchar(10),
	"overtime_hours" varchar(10),
	"late_minutes" integer DEFAULT 0,
	"status" varchar(20),
	"location" varchar(50) DEFAULT 'office',
	"punch_source" varchar(50) DEFAULT 'terminal',
	"latitude" varchar(20),
	"longitude" varchar(20),
	"accuracy" varchar(10),
	"rejection_reason" varchar(255) NOT NULL,
	"original_record_id" integer,
	"rejected_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_attendance_date" date,
	"streak_start_date" date,
	"total_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"username" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(50) NOT NULL,
	"color" varchar(7) NOT NULL,
	"category" varchar(50) NOT NULL,
	"requirement" integer NOT NULL,
	"requirement_type" varchar(50) NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biotime_import_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" integer NOT NULL,
	"employee_code" text NOT NULL,
	"employee_first_name" text,
	"employee_last_name" text,
	"department_name" text,
	"position_title" text,
	"punch_timestamp" timestamp NOT NULL,
	"punch_state_code" integer NOT NULL,
	"punch_state_label" text,
	"verification_type" integer,
	"verification_label" text,
	"work_code" text,
	"gps_coordinates" text,
	"location_area" text,
	"device_serial" text,
	"device_alias" text,
	"temperature_reading" numeric(5, 2),
	"upload_timestamp" timestamp,
	"processed" boolean DEFAULT false,
	"processing_errors" text,
	"attendance_record_created" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"import_batch_id" text,
	"source_file" text,
	CONSTRAINT "biotime_import_staging_biotime_id_unique" UNIQUE("biotime_id")
);
--> statement-breakpoint
CREATE TABLE "biotime_sync_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" text NOT NULL,
	"employee_code" text,
	"emp_code" text,
	"punch_time" timestamp,
	"punch_state" text,
	"verify_type" text,
	"work_code" text,
	"terminal_sn" text,
	"area_alias" text,
	"longitude" numeric,
	"latitude" numeric,
	"mobile" boolean,
	"all_fields" jsonb,
	"pulled_at" timestamp DEFAULT now(),
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	CONSTRAINT "biotime_sync_data_biotime_id_unique" UNIQUE("biotime_id")
);
--> statement-breakpoint
CREATE TABLE "daily_attendance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total_employees" integer NOT NULL,
	"present_count" integer NOT NULL,
	"complete_count" integer NOT NULL,
	"incomplete_count" integer NOT NULL,
	"late_count" integer NOT NULL,
	"absent_count" integer NOT NULL,
	"nonbio_count" integer NOT NULL,
	"attendance_rate" numeric NOT NULL,
	"unique_check_ins" integer NOT NULL,
	"shift_assignments" integer DEFAULT 0,
	"late_threshold_minutes" integer DEFAULT 5,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_attendance_metrics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "daily_attendance_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"employee_code" text NOT NULL,
	"date" date NOT NULL,
	"office_hours" numeric(4, 2) DEFAULT '0',
	"field_hours" numeric(4, 2) DEFAULT '0',
	"total_hours" numeric(4, 2) DEFAULT '0',
	"overtime_hours" numeric(4, 2) DEFAULT '0',
	"first_punch" timestamp,
	"last_punch" timestamp,
	"total_punches" integer DEFAULT 0,
	"status" text NOT NULL,
	"check_attend" text,
	"late_minutes" integer DEFAULT 0,
	"grace_minutes" integer DEFAULT 0,
	"early_minutes" integer DEFAULT 0,
	"arrival_status" text DEFAULT 'on_time',
	"expected_arrival" timestamp,
	"actual_arrival" timestamp,
	"early_departure_minutes" integer DEFAULT 0,
	"late_departure_minutes" integer DEFAULT 0,
	"departure_status" text DEFAULT 'on_time',
	"expected_departure" timestamp,
	"actual_departure" timestamp,
	"timing_processed" boolean DEFAULT false,
	"timing_processed_at" timestamp,
	"punch_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"layout" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_widget_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_code" text,
	"widget_layout" jsonb,
	"enabled_widgets" text[],
	"widget_order" text[],
	"custom_colors" jsonb,
	"chart_preferences" jsonb,
	"refresh_intervals" jsonb,
	"widget_sizes" jsonb,
	"theme_preferences" jsonb,
	"notification_settings" jsonb,
	"dashboard_name" text DEFAULT 'My Dashboard',
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_modified" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "department_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "department_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"departments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"is_system" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "department_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"device_name" text NOT NULL,
	"device_number" text,
	"ip_address" text NOT NULL,
	"operating_system" text,
	"os_version" text,
	"browser_name" text,
	"browser_version" text,
	"device_type" text NOT NULL,
	"user_agent" text,
	"location" text,
	"login_time" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	"status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"logged_out_at" timestamp,
	"logged_out_by" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "device_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"alias" text NOT NULL,
	"ip_address" text NOT NULL,
	"port" integer DEFAULT 80 NOT NULL,
	"terminal_name" text,
	"area" integer DEFAULT 0,
	"model" text,
	"sn" text,
	"firmware" text,
	"is_active" boolean DEFAULT true,
	"is_selected" boolean DEFAULT false,
	"device_type" text DEFAULT 'time_attendance' NOT NULL,
	"api_endpoint" text,
	"last_activity" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "disputed_attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_attendance_id" integer,
	"employee_code" varchar(50) NOT NULL,
	"employee_name" text,
	"department" text,
	"shift_name" text,
	"original_check_in" timestamp,
	"original_check_out" timestamp,
	"original_total_hours" numeric(4, 2),
	"original_status" text,
	"dispute_reason" text NOT NULL,
	"calculated_hours" numeric(4, 2) NOT NULL,
	"penalty_hours" numeric(4, 2) DEFAULT '0.00',
	"has_location_data" boolean DEFAULT false,
	"last_known_location" text,
	"location_based_exit_time" timestamp,
	"location_confidence" integer DEFAULT 0,
	"manager_review" text DEFAULT 'pending',
	"manager_id" integer,
	"manager_notes" text,
	"manager_decision" text,
	"final_approved_hours" numeric(4, 2),
	"reviewed_at" timestamp,
	"appeal_status" text DEFAULT 'none',
	"appeal_reason" text,
	"employee_comments" text,
	"appeal_submitted_at" timestamp,
	"dispute_date" date NOT NULL,
	"auto_calculated" boolean DEFAULT true,
	"requires_review" boolean DEFAULT true,
	"priority" text DEFAULT 'normal',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"purpose" text NOT NULL,
	"additional_info" text,
	"urgency" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processed_by" integer,
	"processed_at" timestamp,
	"document_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dummy_data_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar NOT NULL,
	"record_id" integer NOT NULL,
	"field_name" varchar,
	"description" text,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "emp_loc" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"accuracy" numeric(6, 2),
	"altitude" numeric(8, 2),
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"battery_level" integer,
	"network_type" varchar(20),
	"location_name" text,
	"is_work_location" boolean DEFAULT false,
	"job_site_id" varchar(50),
	"device_info" jsonb,
	"source" varchar(30) DEFAULT 'mobile_app',
	"status" varchar(20) DEFAULT 'active',
	"sync_status" varchar(20) DEFAULT 'synced',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"alert_status" varchar(20) DEFAULT 'active' NOT NULL,
	"punch_in_time" timestamp,
	"expected_punch_out_time" timestamp,
	"actual_punch_out_time" timestamp,
	"alert_triggered_at" timestamp DEFAULT now() NOT NULL,
	"alert_resolved_at" timestamp,
	"hours_worked" numeric(4, 2),
	"overtime_hours" numeric(4, 2),
	"alert_message" text,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"department" text,
	"designation" text,
	"shift_id" integer,
	"is_active" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now(),
	"search_vector" text
);
--> statement-breakpoint
CREATE TABLE "employee_penalty_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"late_arrival_category1_count" integer DEFAULT 0,
	"late_arrival_category2_count" integer DEFAULT 0,
	"late_arrival_category3_count" integer DEFAULT 0,
	"early_checkout_count" integer DEFAULT 0,
	"missed_punchout_count" integer DEFAULT 0,
	"total_penalty_hours" numeric(8, 2) DEFAULT '0.00',
	"first_time_courtesy_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_calculated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employee_pull_ext" (
	"id" serial PRIMARY KEY NOT NULL,
	"biotime_id" text,
	"emp_code" text,
	"code2" text,
	"first_name" text,
	"last_name" text,
	"nickname" text,
	"format_name" text,
	"gender" text,
	"birthday" date,
	"mobile" text,
	"contact_tel" text,
	"office_tel" text,
	"email" text,
	"address" text,
	"city" text,
	"postcode" text,
	"national" text,
	"ssn" text,
	"card_no" text,
	"department" jsonb,
	"position" jsonb,
	"hire_date" date,
	"emp_type" text,
	"area" jsonb,
	"device_password" text,
	"dev_privilege" integer,
	"verify_mode" integer,
	"fingerprint" text,
	"face" text,
	"palm" text,
	"vl_face" text,
	"enroll_sn" text,
	"app_status" integer,
	"app_role" integer,
	"attemployee" jsonb,
	"religion" text,
	"update_time" timestamp,
	"all_fields" jsonb,
	"pulled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"code2" text,
	"biotime_id" text NOT NULL,
	"salutation" varchar(20),
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"real_first" text,
	"real_middle" text,
	"real_last" text,
	"email" text,
	"phone" varchar(20),
	"mobile" varchar(15),
	"wanumber" varchar(20),
	"profile_photo" text,
	"address" text,
	"vrn" varchar(20),
	"username" varchar(50),
	"national_id" varchar(17),
	"cnic_missing" text DEFAULT 'yes' NOT NULL,
	"department" text,
	"sub_department" text,
	"position" text,
	"project" text,
	"emp_type" varchar(20) DEFAULT 'Desk Job',
	"is_field_department" boolean DEFAULT false,
	"hire_date" timestamp,
	"is_active" boolean DEFAULT true,
	"birthday" date,
	"contract_date" date,
	"contract_term" varchar(50),
	"contract_expiry_date" date,
	"work_team" varchar(50),
	"designation" varchar(100),
	"subdesignation" varchar(100),
	"poslevel" varchar(50),
	"joining_date" date,
	"entitlement_date" date,
	"location" varchar(255),
	"non_bio" boolean DEFAULT false,
	"shift_id" integer,
	"suspect" boolean DEFAULT false,
	"susreason" varchar(255),
	"pop" varchar(50),
	"stop_pay" boolean DEFAULT false,
	"system_account" boolean DEFAULT false,
	"app_status" text DEFAULT 'not_installed',
	"app_loc" text DEFAULT 'no_data',
	"app_status_checked_at" timestamp,
	"app_loc_checked_at" timestamp,
	"e_role" varchar(20) DEFAULT 'Normal',
	"has_face_template" boolean DEFAULT false,
	"face_template_count" integer DEFAULT 0,
	"face_template_version" text,
	"face_template_data" text,
	"biometric_enrollment_status" text DEFAULT 'not_enrolled',
	"last_biometric_sync" timestamp,
	"vnb" boolean DEFAULT false,
	"wareg" boolean DEFAULT false,
	"lasttime" timestamp,
	"lastbpunch" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_records_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employee_records_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE "employee_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"request_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"request_date" date NOT NULL,
	"start_date" date,
	"end_date" date,
	"hours" numeric(5, 2),
	"amount" numeric(10, 2),
	"currency" text DEFAULT 'PKR',
	"reason" text NOT NULL,
	"attachments" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"manager_notes" text,
	"approved_by" text,
	"approved_at" timestamp,
	"rejected_by" text,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"month" varchar(7) NOT NULL,
	"attendance_points" integer DEFAULT 0,
	"punctuality_points" integer DEFAULT 0,
	"performance_points" integer DEFAULT 0,
	"streak_bonus" integer DEFAULT 0,
	"overtime_bonus" integer DEFAULT 0,
	"location_bonus" integer DEFAULT 0,
	"total_points" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"percentile" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_service_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"max_leave_days_per_request" integer DEFAULT 30,
	"min_advance_notice" integer DEFAULT 1,
	"enable_half_day_leave" boolean DEFAULT true,
	"auto_approval_threshold" integer DEFAULT 0,
	"max_reimbursement_amount" numeric(10, 2) DEFAULT '50000.00',
	"enable_receipt_upload" boolean DEFAULT true,
	"max_overtime_hours_per_day" numeric(4, 2) DEFAULT '4.00',
	"overtime_approval_required" boolean DEFAULT true,
	"enable_work_from_home" boolean DEFAULT true,
	"max_wfh_days_per_month" integer DEFAULT 10,
	"enable_employee_portal" boolean DEFAULT true,
	"enable_notifications" boolean DEFAULT true,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_status_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"alert_type" text NOT NULL,
	"alert_severity" text NOT NULL,
	"alert_status" text DEFAULT 'active' NOT NULL,
	"current_status" text NOT NULL,
	"alert_message" text NOT NULL,
	"alert_details" jsonb,
	"alert_latitude" numeric(10, 7),
	"alert_longitude" numeric(10, 7),
	"alert_address" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"acknowledged_at" timestamp,
	"acknowledged_by" integer
);
--> statement-breakpoint
CREATE TABLE "employee_status_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"change_type" text NOT NULL,
	"change_reason" text NOT NULL,
	"change_details" jsonb,
	"change_latitude" numeric(10, 7),
	"change_longitude" numeric(10, 7),
	"change_address" text,
	"changed_by" integer,
	"changed_by_name" text,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_status_geofences" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"geofence_name" text NOT NULL,
	"geofence_type" text NOT NULL,
	"center_latitude" numeric(10, 7) NOT NULL,
	"center_longitude" numeric(10, 7) NOT NULL,
	"radius_meters" integer DEFAULT 200 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"allowed_statuses" text[],
	"auto_status_change" boolean DEFAULT false,
	"target_status" text,
	"require_biometric" boolean DEFAULT false,
	"minimum_dwell_time" integer DEFAULT 30,
	"confidence_threshold" numeric(5, 2) DEFAULT '80.0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "employee_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"status_duration" integer,
	"change_reason" text NOT NULL,
	"change_method" text NOT NULL,
	"confidence_score" numeric(5, 2),
	"change_latitude" numeric(10, 7),
	"change_longitude" numeric(10, 7),
	"change_address" text,
	"biometric_verified" boolean DEFAULT false,
	"biometric_type" text,
	"biometric_confidence" numeric(5, 2),
	"change_timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"changed_by" integer
);
--> statement-breakpoint
CREATE TABLE "employee_status_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"notification_type" text NOT NULL,
	"notification_title" text NOT NULL,
	"notification_message" text NOT NULL,
	"notification_data" jsonb,
	"delivery_method" text NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"delivery_attempts" integer DEFAULT 0,
	"last_delivery_attempt" timestamp,
	"delivered_at" timestamp,
	"recipient_user_id" integer,
	"recipient_contact" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_status_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_name" text NOT NULL,
	"rule_type" text NOT NULL,
	"target_status" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_status_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"auto_status_enabled" boolean DEFAULT true,
	"auto_status_rules" jsonb,
	"location_required_for_status" boolean DEFAULT true,
	"biometric_required_for_status" boolean DEFAULT true,
	"allowed_location_radius" integer DEFAULT 200,
	"status_change_notifications" boolean DEFAULT true,
	"location_alerts" boolean DEFAULT true,
	"biometric_failure_alerts" boolean DEFAULT true,
	"custom_geofences" jsonb,
	"geofence_violation_action" text DEFAULT 'alert',
	"max_status_durations" jsonb,
	"status_timeout_action" text DEFAULT 'alert',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_status_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"current_status" text NOT NULL,
	"previous_status" text,
	"status_set_by" text NOT NULL,
	"status_set_reason" text,
	"status_confidence" numeric(5, 2) DEFAULT '0.0',
	"current_latitude" numeric(10, 7),
	"current_longitude" numeric(10, 7),
	"location_accuracy" numeric(8, 2),
	"location_address" text,
	"biometric_verified" boolean DEFAULT false,
	"biometric_timestamp" timestamp,
	"biometric_type" text,
	"biometric_confidence" numeric(5, 2),
	"geofence_zone" text,
	"geofence_distance" numeric(8, 2),
	"inside_geofence" boolean DEFAULT false,
	"status_start_time" timestamp DEFAULT now(),
	"status_end_time" timestamp,
	"last_location_update" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "employee_status_violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"violation_type" text NOT NULL,
	"violation_severity" text NOT NULL,
	"violation_status" text DEFAULT 'pending' NOT NULL,
	"current_status" text NOT NULL,
	"expected_status" text,
	"violation_message" text NOT NULL,
	"violation_details" jsonb,
	"violation_latitude" numeric(10, 7),
	"violation_longitude" numeric(10, 7),
	"violation_address" text,
	"expected_latitude" numeric(10, 7),
	"expected_longitude" numeric(10, 7),
	"distance_from_expected" numeric(10, 2),
	"biometric_data" jsonb,
	"biometric_score" numeric(5, 2),
	"biometric_threshold" numeric(5, 2),
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"manager_decision" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"target_value" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forced_punchouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"employee_code" text NOT NULL,
	"employee_name" text NOT NULL,
	"department" text,
	"original_check_in" timestamp NOT NULL,
	"forced_check_out" timestamp NOT NULL,
	"calculated_hours" numeric(4, 2) DEFAULT '7.00' NOT NULL,
	"actual_hours_present" numeric(4, 2),
	"reason" text DEFAULT 'Administrative override',
	"triggered_by" text NOT NULL,
	"admin_user_id" integer,
	"admin_user_name" text,
	"attendance_record_id" integer,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"punch_source" text DEFAULT 'terminal',
	"mobile_latitude" numeric(10, 8),
	"mobile_longitude" numeric(11, 8),
	"mobile_gps_accuracy" numeric(6, 2),
	"job_site_id" text,
	"request_reason" text,
	"approval_status" text DEFAULT 'approved',
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "former_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(100),
	"mobile" varchar(50),
	"department" varchar(100),
	"designation" varchar(100),
	"date_of_joining" timestamp,
	"is_active" boolean DEFAULT false,
	"national" varchar(50),
	"date_of_leaving" timestamp,
	"reason_for_leaving" text,
	"moved_from_employee_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "former_employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "gamification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"assigned_to" integer,
	"assigned_at" timestamp,
	"resolution" text,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "late_arrival_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"attendance_id" integer,
	"date" date NOT NULL,
	"arrival_time" time NOT NULL,
	"expected_time" time NOT NULL,
	"late_minutes" integer NOT NULL,
	"reason" text NOT NULL,
	"reason_category" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_half_day" boolean DEFAULT false,
	"half_day_period" varchar(10),
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"total_days" numeric(4, 2) NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_days_per_year" integer DEFAULT 0,
	"requires_approval" boolean DEFAULT true,
	"can_be_half_day" boolean DEFAULT true,
	"advance_notice_required" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manager_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_code" text NOT NULL,
	"department_group_id" integer,
	"department_name" text NOT NULL,
	"role_type" text DEFAULT 'manager' NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "manager_department_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"department_name" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"user_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer,
	CONSTRAINT "managers_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"thread_type" varchar(30) DEFAULT 'general' NOT NULL,
	"related_request_id" integer,
	"related_request_type" varchar(50),
	"participants" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"attachment_url" text,
	"attachment_type" varchar(20),
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mobile_location_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy" integer,
	"altitude" numeric(8, 2),
	"speed" numeric(6, 2),
	"heading" numeric(6, 2),
	"location_name" text,
	"address" text,
	"activity_type" varchar(50),
	"battery_level" integer,
	"network_type" varchar(20),
	"device_info" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer,
	"recipient_id" integer NOT NULL,
	"delivery_method" text NOT NULL,
	"delivery_status" text NOT NULL,
	"delivery_attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"delivered_at" timestamp,
	"failure_reason" text,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_value" text NOT NULL,
	"recipient_name" text,
	"department" text,
	"role" text,
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"alert_types" text[],
	"severity_levels" text[],
	"notification_methods" text[],
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" text NOT NULL,
	"template_type" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"subject" text,
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"request_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"total_hours" numeric(4, 2) NOT NULL,
	"reason" text NOT NULL,
	"project_name" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "penalty_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(20) NOT NULL,
	"attendance_record_id" integer,
	"incident_date" date NOT NULL,
	"incident_type" varchar(30) NOT NULL,
	"incident_category" varchar(50),
	"scheduled_time" time,
	"actual_time" time,
	"minutes_late" integer,
	"minutes_early" integer,
	"penalty_applied" boolean DEFAULT false,
	"penalty_type" varchar(30),
	"penalty_hours" numeric(4, 1) DEFAULT '0.0',
	"penalty_amount" numeric(10, 2),
	"monthly_occurrence_number" integer DEFAULT 1,
	"mitigation_applied" boolean DEFAULT false,
	"mitigation_reason" text,
	"mitigation_approved_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"processed_by" integer
);
--> statement-breakpoint
CREATE TABLE "penalty_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_name" varchar(100) NOT NULL,
	"grace_period_minutes" integer DEFAULT 30,
	"grace_period_applies_to" varchar(20) DEFAULT 'arrival',
	"late_arrival_category1_name" varchar(50) DEFAULT 'Late Arrival',
	"late_arrival_category1_min_start" integer DEFAULT 31,
	"late_arrival_category1_min_end" integer DEFAULT 60,
	"late_arrival_category1_first_occurrence" varchar(50) DEFAULT 'verbal_warning',
	"late_arrival_category1_second_occurrence" numeric(4, 1) DEFAULT '0.5',
	"late_arrival_category1_third_occurrence" numeric(4, 1) DEFAULT '1.0',
	"late_arrival_category2_name" varchar(50) DEFAULT 'Significant Delay',
	"late_arrival_category2_min_start" integer DEFAULT 61,
	"late_arrival_category2_min_end" integer DEFAULT 120,
	"late_arrival_category2_first_occurrence" numeric(4, 1) DEFAULT '1.0',
	"late_arrival_category2_second_occurrence" numeric(4, 1) DEFAULT '2.0',
	"late_arrival_category2_third_occurrence" numeric(4, 1) DEFAULT '3.0',
	"late_arrival_category3_name" varchar(50) DEFAULT 'Extended Delay',
	"late_arrival_category3_min_start" integer DEFAULT 121,
	"late_arrival_category3_min_end" integer,
	"late_arrival_category3_treatment" varchar(50) DEFAULT 'half_day_absence',
	"early_checkout_penalty_percentage" numeric(5, 2) DEFAULT '30.00',
	"early_checkout_minimum_minutes" integer DEFAULT 15,
	"missed_punchout_penalty_hours" numeric(4, 1) DEFAULT '1.0',
	"missed_punchout_grace_period_hours" integer DEFAULT 1,
	"monthly_reset_enabled" boolean DEFAULT true,
	"monthly_reset_day" integer DEFAULT 1,
	"first_time_courtesy_enabled" boolean DEFAULT true,
	"first_time_courtesy_type" varchar(30) DEFAULT 'verbal_reminder',
	"mitigation_factors_enabled" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "penalty_settings_setting_name_unique" UNIQUE("setting_name")
);
--> statement-breakpoint
CREATE TABLE "polling_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"target_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 1,
	"requested_by" integer,
	"requested_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"records_processed" integer DEFAULT 0,
	"total_records" integer DEFAULT 0,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "polling_queue_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"queue_id" integer NOT NULL,
	"result_type" varchar(50) NOT NULL,
	"data_count" integer DEFAULT 0,
	"error_details" text,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recent_announcement_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"target_type" text DEFAULT 'all' NOT NULL,
	"target_departments" text[],
	"display_duration" integer DEFAULT 5,
	"usage_count" integer DEFAULT 1,
	"created_by" integer,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reimbursement_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_amount" numeric(10, 2),
	"requires_receipt" boolean DEFAULT true,
	"approval_workflow" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reimbursement_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"receipts" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"paid_at" timestamp,
	"paid_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "request_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"request_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_status" varchar(20),
	"new_status" varchar(20),
	"comment" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "request_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"sender_id" integer,
	"notification_type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_request_type" varchar(50),
	"related_request_id" integer,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"can_create_users" boolean DEFAULT false NOT NULL,
	"can_delete_users" boolean DEFAULT false NOT NULL,
	"can_delete_data" boolean DEFAULT false NOT NULL,
	"can_access_financial_data" boolean DEFAULT false NOT NULL,
	"can_manage_system" boolean DEFAULT false NOT NULL,
	"can_manage_teams" boolean DEFAULT false NOT NULL,
	"can_change_designations" boolean DEFAULT false NOT NULL,
	"access_level" integer DEFAULT 1 NOT NULL,
	"created_roles" text[],
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permissions_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "scoring_audit_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_description" text NOT NULL,
	"previous_score" integer,
	"new_score" integer,
	"points_awarded" integer,
	"rule_applied" varchar(100),
	"calculation_period" varchar(20),
	"attendance_date" date,
	"performed_by" integer,
	"system_generated" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scoring_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"avg_attendance_rate" numeric(5, 2),
	"avg_punctuality_score" numeric(5, 2),
	"longest_streak" integer DEFAULT 0,
	"avg_work_hours" numeric(4, 2),
	"consistency_score" numeric(5, 2),
	"improvement_trend" varchar(20),
	"data_start_date" date NOT NULL,
	"data_end_date" date NOT NULL,
	"records_analyzed" integer DEFAULT 0,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scoring_configuration" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"data_type" varchar(20) DEFAULT 'string',
	"category" varchar(50) DEFAULT 'general',
	"is_active" boolean DEFAULT true,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scoring_configuration_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"conditions" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"type" varchar(50) DEFAULT 'string' NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_based_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"attendance_id" integer,
	"shift_id" integer,
	"shift_name" text NOT NULL,
	"shift_start_time" time NOT NULL,
	"shift_end_time" time NOT NULL,
	"shift_duration_hours" numeric(4, 2) NOT NULL,
	"actual_check_in" timestamp,
	"actual_check_out" timestamp,
	"late_arrival_minutes" integer DEFAULT 0,
	"early_departure_minutes" integer DEFAULT 0,
	"available_work_hours" numeric(4, 2) NOT NULL,
	"actual_work_hours" numeric(4, 2) DEFAULT '0.00',
	"maximum_possible_hours" numeric(4, 2) NOT NULL,
	"missed_punch_penalty" numeric(4, 2) DEFAULT '0.00',
	"home_punch_penalty" numeric(4, 2) DEFAULT '0.00',
	"location_penalty" numeric(4, 2) DEFAULT '0.00',
	"final_payroll_hours" numeric(4, 2) NOT NULL,
	"calculation_notes" text,
	"calculation_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"current_shift_id" integer,
	"requested_shift_id" integer,
	"swap_with_employee_id" integer,
	"request_date" date NOT NULL,
	"effective_date" date NOT NULL,
	"reason" text NOT NULL,
	"is_temporary" boolean DEFAULT false,
	"end_date" date,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_name" text NOT NULL,
	"shift_name" text NOT NULL,
	"start_hour" integer NOT NULL,
	"start_minute" integer DEFAULT 0 NOT NULL,
	"end_hour" integer NOT NULL,
	"end_minute" integer DEFAULT 0 NOT NULL,
	"days_of_week" text[] NOT NULL,
	"grace_period_minutes" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_type" text NOT NULL,
	"last_sync" timestamp,
	"status" text NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_total" integer DEFAULT 0,
	"current_page" integer DEFAULT 1,
	"page_size" integer DEFAULT 100,
	"last_processed_id" text,
	"date_from" timestamp,
	"date_to" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_alert_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"performed_by" integer,
	"action_data" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_alert_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"alert_types" text[] NOT NULL,
	"severity_levels" text[] NOT NULL,
	"sources" text[],
	"notification_methods" text[] NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_alert_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title_template" text NOT NULL,
	"message_template" text NOT NULL,
	"troubleshooting_steps" text[],
	"auto_resolve_after_minutes" integer,
	"escalation_rules" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_alert_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
CREATE TABLE "system_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolved_notes" text,
	"metadata" jsonb,
	"affected_services" text[],
	"estimated_impact" text,
	"troubleshooting_steps" text[],
	"related_alerts" integer[],
	"auto_resolved" boolean DEFAULT false,
	"escalation_level" integer DEFAULT 1,
	"notifications_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_configuration" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_mode" varchar(20) DEFAULT 'development',
	"gamification_enabled" boolean DEFAULT true,
	"scoring_enabled" boolean DEFAULT true,
	"leaderboard_enabled" boolean DEFAULT true,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"designation_name" text NOT NULL,
	"designation_level" text NOT NULL,
	"assigned_date" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"designations" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "terminate_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	"emp_code" varchar NOT NULL,
	"terminated_by" varchar NOT NULL,
	"forced_out" timestamp NOT NULL,
	"punch_in_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"training_title" text NOT NULL,
	"provider" text,
	"cost" numeric(10, 2),
	"duration" text,
	"justification" text NOT NULL,
	"expected_outcome" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contact_type" varchar(20) DEFAULT 'employee' NOT NULL,
	"employee_id" integer,
	"custom_name" varchar(200),
	"custom_phone" varchar(20),
	"custom_email" varchar(255),
	"notes" text,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_fingerprint" text NOT NULL,
	"device_name" text,
	"device_type" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"operating_system" text NOT NULL,
	"os_version" text,
	"browser" text NOT NULL,
	"browser_version" text NOT NULL,
	"screen_resolution" text NOT NULL,
	"user_agent" text NOT NULL,
	"platform" text NOT NULL,
	"language" text NOT NULL,
	"timezone" text NOT NULL,
	"mac_address" text,
	"network_info" jsonb,
	"battery_info" jsonb,
	"hardware_info" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"last_login_ip" text,
	"login_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"unbound_at" timestamp,
	"unbound_by" integer,
	"unbound_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_devices_device_fingerprint_unique" UNIQUE("device_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"account_type" text DEFAULT 'employee' NOT NULL,
	"employee_id" text,
	"managed_departments" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"user_state" varchar(20) DEFAULT 'Active' NOT NULL,
	"is_temporary_password" boolean DEFAULT true NOT NULL,
	"last_password_change" timestamp,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"facebook_id" text,
	"facebook_access_token" text,
	"facebook_profile_photo" text,
	"facebook_email" text,
	"facebook_name" text,
	"facebook_linked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total_inbound" integer DEFAULT 0 NOT NULL,
	"total_outbound" integer DEFAULT 0 NOT NULL,
	"unique_contacts" integer DEFAULT 0 NOT NULL,
	"new_registrations" integer DEFAULT 0 NOT NULL,
	"ai_requests" integer DEFAULT 0 NOT NULL,
	"blocked_messages" integer DEFAULT 0 NOT NULL,
	"spam_detected" integer DEFAULT 0 NOT NULL,
	"average_response_time" integer DEFAULT 0,
	"peak_hour" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_analytics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_permanent" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_blacklist_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"formatted_phone" varchar(25) NOT NULL,
	"contact_name" varchar(100) NOT NULL,
	"employee_id" integer,
	"employee_code" varchar(50),
	"department" varchar(100),
	"designation" varchar(100),
	"contact_type" varchar(20) DEFAULT 'employee' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"managed_by_user_ids" integer[],
	"department_access" text[],
	"access_level" varchar(20) DEFAULT 'department' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp,
	"last_seen_at" timestamp,
	"notes" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_contacts_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"member_role" varchar(20) DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"added_by_user_id" integer,
	"removed_by_user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"group_description" text,
	"group_type" varchar(30) NOT NULL,
	"department_id" integer,
	"department_name" varchar(100),
	"project_code" varchar(50),
	"created_by_user_id" integer NOT NULL,
	"managed_by_user_ids" integer[],
	"visible_to_user_ids" integer[],
	"access_level" varchar(20) DEFAULT 'department' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_add_employees" boolean DEFAULT false NOT NULL,
	"max_members" integer DEFAULT 250,
	"last_message_at" timestamp,
	"member_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_message_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"onboarding_request_id" integer,
	"phone_number" varchar(20) NOT NULL,
	"message_type" varchar(30) NOT NULL,
	"message_content" text NOT NULL,
	"message_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"gateway_response" jsonb,
	"message_id" varchar(100),
	"error_details" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_message_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"message_text" text NOT NULL,
	"direction" varchar(10) NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"employee_code" varchar(50),
	"risk_score" integer DEFAULT 0,
	"is_blocked" boolean DEFAULT false,
	"block_reason" text,
	"webhook_id" varchar(255),
	"sender_name" varchar(255),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"processed" boolean DEFAULT true,
	"ai_used" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"wam_num" serial NOT NULL,
	"message_id" varchar(100),
	"from_number" varchar(20) NOT NULL,
	"to_number" varchar(20) NOT NULL,
	"message_type" varchar(20) NOT NULL,
	"message_content" text NOT NULL,
	"group_id" integer,
	"contact_id" integer,
	"sent_by_user_id" integer,
	"visible_to_user_ids" integer[],
	"department_access" text[],
	"message_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"delivery_attempts" integer DEFAULT 0,
	"last_delivery_attempt" timestamp,
	"delivery_status_details" jsonb,
	"gateway_response" jsonb,
	"error_details" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_messages_wam_num_unique" UNIQUE("wam_num"),
	CONSTRAINT "whatsapp_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_onboarding_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"welcome_message_template" text DEFAULT '[NEMS] Welcome to Nexlinx Employee Management System! 🎉

To join our system, please reply with "/join" to continue the registration process.

This is an automated system for employee onboarding only.' NOT NULL,
	"join_confirmation_template" text DEFAULT '[NEMS] Thank you for joining! 📝

To verify your identity, please provide any 6 digits from your CNIC (National ID Card).

Example: If your CNIC is 12345-1234567-1, you can reply with "123451" or "456712" etc.

This helps us verify you are an authorized employee.' NOT NULL,
	"cnic_verification_success_template" text DEFAULT '[NEMS] Identity Verified! ✅

Your employee account has been created:

👤 Username: {username}
🔐 Password: {password}

Please save these credentials securely. You can now log in to the Employee Management System.

Welcome to the team! 🚀' NOT NULL,
	"cnic_verification_fail_template" text DEFAULT '[NEMS] Verification Failed ❌

The CNIC digits provided do not match our employee records. Please try again with different 6 digits from your CNIC.

Attempts remaining: {remaining_attempts}' NOT NULL,
	"apk_distribution_enabled" boolean DEFAULT false,
	"apk_download_url" varchar(500),
	"apk_version" varchar(20),
	"apk_message_template" text DEFAULT '[NEMS] Mobile App Available! 📱

Download the official NEMS mobile app:
{apk_url}

Version: {version}

For Android devices only. Install from trusted sources.' NOT NULL,
	"max_cnic_attempts" integer DEFAULT 3,
	"onboarding_timeout_hours" integer DEFAULT 24,
	"require_admin_approval" boolean DEFAULT false,
	"max_requests_per_phone" integer DEFAULT 5,
	"cooldown_period_hours" integer DEFAULT 24,
	"notify_admin_on_new_request" boolean DEFAULT true,
	"notify_admin_on_verification_failure" boolean DEFAULT true,
	"admin_notification_number" varchar(20),
	"is_active" boolean DEFAULT true,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_onboarding_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"country_code" varchar(5) DEFAULT '+92' NOT NULL,
	"formatted_phone" varchar(25) NOT NULL,
	"onboarding_status" varchar(30) DEFAULT 'initiated' NOT NULL,
	"employee_code" varchar(50),
	"employee_id" integer,
	"cnic_provided" varchar(20),
	"cnic_verified" boolean DEFAULT false,
	"cnic_verification_attempts" integer DEFAULT 0,
	"generated_username" varchar(50),
	"generated_password" varchar(50),
	"password_sent" boolean DEFAULT false,
	"device_info" jsonb,
	"user_agent" text,
	"ip_address" varchar(45),
	"welcome_message_sent_at" timestamp,
	"join_requested_at" timestamp,
	"cnic_requested_at" timestamp,
	"cnic_verified_at" timestamp,
	"credentials_sent_at" timestamp,
	"completed_at" timestamp,
	"expired_at" timestamp,
	"rejected_by" integer,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_onboarding_requests_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_onboarding_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"stats_date" date NOT NULL,
	"total_requests" integer DEFAULT 0,
	"new_requests" integer DEFAULT 0,
	"completed_requests" integer DEFAULT 0,
	"rejected_requests" integer DEFAULT 0,
	"expired_requests" integer DEFAULT 0,
	"cnic_verification_attempts" integer DEFAULT 0,
	"cnic_verification_successes" integer DEFAULT 0,
	"cnic_verification_failures" integer DEFAULT 0,
	"total_messages_sent" integer DEFAULT 0,
	"welcome_messages_sent" integer DEFAULT 0,
	"credential_messages_sent" integer DEFAULT 0,
	"apk_links_sent" integer DEFAULT 0,
	"android_devices" integer DEFAULT 0,
	"ios_devices" integer DEFAULT 0,
	"desktop_devices" integer DEFAULT 0,
	"unknown_devices" integer DEFAULT 0,
	"completion_rate" numeric(5, 2) DEFAULT '0.00',
	"verification_success_rate" numeric(5, 2) DEFAULT '0.00',
	"message_delivery_rate" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_onboarding_stats_stats_date_unique" UNIQUE("stats_date")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_spam_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"max_messages_per_minute" integer DEFAULT 30 NOT NULL,
	"max_messages_per_hour" integer DEFAULT 200 NOT NULL,
	"max_messages_per_day" integer DEFAULT 1000 NOT NULL,
	"blacklist_threshold" integer DEFAULT 90 NOT NULL,
	"block_duration_minutes" integer DEFAULT 60 NOT NULL,
	"suspicious_pattern_detection" boolean DEFAULT true NOT NULL,
	"ai_usage_limit" integer DEFAULT 100 NOT NULL,
	"ai_cooldown_minutes" integer DEFAULT 2 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_from_home_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"work_plan" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_name" varchar(255) NOT NULL,
	"hashed_key" varchar(255) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"rate_limit" integer DEFAULT 100,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(50) NOT NULL,
	"last_used" timestamp,
	"usage_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_api_keys_hashed_key_unique" UNIQUE("hashed_key")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_api_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_time" integer,
	"last_checked" timestamp DEFAULT now(),
	"error_count" integer DEFAULT 0,
	"last_error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_chatbot_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_name" varchar(255) NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"webhook_url" text,
	"ai_provider" varchar(50),
	"api_key" text,
	"model" varchar(100),
	"system_prompt" text,
	"temperature" integer DEFAULT 70,
	"max_tokens" integer DEFAULT 1000,
	"auto_reply" boolean DEFAULT false,
	"trigger_keywords" jsonb DEFAULT '[]'::jsonb,
	"response_templates" jsonb DEFAULT '{}'::jsonb,
	"fallback_message" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_chatbot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"contact_id" uuid,
	"bot_config_id" uuid NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"message_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"last_interaction" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_chatbot_conversations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"duration" integer,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_gateway_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"request_data" jsonb,
	"response_data" jsonb,
	"success" boolean DEFAULT false,
	"error" text,
	"duration" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_message_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"priority" integer DEFAULT 1,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"error_details" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "action_records" ADD CONSTRAINT "action_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_settings" ADD CONSTRAINT "announcement_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_mode_config" ADD CONSTRAINT "app_mode_config_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_mode_data_population" ADD CONSTRAINT "app_mode_data_population_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_mode_history" ADD CONSTRAINT "app_mode_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_mode_network_resume" ADD CONSTRAINT "app_mode_network_resume_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembled_teams" ADD CONSTRAINT "assembled_teams_template_id_team_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."team_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembled_teams" ADD CONSTRAINT "assembled_teams_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembled_teams" ADD CONSTRAINT "assembled_teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_external" ADD CONSTRAINT "attendance_external_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_external" ADD CONSTRAINT "attendance_external_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_policy_settings" ADD CONSTRAINT "attendance_policy_settings_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_forced_checkout_by_users_id_fk" FOREIGN KEY ("forced_checkout_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_proximity_employee_id_employee_records_id_fk" FOREIGN KEY ("proximity_employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_rejected" ADD CONSTRAINT "attendance_rejected_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_streaks" ADD CONSTRAINT "attendance_streaks_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_attendance_summary" ADD CONSTRAINT "daily_attendance_summary_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_profiles" ADD CONSTRAINT "dashboard_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widget_preferences" ADD CONSTRAINT "dashboard_widget_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_logged_out_by_users_id_fk" FOREIGN KEY ("logged_out_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputed_attendance_records" ADD CONSTRAINT "disputed_attendance_records_original_attendance_id_attendance_records_id_fk" FOREIGN KEY ("original_attendance_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputed_attendance_records" ADD CONSTRAINT "disputed_attendance_records_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dummy_data_tracking" ADD CONSTRAINT "dummy_data_tracking_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emp_loc" ADD CONSTRAINT "emp_loc_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_alerts" ADD CONSTRAINT "employee_alerts_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_alerts" ADD CONSTRAINT "employee_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_badges" ADD CONSTRAINT "employee_badges_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_badges" ADD CONSTRAINT "employee_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_cache" ADD CONSTRAINT "employee_cache_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_cache" ADD CONSTRAINT "employee_cache_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_penalty_tracking" ADD CONSTRAINT "employee_penalty_tracking_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_records" ADD CONSTRAINT "employee_records_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_scores" ADD CONSTRAINT "employee_scores_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_service_settings" ADD CONSTRAINT "employee_service_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_alerts" ADD CONSTRAINT "employee_status_alerts_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_alerts" ADD CONSTRAINT "employee_status_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_alerts" ADD CONSTRAINT "employee_status_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_audit_log" ADD CONSTRAINT "employee_status_audit_log_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_audit_log" ADD CONSTRAINT "employee_status_audit_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_geofences" ADD CONSTRAINT "employee_status_geofences_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_geofences" ADD CONSTRAINT "employee_status_geofences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_geofences" ADD CONSTRAINT "employee_status_geofences_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_notifications" ADD CONSTRAINT "employee_status_notifications_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_notifications" ADD CONSTRAINT "employee_status_notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_rules" ADD CONSTRAINT "employee_status_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_settings" ADD CONSTRAINT "employee_status_settings_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_tracking" ADD CONSTRAINT "employee_status_tracking_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_tracking" ADD CONSTRAINT "employee_status_tracking_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_tracking" ADD CONSTRAINT "employee_status_tracking_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_violations" ADD CONSTRAINT "employee_status_violations_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_violations" ADD CONSTRAINT "employee_status_violations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_violations" ADD CONSTRAINT "employee_status_violations_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forced_punchouts" ADD CONSTRAINT "forced_punchouts_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forced_punchouts" ADD CONSTRAINT "forced_punchouts_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forced_punchouts" ADD CONSTRAINT "forced_punchouts_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forced_punchouts" ADD CONSTRAINT "forced_punchouts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "late_arrival_reasons" ADD CONSTRAINT "late_arrival_reasons_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "late_arrival_reasons" ADD CONSTRAINT "late_arrival_reasons_attendance_id_attendance_records_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "late_arrival_reasons" ADD CONSTRAINT "late_arrival_reasons_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_department_group_id_department_groups_id_fk" FOREIGN KEY ("department_group_id") REFERENCES "public"."department_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_department_assignments" ADD CONSTRAINT "manager_department_assignments_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_department_assignments" ADD CONSTRAINT "manager_department_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_location_data" ADD CONSTRAINT "mobile_location_data_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_alert_id_system_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."system_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_recipient_id_notification_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."notification_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_incidents" ADD CONSTRAINT "penalty_incidents_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_incidents" ADD CONSTRAINT "penalty_incidents_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_incidents" ADD CONSTRAINT "penalty_incidents_mitigation_approved_by_users_id_fk" FOREIGN KEY ("mitigation_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_incidents" ADD CONSTRAINT "penalty_incidents_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_settings" ADD CONSTRAINT "penalty_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_settings" ADD CONSTRAINT "penalty_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polling_queue" ADD CONSTRAINT "polling_queue_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polling_queue_results" ADD CONSTRAINT "polling_queue_results_queue_id_polling_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."polling_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_announcement_templates" ADD CONSTRAINT "recent_announcement_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_category_id_reimbursement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."reimbursement_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_activity_log" ADD CONSTRAINT "request_activity_log_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_activity_log" ADD CONSTRAINT "request_activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_notifications" ADD CONSTRAINT "request_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_notifications" ADD CONSTRAINT "request_notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_audit_trail" ADD CONSTRAINT "scoring_audit_trail_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_audit_trail" ADD CONSTRAINT "scoring_audit_trail_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_baselines" ADD CONSTRAINT "scoring_baselines_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_configuration" ADD CONSTRAINT "scoring_configuration_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_based_calculations" ADD CONSTRAINT "shift_based_calculations_attendance_id_attendance_records_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_based_calculations" ADD CONSTRAINT "shift_based_calculations_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_current_shift_id_shifts_id_fk" FOREIGN KEY ("current_shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_requested_shift_id_shifts_id_fk" FOREIGN KEY ("requested_shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_swap_with_employee_id_employee_records_id_fk" FOREIGN KEY ("swap_with_employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alert_actions" ADD CONSTRAINT "system_alert_actions_alert_id_system_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."system_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alert_actions" ADD CONSTRAINT "system_alert_actions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alert_subscriptions" ADD CONSTRAINT "system_alert_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_configuration" ADD CONSTRAINT "system_configuration_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_assembled_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."assembled_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_templates" ADD CONSTRAINT "team_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_requests" ADD CONSTRAINT "training_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_requests" ADD CONSTRAINT "training_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_unbound_by_users_id_fk" FOREIGN KEY ("unbound_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_group_members" ADD CONSTRAINT "whatsapp_group_members_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_group_members" ADD CONSTRAINT "whatsapp_group_members_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_group_members" ADD CONSTRAINT "whatsapp_group_members_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_group_members" ADD CONSTRAINT "whatsapp_group_members_removed_by_user_id_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_onboarding_request_id_whatsapp_onboarding_requests_id_fk" FOREIGN KEY ("onboarding_request_id") REFERENCES "public"."whatsapp_onboarding_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_group_id_whatsapp_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."whatsapp_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_onboarding_config" ADD CONSTRAINT "whatsapp_onboarding_config_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_onboarding_requests" ADD CONSTRAINT "whatsapp_onboarding_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_onboarding_requests" ADD CONSTRAINT "whatsapp_onboarding_requests_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_from_home_requests" ADD CONSTRAINT "work_from_home_requests_employee_id_employee_records_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_from_home_requests" ADD CONSTRAINT "work_from_home_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_chatbot_conversations" ADD CONSTRAINT "whatsapp_chatbot_conversations_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_chatbot_conversations" ADD CONSTRAINT "whatsapp_chatbot_conversations_bot_config_id_whatsapp_chatbot_config_id_fk" FOREIGN KEY ("bot_config_id") REFERENCES "public"."whatsapp_chatbot_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_gateway_logs" ADD CONSTRAINT "whatsapp_gateway_logs_api_key_id_whatsapp_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."whatsapp_api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_queue" ADD CONSTRAINT "whatsapp_message_queue_message_id_whatsapp_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."whatsapp_messages"("id") ON DELETE cascade ON UPDATE no action;