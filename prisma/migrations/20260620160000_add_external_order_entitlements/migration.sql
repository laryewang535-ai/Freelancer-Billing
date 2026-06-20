CREATE TYPE "ExternalOrderProvider" AS ENUM ('GUMROAD', 'PATREON', 'BUY_ME_A_COFFEE', 'OTHER');
CREATE TYPE "ExternalOrderStatus" AS ENUM ('PENDING', 'ACTIVATED', 'RENEWED', 'CANCEL_AT_PERIOD_END', 'REFUNDED', 'REVOKED');
CREATE TYPE "ExternalOrderActionType" AS ENUM ('ACTIVATED', 'RENEWED', 'CANCEL_AT_PERIOD_END', 'REFUNDED', 'REVOKED');

CREATE TABLE "manual_entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_order_id" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "manual_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ExternalOrderProvider" NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "purchaser_email" TEXT,
    "product_name" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'PRO',
    "period_months" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "purchased_at" TIMESTAMP(3),
    "status" "ExternalOrderStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "notes" TEXT,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_order_actions" (
    "id" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "type" "ExternalOrderActionType" NOT NULL,
    "note" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_order_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manual_entitlements_user_id_key" ON "manual_entitlements"("user_id");
CREATE INDEX "manual_entitlements_status_current_period_end_idx" ON "manual_entitlements"("status", "current_period_end");
CREATE INDEX "manual_entitlements_source_order_id_idx" ON "manual_entitlements"("source_order_id");
CREATE UNIQUE INDEX "external_orders_provider_external_order_id_key" ON "external_orders"("provider", "external_order_id");
CREATE INDEX "external_orders_user_id_status_idx" ON "external_orders"("user_id", "status");
CREATE INDEX "external_orders_status_created_at_idx" ON "external_orders"("status", "created_at");
CREATE INDEX "external_order_actions_external_order_id_created_at_idx" ON "external_order_actions"("external_order_id", "created_at");

ALTER TABLE "manual_entitlements" ADD CONSTRAINT "manual_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_orders" ADD CONSTRAINT "external_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_order_actions" ADD CONSTRAINT "external_order_actions_external_order_id_fkey" FOREIGN KEY ("external_order_id") REFERENCES "external_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
