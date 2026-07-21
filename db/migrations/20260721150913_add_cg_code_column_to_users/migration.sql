ALTER TABLE `users` ADD `cg_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_nij_unique` ON `users` (`nij`);