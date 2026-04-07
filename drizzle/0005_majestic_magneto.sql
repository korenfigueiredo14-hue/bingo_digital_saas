ALTER TABLE `bingo_rooms` ADD `accumulatedPrize` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `accumulatedEstablishment` varchar(255);--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `accumulatedMinBalls` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `bingo_rooms` ADD `accumulatedEnabled` boolean DEFAULT false NOT NULL;