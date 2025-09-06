-- Migration for CAC Digital Signatures
-- Created: $(date)
-- Description: Add CAC signature tables for digital signatures and certificate trust store

CREATE TABLE `cac_signatures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`step_type` text NOT NULL,
	`certificate_subject` text NOT NULL,
	`certificate_issuer` text NOT NULL,
	`certificate_serial` text NOT NULL,
	`certificate_thumbprint` text NOT NULL,
	`certificate_not_before` integer NOT NULL,
	`certificate_not_after` integer NOT NULL,
	`signature_data` text NOT NULL,
	`signed_data` text NOT NULL,
	`signature_algorithm` text DEFAULT 'RSA-SHA256' NOT NULL,
	`signature_reason` text,
	`signature_location` text,
	`ip_address` text,
	`user_agent` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` integer,
	`verification_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `aft_requests`(`id`) ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

CREATE TABLE `cac_trust_store` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`certificate_name` text NOT NULL,
	`certificate_data` text NOT NULL,
	`certificate_thumbprint` text NOT NULL,
	`issuer_dn` text NOT NULL,
	`subject_dn` text NOT NULL,
	`not_before` integer NOT NULL,
	`not_after` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_root_ca` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `cac_trust_store_certificate_thumbprint_unique` ON `cac_trust_store` (`certificate_thumbprint`);

-- Create indexes for better performance
CREATE INDEX `cac_signatures_request_id_idx` ON `cac_signatures` (`request_id`);
CREATE INDEX `cac_signatures_user_id_idx` ON `cac_signatures` (`user_id`);
CREATE INDEX `cac_signatures_step_type_idx` ON `cac_signatures` (`step_type`);
CREATE INDEX `cac_signatures_thumbprint_idx` ON `cac_signatures` (`certificate_thumbprint`);