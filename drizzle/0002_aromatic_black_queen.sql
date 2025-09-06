CREATE TABLE `drive_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`serial_number` text NOT NULL,
	`model` text NOT NULL,
	`capacity` text NOT NULL,
	`media_controller` text NOT NULL,
	`classification` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_inventory_serial_number_unique` ON `drive_inventory` (`serial_number`);--> statement-breakpoint
CREATE TABLE `drive_tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`drive_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`custodian_id` integer NOT NULL,
	`source_is` text NOT NULL,
	`destination_is` text NOT NULL,
	`issued_at` integer NOT NULL,
	`expected_return_at` integer,
	`returned_at` integer,
	`status` text DEFAULT 'issued' NOT NULL,
	`issue_notes` text,
	`return_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`drive_id`) REFERENCES `drive_inventory`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`custodian_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `aft_requests` ADD `selected_drive_id` integer REFERENCES drive_inventory(id);