CREATE TABLE `pricing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`package_name` text NOT NULL,
	`price_type` text NOT NULL,
	`amount` integer,
	`currency` text,
	`duration` text,
	`deliverables` text NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pricing_service_idx` ON `pricing` (`service_id`);--> statement-breakpoint
CREATE INDEX `pricing_status_idx` ON `pricing` (`status`);--> statement-breakpoint
CREATE TABLE `service_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`body_blocks` text NOT NULL,
	`deliverables` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_details_service_idx` ON `service_details` (`service_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`service_type` text NOT NULL,
	`short_description` text NOT NULL,
	`supporting_media_id` integer,
	`seo_meta_title` text,
	`seo_meta_description` text,
	`seo_og_media_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_idx` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `services_status_idx` ON `services` (`status`);