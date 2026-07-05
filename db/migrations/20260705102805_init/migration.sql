CREATE TABLE `audit_trails` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`resource` text NOT NULL,
	`record_id` integer NOT NULL,
	`action` text NOT NULL,
	`user_id` integer,
	`user_name` text NOT NULL,
	`old_data` text NOT NULL,
	`new_data` text NOT NULL,
	`changed_at` integer NOT NULL,
	CONSTRAINT `fk_audit_trails_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_altar_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`description` text NOT NULL,
	`count` integer NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_altar_calls_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_assignment_change_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`user_from_id` integer NOT NULL,
	`user_to_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` integer,
	`approved_at` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_assignment_change_requests_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`),
	CONSTRAINT `fk_event_assignment_change_requests_user_from_id_users_id_fk` FOREIGN KEY (`user_from_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_event_assignment_change_requests_user_to_id_users_id_fk` FOREIGN KEY (`user_to_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_event_assignment_change_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`block_name` text,
	`rating` integer,
	`technical_notes` text NOT NULL,
	`non_technical_notes` text NOT NULL,
	`rated_by_user_id` integer NOT NULL,
	`rated_by` text NOT NULL,
	`rated_at` integer NOT NULL,
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
CREATE TABLE `event_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`metric_id` integer NOT NULL,
	`count` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_metrics_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`),
	CONSTRAINT `fk_event_metrics_metric_id_metrics_id_fk` FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_teams_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`),
	CONSTRAINT `fk_event_teams_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_volunteers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`ministry_id` integer NOT NULL,
	`count` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_volunteers_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`),
	CONSTRAINT `fk_event_volunteers_ministry_id_ministries_id_fk` FOREIGN KEY (`ministry_id`) REFERENCES `ministries`(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`region_id` integer NOT NULL,
	`event_type_id` integer NOT NULL,
	`date` integer NOT NULL,
	`name` text NOT NULL,
	`source_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_events_region_id_regions_id_fk` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`),
	CONSTRAINT `fk_events_event_type_id_event_types_id_fk` FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`)
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ministries` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	`scope` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
	CONSTRAINT `fk_role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`number` integer NOT NULL,
	`region_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_teams_region_id_regions_id_fk` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`full_name` text NOT NULL,
	`nij` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`source_id` integer,
	`team_id` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_users_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `configurations_name_unique` ON `configurations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_altar_calls_event_sequence_unique` ON `event_altar_calls` (`event_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignment_change_requests_unique` ON `event_assignment_change_requests` (`event_id`,`user_from_id`,`user_to_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_assignments_unique` ON `event_assignments` (`user_id`,`event_id`,`task_id`,`block_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_metrics_event_metric_unique` ON `event_metrics` (`event_id`,`metric_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_teams_event_team_unique` ON `event_teams` (`event_id`,`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_volunteers_event_ministry_unique` ON `event_volunteers` (`event_id`,`ministry_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_resource_action_unique` ON `permissions` (`resource`,`action`);--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_role_permission_unique` ON `role_permissions` (`role_id`,`permission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_number_unique` ON `teams` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_permissions_user_permission_unique` ON `user_permissions` (`user_id`,`permission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_user_role_unique` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);