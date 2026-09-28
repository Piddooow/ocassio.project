CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`company` text,
	`email` text NOT NULL,
	`whatsapp` text,
	`service` text NOT NULL,
	`project_type` text NOT NULL,
	`project_description` text NOT NULL,
	`desired_date` text,
	`location` text,
	`budget_range` text,
	`expected_deliverables` text,
	`reference_url` text,
	`attachments` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `inquiries_created_idx` ON `inquiries` (`created_at`);