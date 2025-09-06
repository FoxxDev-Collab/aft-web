-- Add media_type column to drive_inventory table
ALTER TABLE `drive_inventory` ADD `media_type` text DEFAULT 'SSD' NOT NULL;