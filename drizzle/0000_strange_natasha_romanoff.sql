CREATE TABLE `studio_operations` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`committed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_state` (
	`source` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field` text NOT NULL,
	`value_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	PRIMARY KEY(`source`, `entity_type`, `entity_id`, `field`)
);
--> statement-breakpoint
CREATE INDEX `idx_studio_state_source_updated` ON `studio_state` (`source`,`updated_at`);