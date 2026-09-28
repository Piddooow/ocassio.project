CREATE TABLE `service_faq_relations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`faq_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`faq_id`) REFERENCES `faq`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_faq_relations_unique_idx` ON `service_faq_relations` (`service_id`,`faq_id`);--> statement-breakpoint
CREATE INDEX `service_faq_relations_service_idx` ON `service_faq_relations` (`service_id`);--> statement-breakpoint
CREATE TABLE `service_project_relations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`project_slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_project_relations_unique_idx` ON `service_project_relations` (`service_id`,`project_slug`);--> statement-breakpoint
CREATE INDEX `service_project_relations_service_idx` ON `service_project_relations` (`service_id`);