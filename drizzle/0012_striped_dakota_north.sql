CREATE TABLE `likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_entity_visitor_idx` ON `likes` (`entity_type`,`entity_slug`,`visitor_id`);--> statement-breakpoint
CREATE INDEX `likes_entity_idx` ON `likes` (`entity_type`,`entity_slug`);