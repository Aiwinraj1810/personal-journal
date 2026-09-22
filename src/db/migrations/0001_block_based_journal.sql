ALTER TABLE `entries` RENAME COLUMN `body_json` TO `blocks_json`;
--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `tags` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `deleted_at` integer;
--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `cover_image_url` text;
--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `cover_image_width` integer;
--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `cover_image_height` integer;
