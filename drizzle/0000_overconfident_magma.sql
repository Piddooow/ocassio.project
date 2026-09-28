CREATE TABLE `article_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`block_type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`text_content` text,
	`media_id` integer,
	`reference_project_id` integer,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_blocks_article_idx` ON `article_blocks` (`article_id`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`category_id` integer,
	`cover_media_id` integer,
	`excerpt` text NOT NULL,
	`publish_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`publish_at` text,
	`seo_meta_title` text,
	`seo_meta_description` text,
	`seo_og_media_id` integer,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `journal_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_idx` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_visibility_idx` ON `articles` (`status`,`visibility`);--> statement-breakpoint
CREATE INDEX `articles_category_idx` ON `articles` (`category_id`);--> statement-breakpoint
CREATE TABLE `journal_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_categories_slug_idx` ON `journal_categories` (`slug`);