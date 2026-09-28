CREATE TABLE `project_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_media_project_idx` ON `project_media` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`client` text,
	`project_type` text NOT NULL,
	`category` text NOT NULL,
	`year` integer NOT NULL,
	`project_date` text NOT NULL,
	`location` text,
	`short_description` text NOT NULL,
	`cover_media_id` integer,
	`hero_media_id` integer,
	`credits` text DEFAULT '[]' NOT NULL,
	`related_slugs` text DEFAULT '[]' NOT NULL,
	`seo_meta_title` text,
	`seo_meta_description` text,
	`seo_og_media_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`publish_at` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_idx` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_status_visibility_idx` ON `projects` (`status`,`visibility`);