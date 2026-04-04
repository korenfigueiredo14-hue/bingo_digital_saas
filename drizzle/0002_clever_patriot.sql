ALTER TABLE `bingo_cards` MODIFY COLUMN `markedNumbers` json;--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `prizeQuadra` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `prizeQuina` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `prizeFullCard` decimal(10,2) DEFAULT '0.00';