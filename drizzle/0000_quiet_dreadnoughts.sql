CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`raw_text` text NOT NULL,
	`content` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`action_items` text DEFAULT '[]' NOT NULL,
	`entities` text DEFAULT '{"people":[],"places":[],"projects":[]}' NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`language` text DEFAULT 'und' NOT NULL,
	`due_date` text,
	`latitude` real,
	`longitude` real,
	`place_name` text,
	`source` text DEFAULT 'web' NOT NULL,
	`audio_path` text,
	`enriched_by` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`error` text,
	`pinned` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`captured_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_captured_at_idx` ON `notes` (`captured_at`);--> statement-breakpoint
CREATE INDEX `notes_category_idx` ON `notes` (`category`);--> statement-breakpoint
CREATE INDEX `notes_status_idx` ON `notes` (`status`);