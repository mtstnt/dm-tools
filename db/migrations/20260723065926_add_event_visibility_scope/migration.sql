CREATE TABLE `event_visibility_regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`region_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_visibility_regions_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_event_visibility_regions_region_id_regions_id_fk` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_visibility_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`event_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT `fk_event_visibility_teams_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_event_visibility_teams_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `visibility_scope` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `event_visibility_regions_event_region_unique` ON `event_visibility_regions` (`event_id`,`region_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_visibility_teams_event_team_unique` ON `event_visibility_teams` (`event_id`,`team_id`);