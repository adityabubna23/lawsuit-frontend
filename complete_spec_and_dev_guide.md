# Lawsuit — Frontend Functional Specification & Automated Development Guide

> **Purpose:** This document is written and refined to be used as a **direct instruction set** for AI code-generation tools (Cursor / Claude / Copilot) to **auto-generate a full React + TypeScript frontend** for the *Lawsuit* application with **>99% expected accuracy**. It contains explicit folder structures, component contracts, prop types, mock APIs, state management patterns (Zustand), Tailwind/Tokens, testing hooks (TestSprite), example prompts formatted for Cursor/Claude, and step-by-step generation plan.

---

## Table of Contents

1. Project overview
2. Non-functional requirements
3. User roles & permissions (detailed)
4. High-level application flow & UX paths
5. Pages, routes, and screen-level specs
6. Component library & atomic breakdown (including prop definitions)
7. State management (Zustand) plan and store contracts
8. Mock API contract (OpenAPI-style minimal) and example responses
9. Integration contracts: Chat, Video call, Payment
10. Folder & file structure (exact paths)
11. Tooling, scripts, and commands (for Cursor/Claude to run)
12. Styling system & Tailwind config (tokens & components)
13. Accessibility and responsiveness instructions
14. Testing strategy with TestSprite (component level tests)
15. Prompt templates and exact prompts for Cursor/Claude
16. Step-by-step automated generation plan (ordered tasks)
17. Hints for reducing generation errors and edge-case behaviors
18. Appendix: Example JSON fixtures, sample data, and test cases

---

## 1. Project overview

**Name:** Lawsuit

**Short description:** A web application for clients to find, consult, and manage lawyers and legal cases. The frontend will allow clients to search and filter lawyers, book paid virtual consultations, upload/download case documents, track hearing timelines, chat with lawyers, leave ratings, and access educational content. Lawyers can manage appointments, update case timelines and documents, and communicate with clients. Admins manage templates, filters, and pricing.

**Primary focus for this phase:** Frontend only — production-ready, modular, and ready to connect to a backend later.

**Tech stack:** React + TypeScript, TailwindCSS, Zustand (state), Vite (preferred bundler), React Router (v6), TestSprite for tests, ESLint, Prettier, Husky (optional), Playwright for e2e (optional later)

## 2. Non-functional requirements

* **Performance:** Initial page load under 1.5s on 3G simulated network (optimize with code-splitting and lazy load). Keep bundle modular.
* **Security:** Never persist secrets in frontend. Inputs validated and sanitized. Prepare to integrate real authentication (JWT/OAuth) later.
* **Localization:** All text stored in a single `i18n` JSON file (English only for v1). Use keys everywhere.
* **Accessibility:** All interactive elements keyboard-focusable, semantic HTML, aria-labels on non-text buttons.
* **Responsiveness:** Mobile-first breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). Layout must adapt for phones/tablets/desktops.

## 3. User roles & permissions (detailed)

Define `Role = 'client' | 'lawyer' | 'admin'`.

**Client**

* Can register/login, OTP verify
* Search / filter lawyers by location, specialties, experience, fees, languages, ratings
* Book paid virtual consultations (time/date picker + payment) — generate appointment
* Upload / download case documents (PDF, DOCX, images) up to defined size
* Create tasks for lawyer and track task status
* Chat with lawyer (one-to-one private chat tied to appointment or case)
* View case timelines, hearing updates
* Rate and provide feedback only for lawyers they consulted
* Contact customer care and report issues

**Lawyer**

* Register/login with document verification flow (documents will be uploaded and stored by backend)
* View appointments booked, accept/reschedule/cancel
* Receive push notifications via browser push (placeholder)
* Manage cases (create/update case metadata, timelines, hearings)
* Upload case documents and request documents from clients
* Chat with clients associated with their cases
* Edit profile (fees, availability, specialization, languages)

**Admin**

* CRUD operations for agreement templates
* Add/delete filter values (e.g., case categories)
* Set consultation fees by case category
* View reported issues

## 4. High-level application flow & UX paths

**Client path:**

1. Landing -> Signup/Login
2. OTP verification -> Home/Dashboard
3. Search lawyer -> View profile -> Book consultation -> Time slot -> Payment -> Appointment shown in Appointments tab -> at appointment time, meeting link appears / notification -> start call
4. Create / View Cases -> Upload Docs -> Track Timeline -> Raise tasks -> Chat with lawyer

**Lawyer path:**

1. Landing -> Signup/Login -> Document verification -> Dashboard
2. View appointments -> Accept/Reschedule -> At appointment time join call from app
3. Manage cases -> Add hearing notes & documents -> Communicate with client via chat

**Admin path:**

1. Admin dashboard -> Manage templates & filters -> Manage pricing -> View reported issues

## 5. Pages, routes, and screen-level specs

Use React Router with nested routes. Provide exact route paths.

```
/                    -> LandingPage
/auth/login           -> LoginPage
/auth/register        -> RegisterPage
/auth/otp-verify      -> OtpVerifyPage
/app                  -> AppLayout (protected)
/app/home             -> HomePage (dashboard)
/app/search           -> SearchPage (lawyers)
/app/lawyer/:id       -> LawyerDetailPage
/app/book/:lawyerId   -> BookingPage
/app/appointments     -> AppointmentsPage
/app/cases            -> CasesListPage
/app/case/:caseId     -> CaseDetailPage
/app/chat/:chatId     -> ChatPage
/app/profile          -> ProfilePage
/admin                -> AdminLayout
/admin/templates      -> TemplatesPage
```

**Each page must have a clear title, breadcrumb, and primary action.**

### Important screens details (short):

**LawyerDetailPage** — card with profile photo, specialization tags, experience years, languages, consultation fee, rating, available time slots, `Book Consultation` action, reviews section, `Contact` button.

**BookingPage** — Calendar-style date picker (date + available slots per day), select slot, review price, promo code field (placeholder), proceed to payment button, show refund/cancellation policy modal.

**AppointmentsPage** — list grouped by upcoming/past. Each appointment card shows status, date/time, join button (when within X minutes), reschedule/cancel actions for lawyers.

**CaseDetailPage** — header with case title & status, timeline component (vertical), documents section with upload/download and versioning, tasks list, hearings list, `Add hearing` modal for lawyers.

**ChatPage** — message list, message input with attachments (docs/images), typing indicator, message read receipts (placeholder), attach case reference.

## 6. Component library & atomic breakdown (including prop definitions)

Use atomic design. For each component include exact TS interface, default props, and expected behavior. Cursor must generate files exactly as named.

> **Naming convention:** PascalCase for React components. Files: `ComponentName.tsx` + `ComponentName.module.css` if needed (but we use Tailwind). Tests: `ComponentName.test.tsx`.

### Core atoms

* `Button` — `props: { children: ReactNode; variant?: 'primary'|'secondary'|'ghost'; size?: 'sm'|'md'|'lg'; onClick?: ()=>void; disabled?: boolean; type?: 'button'|'submit' }`
* `Input` — `props: { value: string; onChange: (v:string)=>void; placeholder?: string; name?: string; type?: string; error?: string }`
* `Icon` — `props: { name: string; size?: number; ariaLabel?: string }
* `Avatar` — `props: { src?: string; alt?: string; size?: 'sm'|'md'|'lg' }
* `Badge` — `props: { children: string }

### Molecules

* `SearchBar` — `props: { value:string; onSearch:(q:string)=>void; onChange:(q:string)=>void }`

* `LawyerCard` — `props: {
  id: string;
  name: string;
  specialization: string[];
  experienceYears: number;
  rating: number;
  fee: number;
  location: string;
  avatar?: string;
  onView: (id:string)=>void;
  }

* `DateTimePicker` — `props: { selected?: string; onSelect:(iso:string)=>void; availability: { [dateISO:string]: string[] } }

### Organisms / Screens components

* `LawyerList` — receives array of `LawyerCard` data and supports pagination and filters
* `BookingForm` — props: `{ lawyerId: string; onBooked: (appointment) => void }` — uses DateTimePicker, payment trigger
* `CaseTimeline` — props: `{ events: TimelineEvent[] }` where `TimelineEvent = { id:string; title:string; date:string; description?:string; type:'hearing'|'task'|'document' }`

### Layouts

* `AppLayout` — left nav, top header (profile + notifications), content area
* `AdminLayout` — admin sidebar and content area

## 7. State management (Zustand) plan and store contracts

Create multiple smaller stores. Each store file must export typed hooks.

**Store files and exact exports:**

* `stores/authStore.ts` -> `useAuthStore` (states: `user`, `token`, `isAuthenticated`, `role`, actions: `login`, `logout`, `setUser`, `verifyOtp`)
* `stores/lawyerStore.ts` -> `useLawyerStore` (states: `lawyers: Lawyer[]`, `filters`, `loading`, `error`, actions: `fetchLawyers(filters)`, `fetchLawyerById(id)`)
* `stores/appointmentStore.ts` -> `useAppointmentStore` (states: `appointments`, actions: `fetchAppointments()`, `bookAppointment(payload)`, `rescheduleAppointment()`)
* `stores/caseStore.ts` -> `useCaseStore` (states: `cases`, `currentCase`, actions: `createCase`, `updateCase`, `uploadDocument`)
* `stores/uiStore.ts` -> `useUiStore` (states: `isSidebarOpen`, `toasts[]`, `modalState`, actions: `openModal`, `closeModal`, `showToast`)

**Type definitions**: have a `types/` folder with `User`, `Lawyer`, `Appointment`, `Case`, `Document`, `ChatMessage` interfaces.

Example `User` interface (exact text to be generated):

```ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'lawyer' | 'admin';
  avatar?: string;
}
```

Make sure all stores persist `token` to `localStorage` and rehydrate on app load. Use a small util `storage.ts` with typed wrappers.

## 8. Mock API contract (OpenAPI-style minimal) and example responses

Cursor must generate a `src/api/mockServer.ts` that exports axios instance and mock handlers using `msw` (mock service worker) or simple fixtures if `msw` is not preferred. Provide endpoints exactly.

**Endpoints (frontend contract):**

* `POST /auth/login` -> body: `{ email, password }` -> returns `{ token, user }
* `POST /auth/register` -> body: `{ name, email, password, role }` -> returns `{ success: true }`
* `POST /auth/verify-otp` -> body `{ userId, otp }` -> returns `{ token, user }`
* `GET /lawyers` -> query params: `?q=&location=&specialization=&page=&limit=` -> returns `{ data: Lawyer[], total: number }
* `GET /lawyers/:id` -> returns `{ data: Lawyer }`
* `POST /appointments` -> body: `{ lawyerId, userId, datetime, paymentId }` -> returns appointment
* `GET /appointments` -> returns `{ data: Appointment[] }
* `GET /cases` -> returns user's cases
* `POST /cases/:caseId/documents` -> form-data upload -> returns document meta
* `GET /chat/:chatId/messages` -> returns `ChatMessage[]`
* `POST /chat/:chatId/messages` -> body `{ text, attachments[], senderId }` -> returns message

**Example Lawyer object:**

```json
{
  "id": "lawyer_abc123",
  "name": "Adv. Priya Sharma",
  "specialization": ["Family Law", "Consumer Rights"],
  "experienceYears": 8,
  "rating": 4.6,
  "fee": 499,
  "location": "Kolkata, West Bengal",
  "languages": ["English","Hindi","Bengali"],
  "avatar": "https://.../priya.jpg"
}
```

### Mock server implementation notes (for Cursor)
- Implement `src/mocks/mockServer.ts` that exports `startMockServer()` to be called in `main.tsx` during development mode.
- Prefer `msw` for realistic network behavior; fallback to `axios-mock-adapter` if `msw` is not desirable.
- Ensure determinism: use predictable IDs (`lawyer_001`, `user_001`) and fixed date values in fixtures to make tests stable.
- Include error scenarios: 401 for unauthenticated, 422 for validation errors, 500 for server error; tests should mock these as needed.
  
**Make mock responses deterministic and include pagination metadata.**

## 9. Integration contracts: Chat, Video call, Payment

Provide specific integrations and minimal interface wrappers so Cursor can scaffold the integration without secrets.

### Chat — contract

* Create a `services/chatService.ts` with functions:

  * `fetchMessages(chatId: string): Promise<ChatMessage[]>`
  * `sendMessage(chatId: string, message: { text:string, attachments?: File[] }): Promise<ChatMessage>`
* Use WebSocket abstraction `services/socket.ts` with a `connectSocket(userId)` method and `on('message')` callback.

### Video call — contract

* For first pass use Jitsi Meet or Daily.co embed. Provide an abstraction `components/VideoCall/index.tsx` which accepts `roomId`, `userRole`, `onLeave` props and loads an iframe sdk. Cursor must create a stub that can be configured later.

**VideoCallProps**:

```ts
export interface VideoCallProps {
  roomId: string;
  userId: string;
  displayName?: string;
  onLeave?: () => void;
}
```

* Provide a `createMeeting(roomId)` util that returns meeting link. Payment flow must mark appointment as `paid` before enabling meeting link.

### Payment — contract

* Provide `services/paymentService.ts` with two adapters: `RazorpayAdapter` and `StripeAdapter` exposing `createCheckout({amount, currency, metadata})` which returns a `{ checkoutUrl?: string, razorpayOptions?: object }`.
* For Razorpay front-end flow: integrate `https://checkout.razorpay.com/v1/checkout.js` script loader from CDN. Provide clear placeholder keys in `.env` (`VITE_RAZORPAY_KEY`, `VITE_STRIPE_KEY`).
* Cursor should generate code that uses `window.Razorpay` when available and falls back to `mockPaymentSuccess()` during dev.

## 10. Folder & file structure (exact paths)

Copy this exact structure (Cursor must produce these files):

```
lawsuit-frontend/
├─ public/
│  └─ index.html
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ routes.tsx
│  ├─ types/
│  │  ├─ index.ts
│  ├─ pages/
│  │  ├─ LandingPage.tsx
│  │  ├─ auth/
│  │  │  ├─ LoginPage.tsx
│  │  │  ├─ RegisterPage.tsx
│  │  │  └─ OtpVerifyPage.tsx
│  │  ├─ app/
│  │  │  ├─ HomePage.tsx
│  │  │  ├─ SearchPage.tsx
│  │  │  ├─ LawyerDetailPage.tsx
│  │  │  ├─ BookingPage.tsx
│  │  │  ├─ AppointmentsPage.tsx
│  │  │  ├─ CasesListPage.tsx
│  │  │  └─ CaseDetailPage.tsx
│  │  └─ admin/
│  │     └─ TemplatesPage.tsx
│  ├─ components/
│  │  ├─ atoms/
│  │  │  └─ Button.tsx
│  │  ├─ molecules/
│  │  │  └─ LawyerCard.tsx
│  │  └─ organisms/
│  │     └─ BookingForm.tsx
│  ├─ stores/
│  │  ├─ authStore.ts
│  │  ├─ lawyerStore.ts
│  │  └─ appointmentStore.ts
│  ├─ services/
│  │  ├─ api.ts
│  │  ├─ chatService.ts
│  │  └─ paymentService.ts
│  ├─ utils/
│  │  ├─ date.ts
│  │  ├─ storage.ts
│  │  └─ validators.ts
│  ├─ mocks/
│  │  └─ mockServer.ts
│  └─ i18n/
│     └─ en.json
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ tailwind.config.cjs
└─ vite.config.ts
```

## 11. Tooling, scripts, and commands (for Cursor/Claude to run)

Provide exact `package.json` scripts that Cursor should produce:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint --ext .ts,.tsx src --max-warnings=0",
    "test": "testsprite run",
    "format": "prettier --write \"src/**/*.{ts,tsx,md,json}\""
  }
}
```

Also provide `commit` and `PR` templates (short), and Husky hooks for `pre-commit` to run `lint` and `format`.

---

### Additional Notes for Cursor
- Ensure the project uses `vite.config.ts` configured for React + Tailwind.
- During code generation, always place new React components under the right folder according to the structure (section 10).
- Cursor should automatically attach file headers:
  ```ts
  // Auto-generated by Cursor – Lawsuit Frontend
  // Developer note: Do not edit this file directly unless necessary.
  ```

---

## 12. Styling system & Tailwind config (tokens & components)

Define design tokens in `tailwind.config.cjs` and `src/styles/tokens.ts`.

* Primary color: `#0B4D64` (law-firm teal)
* Accent: `#F59E0B` (warm gold)
* Neutral: standard gray scale
* Border radius: `8px`

Provide `components/ui/Button.tsx` using Tailwind classes and variants matching `Button` atom props.

## 13. Accessibility and responsiveness instructions

* All images must have `alt` attributes.
* Buttons that open modals must set `aria-controls` and manage focus trap.
* Keyboard shortcuts: `Esc` closes modals; `Enter` submits focused form.
* Forms must have labels connected to inputs via `htmlFor`.
  
### Responsiveness Guidelines
- Use responsive Tailwind classes (`sm:`, `md:`, `lg:`).
- App layout should be fully responsive from 320px → 1440px.
- Navbar should collapse into a hamburger menu below 768px.
- Cards (lawyer list, appointments) should use a grid layout:
  - 1 column on mobile, 2 on tablets, 3–4 on desktop.
- Video call and chat panels should switch to stacked view on small screens.
- Ensure touch targets are ≥ 48x48px.
- Avoid horizontal scrolling except in intentionally scrollable areas.

## 14. Testing strategy with TestSprite

* Each atom and molecule should have a unit test that mounts the component and asserts the DOM.
* Important user flows to cover:

  1. Login + OTP verification flow (mock API)
  2. Search and filter lawyers (assert results)
  3. Booking flow up to payment trigger (mock payment)
  4. Upload document component file validations
  5. Chat send/receive flow (mock socket)

**Test command:** `npm run test` runs TestSprite in headless mode.

Provide example test file for `LawyerCard.test.tsx` with snapshot and interaction assertions.

## 15. Prompt templates and exact prompts for Cursor/Claude

This section is critical. Use these exact prompts when instructing Cursor/Claude. Each prompt must include: file path to generate, exact exports and imports, TypeScript signatures, and the test file to create.

### Global prompt style (top of prompt)

```
You are a code generator. Generate a single TypeScript React file at PATH: `<insert path>` with the exact component name `<ComponentName>`. Use React 18, TypeScript, tailwind classes, and no external UI libs. Export the component as default. Also create a unit test at PATH: `<insert test path>` using TestSprite that imports the component and tests the main interactions listed below. Use only the types from src/types/index.ts. Do not create unrelated files. Keep the file under 250 lines.
```

### Example prompt for `Button` atom

```
Generate PATH: src/components/atoms/Button.tsx
ComponentName: Button
Props: { children: React.ReactNode; variant?: 'primary'|'secondary'|'ghost'; size?: 'sm'|'md'|'lg'; onClick?: ()=>void; disabled?: boolean; type?: 'button'|'submit' }
Behavior: apply tailwind classes for variant and size, forward ref, support disabled state, render as <button>.
Also generate test PATH: src/components/atoms/__tests__/Button.test.tsx. Test should render Button with each variant and assert classnames, and test onClick invoked when clicked.
```

Repeat similar precise prompts for `LawyerCard`, `DateTimePicker`, `BookingForm`, `CaseTimeline`, `ChatPage` and `VideoCall` (stub).

**Important:** Always instruct Cursor/Claude to import types from `src/types/index.ts` and stores from `src/stores/*`.

## 16. Step-by-step automated generation plan (ordered tasks)

This is the exact order Cursor/Claude must follow to avoid dependency errors:

1. Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, basic `tailwind.config.cjs` and `postcss.config.cjs`.
2. Create `src/types/index.ts` with all interfaces.
3. Create `src/main.tsx`, `src/App.tsx`, `src/routes.tsx` and `src/index.css` importing Tailwind directives.
4. Create `src/stores/*` (authStore first because other stores may depend on it).
5. Create `src/services/api.ts` and `src/mocks/mockServer.ts`.
6. Scaffold atoms (`Button`, `Input`, `Avatar`, `Icon`). Add tests.
7. Scaffold molecules (`SearchBar`, `LawyerCard`). Add tests.
8. Scaffold pages progressively: `LandingPage`, `LoginPage`, `RegisterPage`, `OtpVerifyPage`.
9. Scaffold `AppLayout` and protected routing wrappers.
10. Scaffold booking flow components `BookingForm`, `DateTimePicker` and `Payment` integration shim.
11. Scaffold `AppointmentsPage`, `CasesListPage`, `CaseDetailPage`, `ChatPage` and `VideoCall` component.
12. Add Tailwind tokens and `components/ui` small shared components.
13. Add i18n `en.json`.
14. Add tests for flows using TestSprite (auth, search, booking).
15. Run `npm run test` and `npm run dev`.

Cursor/Claude should create commits after each major step and provide a short commit message.

## 17. Hints for reducing generation errors and edge-case behaviors

* Always ensure imports are relative and exact paths match folder structure.
* Make components defensive: prop defaults and null-checks.
* Avoid complex custom hooks until core UI is scaffolded.
* For date/time use `date-fns` helper functions; if not available scaffold simple ISO checks in `utils/date.ts`.
* For payment flows provide a `DEV` mode using `mockPaymentSuccess()` and environment flags.
* Mock server should return predictable IDs (prefix like `lawyer_001`).

## 18. Appendix: Example JSON fixtures, sample data, and test cases

**Sample lawyer list (3 items)**

```json
[{
  "id":"lawyer_001",
  "name":"Adv. Priya Sharma",
  "specialization":["Family Law","Consumer Rights"],
  "experienceYears":8,
  "rating":4.6,
  "fee":499,
  "location":"Kolkata, WB",
  "languages":["English","Hindi","Bengali"],
  "avatar":"/images/priya.jpg"
},
{
  "id":"lawyer_002",
  "name":"Adv. Rohit Sen",
  "specialization":["Criminal Law"],
  "experienceYears":12,
  "rating":4.8,
  "fee":899,
  "location":"Kolkata, WB",
  "languages":["English","Hindi"]
}]
```

**Test cases (high priority)**

1. Login -> OTP verification -> redirect to `/app/home`
2. Search `Priya` -> assert `Adv. Priya Sharma` appears
3. Booking -> select slot -> `POST /appointments` called with `paymentId` and `status: paid`
4. Upload document -> GET `/cases/:caseId/documents` returns uploaded file metadata

---

### Final notes for Cursor/Claude consumption

* Use the Global prompt style and the exact file paths above.
* After generating each file, create the corresponding test and ensure `import` paths point to the created types and stores.
* Keep every file small and single responsibility.
* Use `VITE_` env variables for keys and placeholders.

---

End of document.

