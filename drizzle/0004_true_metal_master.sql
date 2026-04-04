ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','seller') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `establishmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `establishmentAddress` text;--> statement-breakpoint
ALTER TABLE `users` ADD `establishmentPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;