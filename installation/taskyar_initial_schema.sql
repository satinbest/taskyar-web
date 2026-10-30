-- ==============================================================
-- TaskYar Web 2.0 RC1 — Standalone MySQL Schema Dump
-- Complete Database Initialization for DirectAdmin phpMyAdmin
-- Compatible with MySQL 8.0+ and MariaDB 10.5+
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ==============================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: password_reset_tokens
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: cache & cache_locks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: categories
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#6D28D9',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `categories_user_id_name_index` (`user_id`, `name`),
  CONSTRAINT `categories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: tags
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tags` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_user_id_name_unique` (`user_id`, `name`),
  CONSTRAINT `tags_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: tasks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `due_date` date DEFAULT NULL,
  `due_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alarm_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `alarm_triggered` tinyint(1) NOT NULL DEFAULT 0,
  `reminder_offset_minutes` int(11) NOT NULL DEFAULT 0,
  `snooze_until` timestamp NULL DEFAULT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `important` tinyint(1) NOT NULL DEFAULT 0,
  `my_day` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_index` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `client_uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `sync_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'synced',
  `recurrence_pattern` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `recurrence_interval` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `recurrence_weekdays` json DEFAULT NULL,
  `recurrence_month_day` tinyint(3) UNSIGNED DEFAULT NULL,
  `recurrence_end_date` date DEFAULT NULL,
  `recurrence_count` int(10) UNSIGNED DEFAULT NULL,
  `recurrence_parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `recurrence_original_date` date DEFAULT NULL,
  `is_recurrence_exception` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_due_date_index` (`due_date`),
  KEY `tasks_completed_index` (`completed`),
  KEY `tasks_important_index` (`important`),
  KEY `tasks_client_uuid_index` (`client_uuid`),
  KEY `tasks_user_id_due_date_index` (`user_id`, `due_date`),
  KEY `tasks_user_id_completed_index` (`user_id`, `completed`),
  KEY `tasks_user_id_important_index` (`user_id`, `important`),
  KEY `tasks_user_id_category_id_index` (`user_id`, `category_id`),
  KEY `tasks_user_id_recurrence_pattern_index` (`user_id`, `recurrence_pattern`),
  KEY `tasks_user_id_client_uuid_idx` (`user_id`, `client_uuid`),
  KEY `tasks_user_due_date_time_idx` (`user_id`, `due_date`, `due_time`),
  CONSTRAINT `tasks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_recurrence_parent_id_foreign` FOREIGN KEY (`recurrence_parent_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: subtasks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subtasks` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `order_index` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `client_uuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subtasks_client_uuid_index` (`client_uuid`),
  KEY `subtasks_task_id_order_index_index` (`task_id`, `order_index`),
  KEY `subtasks_user_id_task_id_index` (`user_id`, `task_id`),
  KEY `subtasks_user_id_client_uuid_idx` (`user_id`, `client_uuid`),
  CONSTRAINT `subtasks_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subtasks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: task_tag
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_tag` (
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `tag_id` bigint(20) UNSIGNED NOT NULL,
  PRIMARY KEY (`task_id`, `tag_id`),
  KEY `task_tag_tag_id_foreign` (`tag_id`),
  CONSTRAINT `task_tag_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_tag_tag_id_foreign` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: task_recurrence_exceptions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_recurrence_exceptions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `occurrence_date` date NOT NULL,
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `completed_at` timestamp NULL DEFAULT NULL,
  `rescheduled_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_recurrence_exceptions_task_id_occurrence_date_unique` (`task_id`, `occurrence_date`),
  KEY `task_recurrence_exceptions_user_id_occurrence_date_index` (`user_id`, `occurrence_date`),
  CONSTRAINT `task_recurrence_exceptions_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_recurrence_exceptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: migrations (Pre-populated so Laravel artisan migrate stays in sync)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`) VALUES
('0001_01_01_000000_create_users_table', 1),
('0001_01_01_000001_create_cache_table', 1),
('0001_01_01_000002_create_jobs_table', 1),
('2026_10_26_000001_add_taskyar_columns_to_users_table', 1),
('2026_10_26_000002_create_tasks_table', 1),
('2026_10_26_000003_create_subtasks_table', 1),
('2026_10_26_000004_add_offline_sync_and_revision_to_tasks_and_subtasks', 1),
('2026_10_26_000005_create_categories_table', 1),
('2026_10_26_000006_create_tags_and_task_tag_tables', 1),
('2026_10_26_000007_add_recurrence_and_category_to_tasks_table', 1),
('2026_10_26_000008_create_task_recurrence_exceptions_table', 1),
('2026_10_26_000009_add_advanced_reminders_and_sync_meta_to_tasks', 1),
('2026_10_28_000001_add_performance_indexes_to_tasks_table', 1);

SET FOREIGN_KEY_CHECKS=1;
