
CREATE TABLE `aft_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`uploaded_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `aft_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `aft_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`action` text NOT NULL,
	`old_status` text,
	`new_status` text,
	`changes` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `aft_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `aft_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_number` text NOT NULL,
	`requestor_id` integer NOT NULL,
	`approver_id` integer,
	`dta_id` integer,
	`sme_id` integer,
	`media_custodian_id` integer,
	`tpi_required` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`requestor_name` text NOT NULL,
	`requestor_org` text NOT NULL,
	`requestor_phone` text NOT NULL,
	`requestor_email` text NOT NULL,
	`transfer_purpose` text NOT NULL,
	`transfer_type` text NOT NULL,
	`classification` text NOT NULL,
	`caveat_info` text,
	`data_description` text NOT NULL,
	`source_system` text,
	`source_location` text,
	`source_contact` text,
	`source_phone` text,
	`source_email` text,
	`dest_system` text,
	`dest_location` text,
	`dest_contact` text,
	`dest_phone` text,
	`dest_email` text,
	`data_format` text,
	`data_size` text,
	`transfer_method` text,
	`encryption` text,
	`compression_required` integer,
	`requested_start_date` integer,
	`requested_end_date` integer,
	`urgency_level` text,
	`actual_start_date` integer,
	`actual_end_date` integer,
	`transfer_notes` text,
	`transfer_data` text,
	`verification_type` text,
	`verification_results` text,
	`approval_date` integer,
	`approval_notes` text,
	`approval_data` text,
	`rejection_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`requestor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dta_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sme_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`media_custodian_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aft_requests_request_number_unique` ON `aft_requests` (`request_number`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`assigned_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`primary_role` text NOT NULL,
	`organization` text,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);