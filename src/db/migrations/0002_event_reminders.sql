CREATE TABLE `calendar_event_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`offset_type` text NOT NULL,
	`offset_value` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`notification_identifier` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calendar_event_reminders_event_id_idx` ON `calendar_event_reminders` (`event_id`);
--> statement-breakpoint
INSERT INTO `calendar_event_reminders` (`id`, `event_id`, `offset_type`, `offset_value`, `enabled`, `notification_identifier`, `created_at`)
SELECT lower(hex(randomblob(16))), `id`, 'at_time', NULL, `notify_enabled`, `notification_identifier`, `created_at`
FROM `calendar_events`
WHERE `notify_enabled` = 1 OR `notification_identifier` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `notify_enabled`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `notification_identifier`;
