ALTER TABLE `notes` ADD `kind` text DEFAULT 'note' NOT NULL;--> statement-breakpoint
UPDATE `notes` SET `kind` = CASE `category` WHEN 'idea' THEN 'idea' WHEN 'task' THEN 'task' WHEN 'reflection' THEN 'reflection' WHEN 'journal' THEN 'journal' WHEN 'reference' THEN 'reference' ELSE 'note' END;
--> statement-breakpoint
UPDATE `notes` SET `category` = 'other';
--> statement-breakpoint
DELETE FROM `categories` WHERE `is_system` = 1;
