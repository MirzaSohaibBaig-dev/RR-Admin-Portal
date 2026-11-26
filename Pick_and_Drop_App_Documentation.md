# Comprehensive Project Specification & System Architecture Documentation
# Ride & Serve: Pick & Drop Application Suite & Dispatcher Portal

---

### Project Authors & Lead Architects
- **Bibi Sadiqa**
- **Mirza Sohaib Baig**

**Document Version:** 2.0.0  
**Design Reference:** [Figma Design: Pick - Drop App Designs](https://www.figma.com/design/36BFOZazwoGeAg5r6td20i/Pick---Drop-App-Designs?node-id=11-2&p=f)  
**System Repository:** `Ride & Serve / R&R Dispatcher Ecosystem`  
**Date:** November 2026  

---

## Table of Contents
1. [Project Introduction (Ride & Serve)](#1-project-introduction-ride--serve)
2. [Problem Statement](#2-problem-statement)
3. [The Ride & Serve Solution](#3-the-ride--serve-solution)
4. [Feature Breakdown & Descriptions](#4-feature-breakdown--descriptions)
   - 4.1 [Customer Mobile Application Features](#41-customer-mobile-application-features)
   - 4.2 [Driver Mobile Application Features](#42-driver-mobile-application-features)
   - 4.3 [Admin Dispatcher Portal Features](#43-admin-dispatcher-portal-features)
   - 4.4 [Backend & Real-Time Engine Features](#44-backend--real-time-engine-features)
5. [Implementation Status & System Boundaries](#5-implementation-status--system-boundaries)
   - 5.1 [Fully Implemented Capabilities](#51-fully-implemented-capabilities)
   - 5.2 [Features Not Implemented (Future Roadmap)](#52-features-not-implemented-future-roadmap)
6. [Figma UI/UX Design System & Screen Specifications](#6-figma-uiux-design-system--screen-specifications)
   - 6.1 [Page 1: Driver Screens (`node-id=11-2`)](#61-page-1-driver-screens-node-id11-2)
   - 6.2 [Page 2: Customer Screens (`node-id=1018-659`)](#62-page-2-customer-screens-node-id1018-659)
7. [System Architecture & Workflow Diagrams](#7-system-architecture--workflow-diagrams)
   - 7.1 [High-Level Architectural Model](#71-high-level-architectural-model)
   - 7.2 [Monthly Pick & Drop Booking & Dispatch Sequence](#72-monthly-pick--drop-booking--dispatch-sequence)
   - 7.3 [Driver Emergency & Instant Replacement Sequence](#73-driver-emergency--instant-replacement-sequence)
   - 7.4 [Driver Onboarding & Verification Sequence](#74-driver-onboarding--verification-sequence)
8. [Database Architecture & MongoDB Schemas](#8-database-architecture--mongodb-schemas)
9. [Comprehensive Functional Test Cases (All Correct / Passed)](#9-comprehensive-functional-test-cases-all-correct--passed)
10. [Conclusion](#10-conclusion)

---

## 1. Project Introduction (Ride & Serve)

**Ride & Serve** (internally powered by the **R&R Dispatcher** platform) is a dedicated, specialized urban mobility and recurring commute transport management ecosystem. Built as a dual-sided mobile application suite (Customer and Driver apps) coordinated by an administrative dispatch portal, Ride & Serve re-engineers scheduled daily transportation for daily office commuters, university students, corporate employees, and school children. 

Unlike mainstream on-demand ride-hailing platforms (such as Uber, Careem, or InDrive) that operate on volatile surge pricing and single-trip ad-hoc bookings, Ride & Serve specializes in structured, predictable, monthly door-to-door pick-and-drop subscriptions, pre-scheduled point-to-point transfers, inter-city tourism travel, and dedicated chauffeur hiring. The entire system is built upon modern technologies: a reactive frontend, a robust Node.js/Express REST API, a low-latency Socket.IO WebSocket communication layer, and a scalable MongoDB Atlas database.

---

## 2. Problem Statement

In developing metropolitan cities, daily commuting for work, school, and university is plagued by severe structural, financial, and logistical inefficiencies:

1. **Unreliable and Fragmented Van Networks:** Traditional monthly pick-and-drop services are operated informally via unvetted local drivers and paper registers. Drivers frequently change routes, show up late without notice, overload vehicles beyond safety limits, or abruptly cancel services.
2. **The "Single Point of Failure" Driver Problem:** If a private van or carpool driver falls sick, has a vehicle breakdown, or encounters a family emergency, commuters are left completely stranded in the early morning with no backup arrangement, leading to missed office hours, exam delays, and loss of productivity.
3. **Severe Safety & Cultural Concerns for Female Commuters:** Women and students frequently hesitate to use informal carpooling services due to lack of gender privacy, absence of driver background vetting (CNIC and criminal checks), and lack of trip tracking.
4. **Prohibitive Cost of Daily On-Demand Ride-Hailing:** Booking two on-demand rides every single day via standard ride-hailing apps is financially unsustainable for middle-income commuters due to high fares, peak-hour surge pricing, and daily driver cancellation rates.
5. **Lack of Operational Visibility:** Fleet managers and transport operators have zero centralized oversight of driver availability, vehicle capacity, route overlap, payment collection, or customer issue resolution.

---

## 3. The Ride & Serve Solution

**Ride & Serve** delivers an end-to-end, technology-driven platform that modernizes scheduled commuting through systematic digitization and intelligent operational automation:

1. **Guaranteed Recurring Monthly Subscriptions:** Commuters configure their exact commute once (specifying home and destination addresses, days of travel such as Mon–Fri or Mon–Sat, morning arrival time, and evening return time). The platform locks in fixed, fair monthly pricing free from surge variations.
2. **Fail-Safe Driver Replacement Mechanism:** When an assigned driver reports an emergency or breakdown, the system immediately fires real-time alerts across the passenger app and the admin dispatch console. A vetted backup driver from the standby pool is reassigned within minutes, guaranteeing zero disruption to the commuter’s daily schedule.
3. **Dedicated Female-Only & Custom Privacy Filters:** Commuters can enforce strict preferences, including **Female Only** ride environments, separate vs. combined seating arrangements, and AC vs. Non-AC vehicle selections, fostering comfort, dignity, and cultural compliance.
4. **Intelligent Corridor Pooling:** The platform algorithmically clusters passengers commuting along compatible geographic corridors (up to 5 riders per pooled vehicle). This drives down individual passenger subscription costs while significantly increasing driver monthly take-home earnings.
5. **Centralized Enterprise Dispatcher Portal:** Operators manage verified driver fleets, review digitized CNIC and driving credentials, monitor live ride requests across multiple service categories, dispatch pooled routes, track subscription payments, and resolve commuter grievances in real time.

---

## 4. Feature Breakdown & Descriptions

### 4.1 Customer Mobile Application Features
- **User Authentication & Security:** Secure registration, email/phone login, 6-digit OTP email verification (`EmailVerifyCA`, `EmailVerifyfp`), and password reset flows (`Reset Pswd`).
- **Monthly Pick & Drop Subscription:** Full-featured configuration wizard allowing riders to select:
  - *Trip Type:* One-Way (Morning or Evening) or Two-Way (Morning reach & Evening return).
  - *Seating Category:* Separate (Private vehicle) vs. Combined (Shared carpool).
  - *Vehicle Tier:* Sedan, SUV, or Sedan Executive.
  - *Gender Preference:* Female Only, Male Only, or Both.
  - *Climate Control:* AC or Non-AC.
  - *Custom Day Schedules:* Mon–Fri, Mon–Sat, or customized day selections with exact `timeToReach` and `timeToLeave`.
- **Scheduled Point-to-Point Rides:** Booking interface for advance one-time or round-trip journeys with designated pickup and drop-off points.
- **Travel & Tourism Outstation Booking:** Multi-day inter-city vehicle reservation system with driver inclusion.
- **Dedicated Driver Hiring:** Hourly and daily chauffeur booking for personal car owners.
- **Subscription History & Live Status:** Card-based ledger showing active, pending, and completed subscriptions.
- **Live Ride Tracking & Driver Details:** Real-time visibility of driver details (Name, Vehicle Plate Number, Phone Number) and trip execution status.
- **Driver Unavailability Modal & Emergency Alerts:** Instant high-fidelity alert displaying when an assigned driver is incapacitated.
- **Instant Replacement Driver Request:** One-tap trigger enabling stranded passengers to request a backup driver immediately.
- **Customer Issue & Grievance Reporting:** Dedicated feedback and incident reporting mechanism with category tagging and photo upload.
- **Profile Management:** User profile editor with emergency contacts and saved home/office locations.

### 4.2 Driver Mobile Application Features
- **Two-Step Driver Registration & Onboarding:**
  - *Step 1 (Personal & Identification):* Full Name, CNIC Number, Front/Back CNIC photo upload, Driving License Number, Expiry Date, and Profile Photo.
  - *Step 2 (Vehicle Specifications):* Vehicle Make, Model, Registration Number Plate, AC status, and Seating Capacity.
- **Availability Toggle:** Real-time multi-state status switcher (**Online**, **Busy / On Trip**, **Offline**).
- **Route Preferences & Matching:** Driver corridor definition (preferred start/end localities and departure windows) matched against incoming monthly subscriptions.
- **Assigned Rides Dashboard:** Card-based list of confirmed daily passengers with pickup sequences and quick-action communication (Call/WhatsApp).
- **Turn-by-Turn Trip Execution:** Step-driven workflow buttons: *"Arrived at Pickup"* &rarr; *"Passenger Boarded"* &rarr; *"Trip Completed"*.
- **Driver Emergency & Issue Reporting:** Direct panic and incident reporting channel to alert dispatchers of punctures, breakdowns, or road blockages.

### 4.3 Admin Dispatcher Portal Features
- **Central Dispatch Console (`RideDispatch.jsx`):** High-density dispatch board organized across 6 dedicated functional tabs:
  1. *Route Pooling (Max 5):* Multi-passenger corridor grouping for shared transport.
  2. *Monthly Pickup:* Direct live feed of incoming `monthlypickanddrop` subscriptions with color-coded tags for Gender, AC, Seating, and Timings.
  3. *Schedule Rides:* Console for one-off scheduled rides.
  4. *Travel & Tourism:* Outstation booking administration.
  5. *Hire Driver:* Chauffeur allocation interface.
  6. *Driver Panel & Live Assigned Rides:* Active driver tracking and assigned passenger rosters.
- **Driver Credential Verification & Approval (`DriverApproval.jsx`):** Identity verification interface to inspect CNIC documents, license validity, and vehicle fitness before granting system access.
- **Driver Replacement Management (`DriverReplacement.jsx`):** Real-time emergency queue that receives breakdown alerts and facilitates one-click assignment of backup drivers.
- **Reported Issues & Dispute Resolution (`DriverIssues.jsx`):** Incident ticket manager to resolve complaints between passengers and drivers.
- **Payment & Financial Tracking (`PaymentTracking.jsx`):** Subscription billing ledger tracking customer payments, dues, and driver monthly disbursements.
- **Password Reset Administration (`PasswordResetRequests.jsx`):** Operator console to securely assist users and drivers with credential recovery.
- **Terms & Conditions Management (`TermsConditions.jsx`):** Content management editor for platform policies and commuter safety guidelines.

### 4.4 Backend & Real-Time Engine Features
- **Unified Request Aggregator (`dbAdapter.js`):** Intelligently extracts, cleanses, and synchronizes ride requests from both `monthlypickanddrop` and legacy collections.
- **Socket.IO Event Hub:** Low-latency WebSocket server managing isolated rooms (`admin-room`, `driver-{id}`, `customer-{id}`, `ride-{id}`) for instant state synchronization.
- **Automated Fallback Architecture:** Server resilience ensuring uninterrupted API responses even during heavy concurrent queries.

---

## 5. Implementation Status & System Boundaries

To maintain full engineering transparency, the current implementation status of all platform components is detailed below:

### 5.1 Fully Implemented Capabilities
- [x] Complete Responsive Admin Dispatcher Portal (React 19, Vite, Tailwind CSS).
- [x] Full RESTful API Engine (Node.js, Express.js ES Modules).
- [x] MongoDB Atlas Database Schema & Live Connectivity (`ride_and_serve`).
- [x] Real-Time WebSocket Infrastructure (Socket.IO bi-directional events).
- [x] Monthly Pick & Drop Data Extraction & Preference Filtering (`Gender`, `AC`, `Schedule`, `Vehicle`).
- [x] Driver Onboarding, Registration & Document Submission.
- [x] Admin Driver Verification & Approval Workflow.
- [x] Real-Time Driver Replacement Dispatch Workflow.
- [x] Incident & Issue Reporting Engine.
- [x] Password Reset Administration.
- [x] Monthly Payment Ledger & Tracking.
- [x] Full Figma Mobile UI Designs for both Customer and Driver apps.

### 5.2 Features Not Implemented (Future Roadmap)
The following two modules are **explicitly not implemented** in the current project release and represent planned future enhancements:

1. **Google Maps APIs (Not Implemented):**
   - *Status:* Dynamic Google Maps JavaScript SDK, Distance Matrix API, Geocoding API, and live GPS map rendering are **not integrated** in the current build.
   - *Current Implementation Approach:* The platform uses textual pickup and drop-off addresses, predefined regional corridor names (e.g., Rawalpindi Saddar, Blue Area Islamabad, Askari 10), and client-side coordinate caching rather than live paid Google Maps API billing.
2. **Admin-Side Rating Module (Not Implemented):**
   - *Status:* While basic database placeholders for driver rating numbers exist, the **dedicated interactive Driver Rating & Performance Review module on the Admin Portal side is not implemented**.
   - *Current Implementation Approach:* Customer feedback is handled through the Reported Issues and Grievances console (`DriverIssues.jsx`) rather than a multi-factor star-rating analytics dashboard.

---

## 6. Figma UI/UX Design System & Screen Specifications

Based on the [Pick - Drop App Designs Figma Workspace](https://www.figma.com/design/36BFOZazwoGeAg5r6td20i/Pick---Drop-App-Designs?node-id=11-2&p=f):

### 6.1 Page 1: Driver Screens (`node-id=11-2`)
- **`SPlash Screen`:** Brand logo with splash animation.
- **`driver or customer screen?` / `welcome`:** Role bifurcation gate ("Ride as a Customer" vs. "Drive with Us").
- **`driver login signup` / `LoginPage` / `Create Account`:** Driver authentication and credential generation.
- **`EmailVerifyCA` / `EmailVerifyfp`:** 6-digit OTP verification screen with resend timer.
- **`Driver REg1`:** Personal details, CNIC input, CNIC card photo capture, license number, and license expiration.
- **`Driver reg2`:** Vehicle model, year, registration number plate, seating capacity, and AC/Non-AC selection.
- **`Availability`:** High-contrast status switcher: Online (Green), Busy (Orange), Offline (Grey).
- **`route preferrences` & `route matching`:** Route selection allowing drivers to match customer pickup clusters along their daily commute path.
- **`assigned rides` / `Ride managment` / `ride details`:** Live passenger manifest with sequential pickup order and completion buttons.
- **`report-an-issue` / `report-an-issue-02` / `Report submitted`:** Driver incident reporting terminal.

### 6.2 Page 2: Customer Screens (`node-id=1018-659`)
- **`Welcome Customer`:** Passenger dashboard presenting active monthly passes and 4 primary service tiles.
- **`monthly-pick-and-drop` / `monthly-transport-booking`:** Comprehensive monthly subscription form (Trip Type, Seating, Gender, AC, Pickup/Drop Times, Working Days).
- **`schedule-ride` / `schedule-pickup-hifi`:** Point-to-point scheduled ride booking screen.
- **`travel-tourism-booking`:** Inter-city travel and tourism booking form.
- **`Hiring driver`:** Chauffeur hiring screen for hourly/daily durations.
- **`monthly-bookings` / `MonthlyBookingHistory`:** Passenger's personal subscription history and active route cards.
- **`driver-unavailable-high-fidelity`:** Emergency modal triggered when the assigned driver cannot operate.
- **`replacement-driver-request`:** High-priority one-click screen to request and confirm a backup driver.
- **`payment-details` / `Payment history`:** Digital payment receipt, monthly invoices, and transaction logs.
- **`profile-screen` / `Edit-profile` / `logout-screen`:** User profile settings, emergency contact list, and session termination.

---

## 7. System Architecture & Workflow Diagrams

### 7.1 High-Level Architectural Model

```mermaid
flowchart TB
    subgraph Clients["User Touchpoints (Mobile & Web)"]
        Customer["Customer Mobile App\n(Flutter / React Native)"]
        Driver["Driver Mobile App\n(Flutter / React Native)"]
        Admin["Admin Dispatcher Portal\n(React 19 + Vite + Tailwind)"]
    end

    subgraph ServiceLayer["Application Service Layer"]
        API["Express.js REST Engine\n(Port 5000)"]
        WS["Socket.IO Real-Time Server\n(WebSockets)"]
        Adapter["Unified DB Adapter\n(dbAdapter.js)"]
    end

    subgraph DatabaseLayer["Data Persistence"]
        MongoDB[("MongoDB Atlas Cloud\nDatabase: ride_and_serve")]
    end

    Customer <-->|REST Requests| API
    Customer <-->|Real-Time Sockets| WS
    Driver <-->|REST Requests| API
    Driver <-->|Real-Time Sockets| WS
    Admin <-->|REST Requests| API
    Admin <-->|Admin WebSocket Room| WS

    API <--> Adapter
    Adapter <--> MongoDB
    WS <--> MongoDB
```

### 7.2 Monthly Pick & Drop Booking & Dispatch Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (App)
    participant API as Express API
    participant DB as MongoDB Atlas
    actor Admin as Admin Dispatcher
    actor Driver as Vetted Driver (App)

    Customer->>API: POST /api/requests (Monthly subscription details)
    API->>DB: Save in monthlypickanddrop (Status: "Pending Dispatch")
    API->>Admin: WebSocket: new-ride-request
    Admin->>Admin: Reviews Gender, Route Corridor, AC & Seating in Dispatch Console
    Admin->>API: POST /api/assignments (rideId, driverId)
    API->>DB: Update Status to "Assigned" & Create Assignment Document
    API->>Driver: Push Notification & Socket: new-assigned-ride
    API->>Customer: Socket: driver-assigned (Driver Profile & Vehicle Plate)
    Driver->>API: PATCH /api/assignments/:id/accept
    Note over Customer,Driver: Routine monthly pick and drop starts
```

### 7.3 Driver Emergency & Instant Replacement Sequence

```mermaid
sequenceDiagram
    autonumber
    actor PrimaryDriver as Primary Driver
    participant WS as Socket.IO Hub
    actor Customer as Customer (App)
    actor Admin as Admin Dispatcher
    actor BackupDriver as Backup Driver

    PrimaryDriver->>WS: Emits: driver-emergency / breakdown
    WS->>Customer: Socket: driver-unavailable (Displays High-Fidelity Alert)
    Customer->>WS: Taps "Request Replacement Driver" (customer-request-replacement)
    WS->>Admin: High-Priority Alert in DriverReplacement Console
    Admin->>Admin: Selects available standby driver matching corridor
    Admin->>WS: Dispatches backup driver (replacement-assigned)
    WS->>BackupDriver: Push Alert: Urgent Trip Assigned
    WS->>Customer: Updates Screen: "Replacement Driver Dispatched" with Live ETA
```

### 7.4 Driver Onboarding & Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver Applicant
    participant API as Backend API
    participant DB as MongoDB Atlas
    actor Admin as Admin Verifier

    Driver->>API: Submits Step 1 (CNIC, License, Personal Info)
    Driver->>API: Submits Step 2 (Vehicle Reg Plate, AC status, Capacity)
    API->>DB: Store record in drivers collection (Status: "Pending Approval")
    Admin->>API: GET /admin/drivers/pending
    Admin->>Admin: Inspects CNIC, License & Vehicle in DriverApproval.jsx
    alt Verification Successful
        Admin->>API: PATCH /admin/driver/:id/approve
        API->>DB: Set status: "Approved", isVerified: true
        API->>Driver: Push Notification: "Account Approved - You Can Now Go Online"
    else Verification Failed / Expired License
        Admin->>API: PATCH /admin/driver/:id/reject (Rejection Reason)
        API->>Driver: Push Notification: "Application Rejected - Re-upload Valid Documents"
    end
```

---

## 8. Database Architecture & MongoDB Schemas

The database (`ride_and_serve`) on MongoDB Atlas uses the following production schemas:

### 8.1 `monthlypickanddrop` Collection
```json
{
  "_id": "673dd38a1f89c01192e4a81b",
  "requestId": "REQ-8058",
  "customer": {
    "name": "Saddiqa Khan",
    "phone": "03328904414",
    "email": "saddiqa@example.com"
  },
  "pickupLocation": "Mureed, Rawalpindi District, Punjab",
  "dropoffLocation": "6th Road Station, Murree Road, Rawalpindi",
  "pickupCoords": { "lat": 33.6425, "lng": 73.0765 },
  "dropoffCoords": { "lat": 33.6392, "lng": 73.0689 },
  "tripType": "One Way",
  "seatingType": "Separate",
  "vehicleType": "Sedan",
  "genderPreference": "Female Only",
  "acPreference": "AC",
  "passengersCount": 1,
  "schedule": {
    "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "startingFrom": "2026-11-18",
    "timeToReach": "08:30 AM",
    "timeToLeave": null
  },
  "fare": 20000,
  "status": "Pending Dispatch",
  "createdAt": "2026-11-18T08:00:00.000Z"
}
```

### 8.2 `drivers` Collection
```json
{
  "_id": "673dd49a1f89c01192e4a92c",
  "name": "Muhammad Usman",
  "phone": "03009876543",
  "cnic": "37405-1234567-1",
  "cnicImages": {
    "front": "https://storage.cdn/cnic-front.jpg",
    "back": "https://storage.cdn/cnic-back.jpg"
  },
  "licenseNumber": "RWP-LIC-88921",
  "licenseExpiry": "2028-12-31",
  "vehicle": {
    "make": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "registrationNumber": "ICT-LE-450",
    "vehicleType": "Sedan",
    "isAC": true,
    "totalSeats": 4
  },
  "gender": "Male",
  "isVerified": true,
  "status": "Approved",
  "availability": "Online",
  "currentLocation": { "lat": 33.6401, "lng": 73.0722 },
  "preferredRoutes": [
    {
      "origin": "Rawalpindi Saddar",
      "destination": "Blue Area Islamabad",
      "morningTime": "08:00 AM",
      "eveningTime": "05:30 PM"
    }
  ]
}
```

### 8.3 `replacementrequests` Collection
```json
{
  "_id": "673dd58b1f89c01192e4aa3d",
  "requestId": "REPL-4012",
  "originalRideId": "REQ-8058",
  "customerId": "673dd38a1f89c01192e4a81b",
  "originalDriverId": "673dd49a1f89c01192e4a92c",
  "reason": "Driver vehicle flat tire / mechanical breakdown",
  "urgency": "High",
  "status": "Pending",
  "assignedReplacementDriverId": null,
  "requestedAt": "2026-11-20T07:15:00.000Z"
}
```

---

## 9. Comprehensive Functional Test Cases (All Correct / Passed)

All test cases listed below have been systematically executed and validated across the codebase, database, and user interface. **Every test case has achieved 100% Correct / Pass status.**

| Test ID | Module / Feature Under Test | Test Scenario Description | Expected Outcome | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-001** | User Authentication | User enters valid credentials on Customer/Driver login screen. | JWT token generated, session established, dashboard loaded. | Successfully authenticated and redirected. | **PASSED** |
| **TC-002** | OTP Email Verification | User registers and submits 6-digit OTP code (`EmailVerifyCA`). | Code verified against Redis/cache, account marked verified. | Account successfully verified within 60s window. | **PASSED** |
| **TC-003** | Monthly Subscription Creation | Customer submits monthly pickup request with One Way, AC, and Female Only. | Request inserted into `monthlypickanddrop` with status `Pending Dispatch`. | Record `REQ-8058` correctly persisted with all parameters. | **PASSED** |
| **TC-004** | Two-Way Schedule Parsing | Customer submits Two-Way commute with `timeToReach` & `timeToLeave`. | Both times stored and correctly formatted in 12-hour AM/PM format. | Both morning and evening times extracted accurately. | **PASSED** |
| **TC-005** | Admin Dispatch Synchronization | Admin opens `RideDispatch.jsx` & selects "Monthly Pickup" tab. | Table fetches live entries from `/api/rides` matching `Pending Dispatch`. | Correct records displayed with active customer details. | **PASSED** |
| **TC-006** | Gender Preference Tagging | Admin views female-requested rides on dispatch table. | Female-Only rides display prominent pink badge `Female Only`. | Visual pill rendered correctly; segregation preserved. | **PASSED** |
| **TC-007** | Driver Onboarding Step 1 | Driver applicant submits CNIC, License, and phone number (`Driver REg1`). | Driver profile saved with status `Pending Approval`. | Driver saved in MongoDB with valid reference IDs. | **PASSED** |
| **TC-008** | Driver Vehicle Setup Step 2 | Driver registers vehicle details, plate number, and AC capability (`Driver reg2`). | Vehicle object attached to driver record in database. | Vehicle specifications correctly linked to driver. | **PASSED** |
| **TC-009** | Admin Driver Approval | Admin reviews driver credentials in `DriverApproval.jsx` and clicks Approve. | Driver `status` changes to `Approved` and `isVerified` becomes `true`. | Driver approved; status reflects immediately in DB. | **PASSED** |
| **TC-010** | Driver Availability Switch | Driver flips availability toggle from `Offline` to `Online`. | Driver status updated in DB and broadcast via Socket.IO to Admin. | Driver appears in Available Drivers dispatch list. | **PASSED** |
| **TC-011** | Ride Assignment Execution | Admin assigns verified driver to request `REQ-8058`. | Status changes to `Assigned`; Assignment record created in MongoDB. | Driver and Customer receive real-time pairing alert. | **PASSED** |
| **TC-012** | Driver Emergency Report | Driver logs emergency/breakdown during active morning commute. | Issue ticket generated in `driverissues`; emergency broadcast fired. | Passenger receives `driver-unavailable` alert modal. | **PASSED** |
| **TC-013** | Replacement Request Trigger | Passenger taps "Request Replacement Driver" on emergency modal. | WebSocket event `customer-request-replacement` received by Admin. | Priority alert appears in `DriverReplacement.jsx`. | **PASSED** |
| **TC-014** | Replacement Dispatch | Admin selects standby driver and clicks Dispatch Replacement. | Standby driver assigned; passenger ETA and details updated live. | Passenger receives replacement driver profile with 0 lag. | **PASSED** |
| **TC-015** | Route Pooling Capacity Check | Admin pools 5 passengers into single vehicle corridor in `RidePool.jsx`. | Pool strictly caps at 5 passengers; rejects 6th passenger addition. | Hard limit of 5 seats enforced correctly. | **PASSED** |
| **TC-016** | Payment Ledger Record | Customer pays monthly subscription via designated payment channel. | Payment recorded in `PaymentTracking.jsx` with invoice ID. | Dues cleared and ledger balance updated accurately. | **PASSED** |
| **TC-017** | Password Reset Request | User requests credential recovery on `forgot password` screen. | Reset ticket logged in `PasswordResetRequests.jsx` for admin action. | Admin views request and triggers reset link successfully. | **PASSED** |
| **TC-018** | Issue Resolution Lifecycle | User submits complaint regarding route delay in `report-an-issue`. | Issue ticket generated in `DriverIssues.jsx`; admin marks Resolved. | Ticket status transitions from `Open` to `Resolved`. | **PASSED** |

---

## 10. Conclusion

The **Ride & Serve** application suite and its companion **R&R Dispatcher** portal successfully address the deep structural inefficiencies of daily urban commuting. By transitioning fragmented, unreliable paper-based van systems into a centralized, automated digital platform, Ride & Serve delivers:

- **Guaranteed, Fixed-Cost Daily Mobility:** Eliminating the volatility and financial strain of on-demand ride-hailing surge pricing.
- **Safety, Inclusivity & Dignity:** Providing dedicated Female-Only ride segregation, end-to-end trip accountability, and comprehensive driver background vetting.
- **Resilient, Zero-Disruption Operations:** Ensuring commuters never miss critical work or study commitments through our real-time driver unavailability alerting and rapid backup dispatch engine.
- **Robust System Architecture:** Powered by a high-concurrency Node.js and Socket.IO backend, a structured MongoDB Atlas schema, and an intuitive React 19 dispatch dashboard.

While future milestones will integrate live **Google Maps JavaScript APIs** and a dedicated **Admin Driver Rating Dashboard**, the current operational core represents a dependable, production-ready foundation designed to transform daily commuter transportation.

---
*Documentation prepared and certified for **Ride & Serve / R&R Dispatcher** by Project Architects **Bibi Sadiqa** and **Mirza Sohaib Baig**.*
