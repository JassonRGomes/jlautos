-- 🚀 SQL Script: Create test_drive_bookings Table (Manual Setup)
-- Execute this script on your hosted Hostinger database to create the table.

CREATE TABLE IF NOT EXISTS `test_drive_bookings` (
  `id` VARCHAR(191) NOT NULL,
  `booking_reference` VARCHAR(191) NOT NULL,
  `customer_id` VARCHAR(191) NOT NULL,
  `vehicle_id` VARCHAR(191) NOT NULL,
  `dealer_id` VARCHAR(191) NULL,
  `booking_date` DATETIME(3) NOT NULL,
  `booking_time` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Pending Approval',
  `customer_notes` TEXT NULL,
  `dealer_notes` TEXT NULL,
  `cancellation_reason` TEXT NULL,
  `rejection_reason` TEXT NULL,
  `google_event_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_drive_bookings_booking_reference_key` (`booking_reference`),
  KEY `test_drive_bookings_customer_id_idx` (`customer_id`),
  KEY `test_drive_bookings_vehicle_id_idx` (`vehicle_id`),
  
  CONSTRAINT `fk_test_drive_bookings_customer` 
    FOREIGN KEY (`customer_id`) REFERENCES `User` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT `fk_test_drive_bookings_vehicle` 
    FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
