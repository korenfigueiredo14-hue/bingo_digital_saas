ALTER TABLE `bingo_cards` MODIFY COLUMN `winType` enum('line','column','full_card','quadra','quina');--> statement-breakpoint
ALTER TABLE `winners` MODIFY COLUMN `winType` enum('line','column','full_card','quadra','quina') NOT NULL;--> statement-breakpoint
ALTER TABLE `bingo_cards` ADD `cardNumbers` json;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);