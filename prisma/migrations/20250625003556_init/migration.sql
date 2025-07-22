/*
  Warnings:

  - The primary key for the `schedule_confirmations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `schedule_participations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The values [guitarra,baixo,teclado,violao,bateria,vocal,percussao] on the enum `user_instruments_instrument` will be removed. If these variants are still used in the database, this will fail.
  - The values [guitarra,baixo,teclado,violao,bateria,vocal,percussao] on the enum `user_instruments_instrument` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[schedule_id,user_id]` on the table `schedule_confirmations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `schedule_change_requests_user_id_fkey` ON `schedule_change_requests`;

-- DropIndex
DROP INDEX `schedule_confirmations_user_id_fkey` ON `schedule_confirmations`;

-- DropIndex
DROP INDEX `schedule_participations_user_id_fkey` ON `schedule_participations`;

-- DropIndex
DROP INDEX `schedule_songs_schedule_id_fkey` ON `schedule_songs`;

-- AlterTable
ALTER TABLE `schedule_confirmations` DROP PRIMARY KEY;

-- AlterTable
ALTER TABLE `schedule_participations` DROP PRIMARY KEY,
    MODIFY `instrument` ENUM('GUITARRA', 'BAIXO', 'TECLADO', 'VIOLAO', 'BATERIA', 'VOCAL', 'PERCUSSAO') NOT NULL,
    ADD PRIMARY KEY (`schedule_id`, `user_id`, `instrument`);

-- AlterTable
ALTER TABLE `user_instruments` MODIFY `instrument` ENUM('GUITARRA', 'BAIXO', 'TECLADO', 'VIOLAO', 'BATERIA', 'VOCAL', 'PERCUSSAO') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `schedule_confirmations_schedule_id_user_id_key` ON `schedule_confirmations`(`schedule_id`, `user_id`);

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
