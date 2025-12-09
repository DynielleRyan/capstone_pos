-- Migration: Create TrustedDevices table for browser-based OTP verification
-- This table tracks which browser instances have been verified for each user
-- Users will need to verify with OTP when logging in from a new browser instance
-- Note: This is browser-based, not device-based. Different browsers on the same device
-- will be treated as separate instances and require separate OTP verification.

CREATE TABLE IF NOT EXISTS "TrustedDevices" (
    "DeviceID" SERIAL PRIMARY KEY,
    "UserID" UUID NOT NULL,
    "DeviceIdentifier" VARCHAR(255) NOT NULL, -- Hash or ID of the browser fingerprint
    "DeviceInfo" TEXT, -- JSON string of browser fingerprint details (optional, for reference)
    "IsTrusted" BOOLEAN NOT NULL DEFAULT true,
    "TrustedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to User table
    CONSTRAINT "FK_TrustedDevices_User" FOREIGN KEY ("UserID") 
        REFERENCES "User"("UserID") 
        ON DELETE CASCADE,
    
    -- Unique constraint: one device identifier per user
    CONSTRAINT "UQ_TrustedDevices_User_Device" UNIQUE ("UserID", "DeviceIdentifier")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_TrustedDevices_UserID" ON "TrustedDevices"("UserID");
CREATE INDEX IF NOT EXISTS "IDX_TrustedDevices_DeviceIdentifier" ON "TrustedDevices"("DeviceIdentifier");
CREATE INDEX IF NOT EXISTS "IDX_TrustedDevices_IsTrusted" ON "TrustedDevices"("IsTrusted");

-- Add comment to table
COMMENT ON TABLE "TrustedDevices" IS 'Stores trusted browser instances for users. Users must verify with OTP when logging in from a new browser instance. Note: Browser-based, not device-based.';
