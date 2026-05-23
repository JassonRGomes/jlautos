-- =============================================================
-- J&L AUTOS — SCRIPT DE CRIAÇÃO DO BANCO DE DADOS
-- Banco: u373012508_jassongomes
-- Versão: 1.0.0 — Gerado em 2026-05-23
--
-- INSTRUÇÕES:
-- 1. Acesse hPanel → Bancos de Dados → phpMyAdmin
-- 2. Selecione o banco "u373012508_jassongomes" no painel esquerdo
-- 3. Clique na aba "SQL" no menu superior
-- 4. Cole TODO o conteúdo deste arquivo e clique em "Executar"
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- Tabela: User (Usuários do sistema)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
    `id`                  VARCHAR(191) NOT NULL,
    `email`               VARCHAR(191) NOT NULL,
    `passwordHash`        VARCHAR(191) NOT NULL,
    `name`                VARCHAR(191) NOT NULL,
    `phone`               VARCHAR(191) NULL,
    `image`               VARCHAR(191) NULL,
    `role`                VARCHAR(191) NOT NULL DEFAULT 'CUSTOMER',
    `forcePasswordChange` BOOLEAN      NOT NULL DEFAULT false,
    `isActive`            BOOLEAN      NOT NULL DEFAULT true,
    `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key` (`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Session (Sessões de autenticação)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Session` (
    `id`           VARCHAR(191) NOT NULL,
    `userId`       VARCHAR(191) NOT NULL,
    `refreshToken` TEXT         NOT NULL,
    `userAgent`    VARCHAR(191) NULL,
    `ipAddress`    VARCHAR(191) NULL,
    `expiresAt`    DATETIME(3)  NOT NULL,
    `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Customer (Clientes da concessionária)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Customer` (
    `id`        VARCHAR(191) NOT NULL,
    `name`      VARCHAR(191) NOT NULL,
    `email`     VARCHAR(191) NULL,
    `phone`     VARCHAR(191) NULL,
    `document`  VARCHAR(191) NULL,
    `address`   VARCHAR(191) NULL,
    `city`      VARCHAR(191) NULL,
    `state`     VARCHAR(191) NULL,
    `zipCode`   VARCHAR(191) NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Customer_email_key`    (`email`),
    UNIQUE INDEX `Customer_document_key` (`document`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Dealership (Concessionárias)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Dealership` (
    `id`        VARCHAR(191) NOT NULL,
    `name`      VARCHAR(191) NOT NULL,
    `email`     VARCHAR(191) NULL,
    `phone`     VARCHAR(191) NULL,
    `address`   VARCHAR(191) NULL,
    `city`      VARCHAR(191) NULL,
    `state`     VARCHAR(191) NULL,
    `zipCode`   VARCHAR(191) NULL,
    `status`    VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Vehicle (Veículos)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Vehicle` (
    `id`                      VARCHAR(191)   NOT NULL,
    `make`                    VARCHAR(191)   NOT NULL,
    `model`                   VARCHAR(191)   NOT NULL,
    `year`                    INTEGER        NOT NULL,
    `color`                   VARCHAR(191)   NOT NULL DEFAULT 'Black',
    `mileage`                 INTEGER        NOT NULL DEFAULT 0,
    `price`                   DECIMAL(12, 2) NOT NULL,
    `vin`                     VARCHAR(191)   NULL,
    `status`                  VARCHAR(191)   NOT NULL DEFAULT 'ON_SALE',
    `images`                  TEXT           NOT NULL,
    `description`             TEXT           NULL,
    `transmission`            VARCHAR(191)   NULL,
    `engine`                  VARCHAR(191)   NULL,
    `fuelType`                VARCHAR(191)   NULL,
    `bodyStyle`               VARCHAR(191)   NULL,
    `seats`                   INTEGER        NULL,
    `doors`                   INTEGER        NULL,
    `isFinanceWarrantyActive` BOOLEAN        NOT NULL DEFAULT false,
    `financeData`             TEXT           NULL,
    `warrantyData`            TEXT           NULL,
    `features`                TEXT           NULL,
    `dealershipId`            VARCHAR(191)   NULL,
    `createdAt`               DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`               DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Vehicle_vin_key` (`vin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: AvailabilitySlot (Horários disponíveis)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AvailabilitySlot` (
    `id`           VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `date`         DATETIME(3)  NOT NULL,
    `startTime`    VARCHAR(191) NOT NULL,
    `endTime`      VARCHAR(191) NOT NULL,
    `isBooked`     BOOLEAN      NOT NULL DEFAULT false,
    `type`         VARCHAR(191) NOT NULL DEFAULT 'TEST_DRIVE',
    `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Favorite (Favoritos dos usuários)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Favorite` (
    `id`        VARCHAR(191) NOT NULL,
    `userId`    VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Favorite_userId_vehicleId_key` (`userId`, `vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: SavedSearch (Buscas salvas)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `SavedSearch` (
    `id`          VARCHAR(191) NOT NULL,
    `userId`      VARCHAR(191) NOT NULL,
    `name`        VARCHAR(191) NOT NULL,
    `queryParams` TEXT         NOT NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Category (Categorias de produtos)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Category` (
    `id`          INTEGER      NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_name_key` (`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Supplier (Fornecedores)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Supplier` (
    `id`        INTEGER      NOT NULL AUTO_INCREMENT,
    `name`      VARCHAR(191) NOT NULL,
    `email`     VARCHAR(191) NULL,
    `phone`     VARCHAR(191) NULL,
    `document`  VARCHAR(191) NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Product (Produtos / Peças)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Product` (
    `id`          VARCHAR(191)   NOT NULL,
    `name`        VARCHAR(191)   NOT NULL,
    `sku`         VARCHAR(191)   NOT NULL,
    `description` TEXT           NULL,
    `price`       DECIMAL(12, 2) NOT NULL,
    `costPrice`   DECIMAL(12, 2) NOT NULL,
    `stock`       INTEGER        NOT NULL DEFAULT 0,
    `categoryId`  INTEGER        NOT NULL,
    `supplierId`  INTEGER        NULL,
    `createdAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Product_sku_key` (`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: StockMovement (Movimentações de estoque)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `StockMovement` (
    `id`        VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `userId`    VARCHAR(191) NOT NULL,
    `type`      VARCHAR(191) NOT NULL,
    `quantity`  INTEGER      NOT NULL,
    `notes`     VARCHAR(191) NULL,
    `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Sale (Vendas)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Sale` (
    `id`          VARCHAR(191)   NOT NULL,
    `customerId`  VARCHAR(191)   NOT NULL,
    `userId`      VARCHAR(191)   NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `status`      VARCHAR(191)   NOT NULL DEFAULT 'PENDING',
    `notes`       TEXT           NULL,
    `createdAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: SaleItem (Itens de uma venda)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `SaleItem` (
    `id`         VARCHAR(191)   NOT NULL,
    `saleId`     VARCHAR(191)   NOT NULL,
    `vehicleId`  VARCHAR(191)   NULL,
    `productId`  VARCHAR(191)   NULL,
    `quantity`   INTEGER        NOT NULL DEFAULT 1,
    `unitPrice`  DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `createdAt`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: FinancialTransaction (Transações financeiras)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `FinancialTransaction` (
    `id`          VARCHAR(191)   NOT NULL,
    `saleId`      VARCHAR(191)   NULL,
    `type`        VARCHAR(191)   NOT NULL,
    `amount`      DECIMAL(12, 2) NOT NULL,
    `status`      VARCHAR(191)   NOT NULL DEFAULT 'PENDING',
    `dueDate`     DATETIME(3)    NULL,
    `paidDate`    DATETIME(3)    NULL,
    `description` VARCHAR(191)   NULL,
    `createdAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: Booking (Agendamentos)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Booking` (
    `id`                 VARCHAR(191) NOT NULL,
    `userId`             VARCHAR(191) NOT NULL,
    `vehicleId`          VARCHAR(191) NOT NULL,
    `dealershipId`       VARCHAR(191) NULL,
    `availabilitySlotId` VARCHAR(191) NULL,
    `bookingDate`        DATETIME(3)  NOT NULL,
    `bookingTime`        VARCHAR(191) NOT NULL,
    `status`             VARCHAR(191) NOT NULL DEFAULT 'pending',
    `notes`              TEXT         NULL,
    `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: TestDrive (Test drives)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TestDrive` (
    `id`                    VARCHAR(191) NOT NULL,
    `userId`                VARCHAR(191) NOT NULL,
    `vehicleId`             VARCHAR(191) NOT NULL,
    `dealershipId`          VARCHAR(191) NULL,
    `availabilitySlotId`    VARCHAR(191) NULL,
    `salesRepresentativeId` VARCHAR(191) NULL,
    `testDriveDate`         DATETIME(3)  NOT NULL,
    `testDriveTime`         VARCHAR(191) NOT NULL,
    `location`              VARCHAR(191) NOT NULL DEFAULT 'Dealership',
    `status`                VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `notes`                 TEXT         NULL,
    `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Tabela: ActivityLog (Log de atividades)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ActivityLog` (
    `id`          VARCHAR(191) NOT NULL,
    `action`      VARCHAR(191) NOT NULL,
    `entityType`  VARCHAR(191) NOT NULL,
    `entityId`    VARCHAR(191) NOT NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================
-- CHAVES ESTRANGEIRAS (Foreign Keys)
-- =============================================================

ALTER TABLE `Session`
    ADD CONSTRAINT `Session_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Vehicle`
    ADD CONSTRAINT `Vehicle_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `Dealership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AvailabilitySlot`
    ADD CONSTRAINT `AvailabilitySlot_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `Dealership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Favorite`
    ADD CONSTRAINT `Favorite_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Favorite`
    ADD CONSTRAINT `Favorite_vehicleId_fkey`
    FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SavedSearch`
    ADD CONSTRAINT `SavedSearch_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Product`
    ADD CONSTRAINT `Product_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Product`
    ADD CONSTRAINT `Product_supplierId_fkey`
    FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `StockMovement`
    ADD CONSTRAINT `StockMovement_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StockMovement`
    ADD CONSTRAINT `StockMovement_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Sale`
    ADD CONSTRAINT `Sale_customerId_fkey`
    FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Sale`
    ADD CONSTRAINT `Sale_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SaleItem`
    ADD CONSTRAINT `SaleItem_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SaleItem`
    ADD CONSTRAINT `SaleItem_vehicleId_fkey`
    FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SaleItem`
    ADD CONSTRAINT `SaleItem_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FinancialTransaction`
    ADD CONSTRAINT `FinancialTransaction_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Booking`
    ADD CONSTRAINT `Booking_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Booking`
    ADD CONSTRAINT `Booking_vehicleId_fkey`
    FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Booking`
    ADD CONSTRAINT `Booking_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `Dealership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Booking`
    ADD CONSTRAINT `Booking_availabilitySlotId_fkey`
    FOREIGN KEY (`availabilitySlotId`) REFERENCES `AvailabilitySlot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TestDrive`
    ADD CONSTRAINT `TestDrive_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TestDrive`
    ADD CONSTRAINT `TestDrive_vehicleId_fkey`
    FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TestDrive`
    ADD CONSTRAINT `TestDrive_salesRepresentativeId_fkey`
    FOREIGN KEY (`salesRepresentativeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TestDrive`
    ADD CONSTRAINT `TestDrive_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `Dealership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TestDrive`
    ADD CONSTRAINT `TestDrive_availabilitySlotId_fkey`
    FOREIGN KEY (`availabilitySlotId`) REFERENCES `AvailabilitySlot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ActivityLog`
    ADD CONSTRAINT `ActivityLog_performedBy_fkey`
    FOREIGN KEY (`performedBy`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- USUÁRIO ADMINISTRADOR PADRÃO
-- Email: admin@jlautos.com | Senha: admin
-- (hash bcrypt de "admin")
-- =============================================================
INSERT IGNORE INTO `User` (`id`, `email`, `passwordHash`, `name`, `role`, `forcePasswordChange`, `isActive`, `createdAt`, `updatedAt`)
VALUES (
    'admin-00000000-0000-0000-0000-000000000001',
    'admin@jlautos.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Administrador',
    'ADMIN',
    false,
    true,
    NOW(),
    NOW()
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- FIM DO SCRIPT — J&L AUTOS DATABASE v1.0.0
-- 16 tabelas criadas com sucesso.
-- =============================================================
