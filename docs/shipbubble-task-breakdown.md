# ShipBubble Integration - Task Breakdown

Detailed roadmap for the ShipBubble technical implementation.

## Phase 1: Foundation & Configuration
- [ ] **Environment Setup**
    - Add `SHIPBUBBLE_API_KEY` and `SHIPBUBBLE_WEBHOOK_SECRET` to `.env`.
    - Configure `SystemConfig` to toggle between Sandbox and Production.
- [ ] **Module Initialization**
    - Create `src/core/logistics/shipbubble.module.ts`.
    - Create `src/core/logistics/shipbubble.service.ts`.
    - Register module in `AppModule`.

## Phase 2: Core API Implementation
- [ ] **HTTP Client Development**
    - Implement base request handler with `axios` and Bearer auth.
    - Add standardized error logging for ShipBubble responses.
- [ ] **Address Management Service**
    - Implement `verifyAddress` method to get `address_code`.
    - Cache `address_code` in the `Address` entity to avoid redundant lookups.
- [ ] **Rates Fetching Service**
    - Implement `fetchRates` method (handles items parsing and address codes).
    - Map ShipBubble rates response to a Qkly-compatible DTO.

## Phase 3: Fulfillment Integration
- [ ] **Label Generation Service**
    - Implement `createLabel` using `request_token` and `service_code`.
    - Update `OrderShipment` entity with carrier details and waybill URLs.
- [ ] **Payment Flow Hook**
    - Add a subscriber to the `PaymentSuccess` event to trigger shipment creation (where applicable).

## Phase 4: Tracking & Webhooks
- [ ] **Webhook Controller**
    - Create `src/core/logistics/webhooks/shipbubble-webhook.controller.ts`.
    - Implement HMAC-SHA512 verification for `x-ship-signature`.
- [ ] **Status Mapping**
    - Map ShipBubble statuses (`pending`, `picked_up`, `delivered`, etc.) to Qkly's `OrderShipment` enum.
    - Implement status history logging for tracking updates.

## Phase 5: UI & UX (Optional)
- [ ] **Delivery Option Selector**
    - Update frontend checkout to display dynamic rates from ShipBubble.
    - Show estimated delivery dates per courier.
- [ ] **Waybill Preview**
    - Allow merchants to download waybill PDFs directly from the Order dashboard.
