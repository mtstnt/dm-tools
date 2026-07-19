DROP INDEX IF EXISTS `permissions_resource_action_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `role_permissions_role_permission_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `user_permissions_user_permission_unique`;--> statement-breakpoint
DROP TABLE `permissions`;--> statement-breakpoint
DROP TABLE `role_permissions`;--> statement-breakpoint
DROP TABLE `user_permissions`;