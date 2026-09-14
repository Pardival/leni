CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`format` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`answer` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`due` text NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`last_review` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cards_source_idx` ON `cards` (`source_id`);--> statement-breakpoint
CREATE INDEX `cards_due_idx` ON `cards` (`due`);--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`mastery` real DEFAULT 0 NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `concepts_source_idx` ON `concepts` (`source_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`sections` text DEFAULT '[]' NOT NULL,
	`key_points` text DEFAULT '[]' NOT NULL,
	`glossary` text DEFAULT '[]' NOT NULL,
	`open_questions` text DEFAULT '[]' NOT NULL,
	`model` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_source_id_unique` ON `documents` (`source_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`source_id` text NOT NULL,
	`rating` integer NOT NULL,
	`correct` integer NOT NULL,
	`answer_text` text,
	`feedback` text,
	`elapsed_ms` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_source_idx` ON `reviews` (`source_id`);--> statement-breakpoint
CREATE INDEX `reviews_created_idx` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`original_name` text,
	`url` text,
	`text` text NOT NULL,
	`char_count` integer DEFAULT 0 NOT NULL,
	`page_count` integer,
	`language` text DEFAULT 'und' NOT NULL,
	`status` text DEFAULT 'extracting' NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
