CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quote` varchar(1024) NOT NULL,
	`author` varchar(255) NOT NULL,
	`favorite` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quote_unique` UNIQUE(`quote`)
);
