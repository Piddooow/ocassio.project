CREATE TABLE `upcoming_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`project_type` text NOT NULL,
	`description` text NOT NULL,
	`media_id` integer,
	`location` text,
	`expected_release` text,
	`status` text DEFAULT 'coming_soon' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`publish_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`related_project_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `upcoming_projects_status_visibility_idx` ON `upcoming_projects` (`status`,`visibility`);