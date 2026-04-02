CREATE TABLE `bingo_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`operatorId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`qrCodeData` text,
	`grid` json NOT NULL,
	`playerName` varchar(255),
	`playerPhone` varchar(20),
	`status` enum('active','winner','cancelled') NOT NULL DEFAULT 'active',
	`markedNumbers` json DEFAULT ('[]'),
	`winType` enum('line','column','full_card'),
	`pricePaid` decimal(10,2),
	`transactionId` varchar(128),
	`printedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bingo_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `bingo_cards_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `bingo_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cardPrice` decimal(10,2) NOT NULL DEFAULT '10.00',
	`prize` decimal(10,2) NOT NULL DEFAULT '0.00',
	`prizeDescription` text,
	`status` enum('draft','open','running','paused','finished') NOT NULL DEFAULT 'draft',
	`drawIntervalSeconds` int NOT NULL DEFAULT 5,
	`maxCards` int NOT NULL DEFAULT 500,
	`currentBall` int,
	`winCondition` enum('line','column','full_card','any') NOT NULL DEFAULT 'any',
	`autoDrawEnabled` boolean NOT NULL DEFAULT false,
	`publicSlug` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`startedAt` timestamp,
	`finishedAt` timestamp,
	CONSTRAINT `bingo_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `bingo_rooms_publicSlug_unique` UNIQUE(`publicSlug`)
);
--> statement-breakpoint
CREATE TABLE `drawn_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`number` int NOT NULL,
	`drawnAt` timestamp NOT NULL DEFAULT (now()),
	`sequence` int NOT NULL,
	CONSTRAINT `drawn_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` enum('free','basic','professional','premium') NOT NULL,
	`monthlyPrice` decimal(10,2) NOT NULL,
	`maxRooms` int NOT NULL,
	`maxCardsPerRoom` int NOT NULL,
	`features` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`roomId` int,
	`cardId` int,
	`type` enum('card_sale','subscription','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','approved','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(64),
	`externalTransactionId` varchar(255),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `winners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`cardId` int NOT NULL,
	`operatorId` int NOT NULL,
	`winType` enum('line','column','full_card') NOT NULL,
	`prizeAmount` decimal(10,2),
	`confirmedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `winners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` enum('free','basic','professional','premium') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionExpiresAt` timestamp;