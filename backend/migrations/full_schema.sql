-- FULL SCHEMA MIGRATION FOR NEW SUPABASE PROJECT
-- Run this in your NEW Supabase project SQL Editor

-- =============================================================================
-- ENUMS (Create these first)
-- =============================================================================

CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Gcash', 'Maya');
CREATE TYPE "Roles" AS ENUM ('Admin', 'Pharmacist', 'Cashier');

-- =============================================================================
-- TABLES (In dependency order)
-- =============================================================================

-- Discount Table
CREATE TABLE "Discount" (
    "DiscountID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" varchar NOT NULL,
    "DiscountPercent" numeric NOT NULL,
    "IsVATExemptYN" boolean DEFAULT false,
    "CreatedAt" timestamp DEFAULT now(),
    "UpdatedAt" timestamp DEFAULT now()
);

-- Supplier Table
CREATE TABLE "Supplier" (
    "SupplierID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" varchar NOT NULL,
    "ContactPerson" varchar,
    "ContactNumber" varchar,
    "Email" varchar,
    "Address" text,
    "Remarks" text,
    "IsActiveYN" boolean DEFAULT true,
    "CreatedAt" timestamp DEFAULT now(),
    "UpdatedAt" timestamp DEFAULT now()
);

-- User Table
CREATE TABLE "User" (
    "UserID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "FirstName" varchar NOT NULL,
    "MiddleInitial" varchar,
    "LastName" varchar NOT NULL,
    "Username" varchar UNIQUE NOT NULL,
    "Address" text,
    "ContactNumber" varchar,
    "DateTimeLastLoggedIn" timestamp,
    "CreatedAt" timestamp DEFAULT now(),
    "UpdatedAt" timestamp DEFAULT now(),
    "AuthUserID" uuid UNIQUE,
    "Roles" "Roles" NOT NULL DEFAULT 'Admin',
    "Email" varchar,
    "IsActive" boolean DEFAULT true,
    "PharmacistYN" boolean DEFAULT false,
    "HasCompletedFirstLogin" boolean DEFAULT false,
    CONSTRAINT "User_AuthUserID_fkey" FOREIGN KEY ("AuthUserID") REFERENCES auth.users(id)
);

-- Pharmacist Table
CREATE TABLE "Pharmacist" (
    "PharmacistID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" uuid NOT NULL,
    "LicenseNumber" varchar,
    "Specialization" varchar,
    "YearsOfExperience" integer,
    "IsActive" boolean DEFAULT true,
    "CreatedAt" timestamp DEFAULT now(),
    CONSTRAINT "Pharmacist_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID")
);

-- Product Table
CREATE TABLE "Product" (
    "ProductID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" uuid NOT NULL,
    "SupplierID" uuid NOT NULL,
    "Name" varchar NOT NULL,
    "GenericName" varchar,
    "Category" varchar,
    "Brand" varchar,
    "Image" text,
    "SellingPrice" numeric NOT NULL,
    "IsVATExemptYN" boolean DEFAULT false,
    "VATAmount" numeric DEFAULT 0,
    "PrescriptionYN" boolean DEFAULT false,
    "DateTimeLastUpdate" timestamp DEFAULT now(),
    "IsActive" boolean DEFAULT true,
    "CreatedAt" timestamp DEFAULT now(),
    "SeniorPWDYN" boolean,
    CONSTRAINT "Product_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID"),
    CONSTRAINT "Product_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID")
);

-- Product_Item Table
CREATE TABLE "Product_Item" (
    "ProductItemID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "ProductID" uuid NOT NULL,
    "UserID" uuid NOT NULL,
    "Stock" integer NOT NULL DEFAULT 0,
    "ExpiryDate" date,
    "BatchNumber" varchar,
    "Location" varchar DEFAULT 'main_store',
    "DateTimeLastUpdate" timestamp DEFAULT now(),
    "IsActive" boolean DEFAULT true,
    "CreatedAt" timestamp DEFAULT now(),
    CONSTRAINT "Product_Item_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Product"("ProductID"),
    CONSTRAINT "Product_Item_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID")
);

-- Transaction Table
CREATE TABLE "Transaction" (
    "TransactionID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" uuid NOT NULL,
    "PharmacistID" uuid,
    "VATAmount" numeric DEFAULT 0,
    "Total" numeric NOT NULL,
    "OrderDateTime" timestamp DEFAULT now(),
    "PaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'Cash',
    "CashReceived" numeric,
    "PaymentChange" numeric,
    "ReferenceNo" varchar UNIQUE,
    "CreatedAt" timestamp DEFAULT now(),
    "SeniorPWDID" varchar,
    CONSTRAINT "Transaction_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID"),
    CONSTRAINT "Transaction_PharmacistID_fkey" FOREIGN KEY ("PharmacistID") REFERENCES "Pharmacist"("PharmacistID")
);

-- Transaction_Item Table
CREATE TABLE "Transaction_Item" (
    "TransactionItemID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "TransactionID" uuid NOT NULL,
    "ProductID" uuid NOT NULL,
    "DiscountID" uuid,
    "Quantity" integer NOT NULL,
    "UnitPrice" numeric NOT NULL,
    "Subtotal" numeric NOT NULL,
    "CreatedAt" timestamp DEFAULT now(),
    "DiscountAmount" numeric DEFAULT 0,
    "VATAmount" numeric DEFAULT 0,
    CONSTRAINT "Transaction_Item_TransactionID_fkey" FOREIGN KEY ("TransactionID") REFERENCES "Transaction"("TransactionID"),
    CONSTRAINT "Transaction_Item_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Product"("ProductID"),
    CONSTRAINT "Transaction_Item_DiscountID_fkey" FOREIGN KEY ("DiscountID") REFERENCES "Discount"("DiscountID")
);

-- Purchase_Order Table
CREATE TABLE "Purchase_Order" (
    "PurchaseOrderID" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "SupplierID" uuid NOT NULL,
    "ProductID" uuid NOT NULL,
    "OrderPlacedDateTime" timestamp DEFAULT now(),
    "ETA" timestamp,
    "OrderArrivalDateTime" timestamp,
    "BasePrice" numeric NOT NULL,
    "TotalPurchaseCost" numeric NOT NULL,
    "Quantity" integer NOT NULL,
    "CreatedAt" timestamp DEFAULT now(),
    "UpdatedAt" timestamp DEFAULT now(),
    CONSTRAINT "Purchase_Order_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID"),
    CONSTRAINT "Purchase_Order_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Product"("ProductID")
);

-- TrustedDevices Table
CREATE TABLE "TrustedDevices" (
    "DeviceID" serial PRIMARY KEY,
    "UserID" uuid NOT NULL,
    "DeviceIdentifier" varchar NOT NULL,
    "DeviceInfo" text,
    "IsTrusted" boolean NOT NULL DEFAULT true,
    "TrustedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastUsedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_TrustedDevices_User" FOREIGN KEY ("UserID") REFERENCES "User"("UserID")
);

-- Notifications Table
CREATE TABLE "Notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" text NOT NULL CHECK ("type" IN ('LOW_STOCK', 'EXPIRING')),
    "product_id" uuid NOT NULL,
    "product_item_id" uuid,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "severity" text NOT NULL DEFAULT 'warning',
    "meta" jsonb NOT NULL DEFAULT '{}',
    "is_read" boolean NOT NULL DEFAULT false,
    "sent_sms" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "created_date" date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
    CONSTRAINT "notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("ProductID"),
    CONSTRAINT "notifications_product_item_id_fkey" FOREIGN KEY ("product_item_id") REFERENCES "Product_Item"("ProductItemID")
);

-- SMS_Log Table
CREATE TABLE "SMS_Log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "sent_at" timestamp NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES (Performance optimization)
-- =============================================================================

-- Product indexes
CREATE INDEX idx_product_is_active ON "Product"("IsActive");
CREATE INDEX idx_product_category ON "Product"("Category");
CREATE INDEX idx_product_name ON "Product"("Name");
CREATE INDEX idx_product_generic_name ON "Product"("GenericName");
CREATE INDEX idx_product_supplier ON "Product"("SupplierID");

-- Product_Item indexes
CREATE INDEX idx_product_item_product_id ON "Product_Item"("ProductID");
CREATE INDEX idx_product_item_is_active ON "Product_Item"("IsActive");
CREATE INDEX idx_product_item_stock ON "Product_Item"("Stock");
CREATE INDEX idx_product_item_expiry ON "Product_Item"("ExpiryDate");

-- Transaction indexes
CREATE INDEX idx_transaction_order_date ON "Transaction"("OrderDateTime" DESC);
CREATE INDEX idx_transaction_reference_no ON "Transaction"("ReferenceNo");
CREATE INDEX idx_transaction_user_id ON "Transaction"("UserID");
CREATE INDEX idx_transaction_payment_method ON "Transaction"("PaymentMethod");

-- Transaction_Item indexes
CREATE INDEX idx_transaction_item_transaction_id ON "Transaction_Item"("TransactionID");
CREATE INDEX idx_transaction_item_product_id ON "Transaction_Item"("ProductID");
CREATE INDEX idx_transaction_item_composite ON "Transaction_Item"("TransactionID", "ProductID");

-- User indexes
CREATE INDEX idx_user_auth_user_id ON "User"("AuthUserID");
CREATE INDEX idx_user_email ON "User"("Email");
CREATE INDEX idx_user_username ON "User"("Username");

-- =============================================================================
-- DONE! Schema created with all indexes
-- =============================================================================
