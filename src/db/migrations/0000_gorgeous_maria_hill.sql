CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`date` text NOT NULL,
	`time` text,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`notify_enabled` integer DEFAULT true NOT NULL,
	`notification_identifier` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calendar_events_date_idx` ON `calendar_events` (`date`);--> statement-breakpoint
CREATE INDEX `calendar_events_type_idx` ON `calendar_events` (`type`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_date` text NOT NULL,
	`title` text NOT NULL,
	`body_json` text NOT NULL,
	`body_plain_text` text NOT NULL,
	`mood` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entries_entry_date_idx` ON `entries` (`entry_date`);--> statement-breakpoint
CREATE TABLE `entry_images` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`cloudinary_public_id` text NOT NULL,
	`cloudinary_url` text NOT NULL,
	`width` integer,
	`height` integer,
	`is_cover` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entry_images_entry_id_idx` ON `entry_images` (`entry_id`);