PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_event_assignment_change_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`user_from_id` integer,
	`user_to_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` integer,
	`approved_at` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_assignment_change_requests_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_event_assignment_change_requests_user_from_id_users_id_fk` FOREIGN KEY (`user_from_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_event_assignment_change_requests_user_to_id_users_id_fk` FOREIGN KEY (`user_to_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_event_assignment_change_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_event_assignment_change_requests`(`id`, `event_id`, `user_from_id`, `user_to_id`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `created_by`, `updated_by`) SELECT `id`, `event_id`, `user_from_id`, `user_to_id`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `created_by`, `updated_by` FROM `event_assignment_change_requests`;--> statement-breakpoint
DROP TABLE `event_assignment_change_requests`;--> statement-breakpoint
ALTER TABLE `__new_event_assignment_change_requests` RENAME TO `event_assignment_change_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignment_change_requests_unique` ON `event_assignment_change_requests` (`event_id`,`user_from_id`,`user_to_id`);