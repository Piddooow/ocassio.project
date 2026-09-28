CREATE TABLE `homepage_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homepage_sections_key_idx` ON `homepage_sections` (`section_key`);