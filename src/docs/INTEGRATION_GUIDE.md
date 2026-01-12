# 🔗 System Integration Guide

**Version:** 1.0.0
**Modules:** Inbox, Patients, Appointments

## 1. Overview
This document outlines the deep integration flows implemented between the Inbox (Messaging) module and the core clinical modules (Patients & Appointments). These integrations ensure a seamless workflow for clinicians and receptionists.

## 2. Data Linking Architecture

### 2.1 Contact-Patient Relationship
*   **Database:** The `contact_relationships` table links a `whatsapp_contact` (or `contact`) to a `patient` entity.
*   **Logic:**
    *   When a contact is created, the system checks if a patient with the same phone number exists.
    *   If found, they are automatically linked.
    *   Manual linking can be done via the "Associate Patient" dialog in Inbox.

## 3. Navigation Flows

### 3.1 Inbox -> Patient Profile
**Goal:** View full medical history while chatting.
*   **UI:** In the Inbox Right Panel, the "Paciente Vinculado" card appears if a link exists.
*   **Action:** Click "Ver Perfil".
*   **Route:** Navigates to `/patients/:id`.

### 3.2 Patient Profile -> Inbox
**Goal:** Quickly message a patient from their file.
*   **UI:** "Mensagem" button in Patient Details header.
*   **Action:** Click button.
*   **Route:** Navigates to `/inbox?phone=PATIENT_PHONE`.
*   **Behavior:** Inbox loads, finds/creates conversation for that phone, and selects it automatically.

### 3.3 Appointments -> Inbox
**Goal:** Confirm appointment or follow up.
*   **UI:** "Enviar Mensagem" text link inside the Appointment Dialog (next to patient name).
*   **Action:** Click link.
*   **Route:** Navigates to `/inbox?phone=PATIENT_PHONE`.

### 3.4 Inbox -> Appointments
**Goal:** Check upcoming schedule while chatting.
*   **UI:** "Próximos Agendamentos" card in Inbox Right Panel (`AppointmentIntegration.jsx`).
*   **Features:**
    *   Lists next 3 appointments.
    *   "Enviar Lembrete" button pastes a template text into the chat input.
    *   "Novo Agendamento" button links to `/appointments?patientId=...`.

## 4. Components

| Component | Role | Location |
| :--- | :--- | :--- |
| `AppointmentIntegration.jsx` | Shows future appointments & reminder shortcuts | Inbox > RightPanel |
| `PatientIntegration.jsx` | Shows patient summary & profile link | Inbox > RightPanel |
| `Breadcrumbs.jsx` | Provides navigation context | Patient Details / Care |

## 5. Search & Context
*   **Search:** The Inbox search (`useSearch.js`) filters conversations by name or phone.
*   **Context:** The `RightPanel` in Inbox acts as the "Conversation Context", aggregating CRM, Patient, and Appointment data for the active contact.

## 6. Testing Integrations
1.  **Profile Link:** Open a chat with a known patient. Verify "Paciente Vinculado" appears. Click "Ver Perfil".
2.  **Message Link:** Go to Patients. Click "Mensagem". Verify Inbox opens the correct chat.
3.  **Appointment View:** In Inbox, ensure upcoming appointments are listed in the right sidebar.