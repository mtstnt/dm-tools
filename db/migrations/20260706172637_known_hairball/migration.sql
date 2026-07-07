ALTER TABLE `events` ADD `mode` text DEFAULT 'teams' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_event_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`task_id` integer,
	`block_name` text,
	`rating` integer,
	`technical_notes` text,
	`non_technical_notes` text,
	`rated_by_user_id` integer,
	`rated_by` text,
	`rated_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_assignments_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`),
	CONSTRAINT `fk_event_assignments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_event_assignments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`),
	CONSTRAINT `fk_event_assignments_rated_by_user_id_users_id_fk` FOREIGN KEY (`rated_by_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_event_assignments`(`id`, `event_id`, `user_id`, `task_id`, `block_name`, `rating`, `technical_notes`, `non_technical_notes`, `rated_by_user_id`, `rated_by`, `rated_at`, `created_at`, `updated_at`, `created_by`, `updated_by`) SELECT `id`, `event_id`, `user_id`, `task_id`, `block_name`, `rating`, `technical_notes`, `non_technical_notes`, `rated_by_user_id`, `rated_by`, `rated_at`, `created_at`, `updated_at`, `created_by`, `updated_by` FROM `event_assignments`;--> statement-breakpoint
DROP TABLE `event_assignments`;--> statement-breakpoint
ALTER TABLE `__new_event_assignments` RENAME TO `event_assignments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignments_unique` ON `event_assignments` (`user_id`,`event_id`,`task_id`,`block_name`);