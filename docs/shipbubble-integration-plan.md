# ShipBubble Integration Plan

This document outlines the strategy for integrating the ShipBubble API into the Qkly-server for automated logistics and fulfillment.

## 1. Overview
ShipBubble is a logistics aggregator that provides a unified interface to over 50 couriers. Since the official Node.js SDK is outdated, this integration will use a custom HTTP client built with NestJS `HttpService` or `axios`.

## 2. Core Services to Leverage

### A. Rates Engine (`/shipping/fetch_rates`)
*   **Purpose:** Calculate real-time shipping costs during checkout.
*   **Usage:** When a user provides their address, we fetch available delivery options and prices.
*   **Benefit:** Accurate shipping pricing for the end-user.

### B. Shipping Label Generation (`/shipping/labels`)
*   **Purpose:** Automate the creation of shipments and generation of waybills.
*   **Usage:** Triggered either automatically upon successful payment or manually by the merchant.
*   **Benefit:** Reduces manual data entry for merchants and speeds up fulfillment.

### C. Unified Tracking (`/shipping/track`)
*   **Purpose:** Provide real-time status updates for orders.
*   **Usage:** Integrated with webhooks to update the internal `OrderShipment` status.
*   **Benefit:** Improved customer experience with transparent tracking.

### D. Address Validation (`/addresses`)
*   **Purpose:** Convert user address strings into ShipBubble `address_code` identifiers.
*   **Usage:** Before fetching rates or creating shipments.
*   **Benefit:** Ensures delivery accuracy and compatibility with courier systems.

## 3. Technical Architecture

### ShipBubbleModule
A new module containing the service and configuration.

### ShipBubbleService
*   Handles all HTTP requests to `api.shipbubble.com/v1`.
*   Manages API key authentication (Sandbox vs. Live).
*   Methods: `fetchRates`, `createLabel`, `validateAddress`, `getTrackingInfo`.

### ShipBubbleController (Webhook Handler)
*   Exposes a public endpoint: `POST /webhooks/shipbubble`.
*   Implements signature verification using HMAC-SHA512.
*   Processes `shipment.status.changed` to update `OrderShipment` entities.

## 4. Workflows

### Checkout Flow
1.  User enters delivery address.
2.  Backend calls `ShipBubbleService.validateAddress` to get `address_code`.
3.  Backend calls `ShipBubbleService.fetchRates` with items and address codes.
4.  User selects a shipping service (service_code preserved in metadata).

### Fulfillment Flow (Post-Payment)
1.  Payment is confirmed (`SUCCESSFUL`).
2.  Backend retrieves `request_token` (from rates) and `service_code`.
3.  Backend calls `ShipBubbleService.createLabel` to generate the waybill.
4.  `OrderShipment` record is updated with `tracking_number` and `waybill_url`.

## 5. Security & Error Handling
*   **API Keys:** Stored in `.env` (live and sandbox).
*   **Webhook Verification:** `x-ship-signature` header must be validated against the raw body.
*   **Retries:** Implementation of a basic retry mechanism for failed label generations due to carrier downtime.
