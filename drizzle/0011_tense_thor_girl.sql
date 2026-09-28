CREATE TABLE `version_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`version_no` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `version_history_entity_version_idx` ON `version_history` (`entity_type`,`entity_id`,`version_no`);--> statement-breakpoint
CREATE INDEX `version_history_entity_idx` ON `version_history` (`entity_type`,`entity_id`);