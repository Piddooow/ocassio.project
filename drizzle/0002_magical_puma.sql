CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`media_type` text DEFAULT 'image' NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`file_size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`alt_text` text,
	`credit` text,
	`focal_point_x` integer,
	`focal_point_y` integer,
	`usage_state` text DEFAULT 'used' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_assets_usage_idx` ON `media_assets` (`usage_state`);--> statement-breakpoint
CREATE TABLE `media_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`format` text NOT NULL,
	`url` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_variants_asset_idx` ON `media_variants` (`asset_id`);