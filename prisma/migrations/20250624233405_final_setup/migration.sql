-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'musician') NOT NULL DEFAULT 'musician',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_date` DATE NOT NULL,
    `cifras` TEXT NULL,
    `paleta_cores` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_participations` (
    `schedule_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `instrument` ENUM('guitarra', 'baixo', 'teclado', 'violao', 'bateria', 'vocal', 'percussao') NOT NULL,

    PRIMARY KEY (`schedule_id`, `user_id`, `instrument`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_songs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_id` INTEGER NOT NULL,
    `song_name` VARCHAR(191) NOT NULL,
    `youtube_link` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_confirmations` (
    `schedule_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,

    PRIMARY KEY (`schedule_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_change_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `request_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `schedule_change_requests_schedule_id_user_id_key`(`schedule_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_instruments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `instrument` ENUM('guitarra', 'baixo', 'teclado', 'violao', 'bateria', 'vocal', 'percussao') NOT NULL,

    UNIQUE INDEX `user_instruments_userId_instrument_key`(`userId`, `instrument`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schedule_participations` ADD CONSTRAINT `schedule_participations_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_participations` ADD CONSTRAINT `schedule_participations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_songs` ADD CONSTRAINT `schedule_songs_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_confirmations` ADD CONSTRAINT `schedule_confirmations_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_confirmations` ADD CONSTRAINT `schedule_confirmations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_change_requests` ADD CONSTRAINT `schedule_change_requests_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_change_requests` ADD CONSTRAINT `schedule_change_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_instruments` ADD CONSTRAINT `user_instruments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
