CREATE TABLE `embeddings` (
	`note_id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`vector` text NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`lens` text NOT NULL,
	`question` text,
	`content` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `insights_note_idx` ON `insights` (`note_id`);