# 🕵️ Comprehensive Filter System Documentation

**Version:** 1.0.0
**Scope:** Inbox Module (Conversations & Messages)

## 1. Overview
The filter system provides a powerful way to narrow down lists of conversations and messages using multiple criteria simultaneously. It is built on top of a reusable hook `useFilters` and provides a UI component `FilterPanel` for interaction.

## 2. Architecture

### `useFilters.js` Hook
The core logic resides here.
*   **State Management:** Manages the filter object state (status, dates, types, etc.).
*   **Persistence:** Automatically syncs filter state to `localStorage` so user preferences persist across reloads.
*   **Filtering Logic:** Contains the pure functions that evaluate items against active filters.
*   **Composition:** Filters are additive (AND logic). An item must satisfy ALL active filters to be included.

**Key Features:**
*   `dateRange`: Filters items within a start and end date.
*   `status`: Filters by read/unread/archived status.
*   `messageType`: Filters by content type (text, image, audio).
*   `sender`: Filters by who sent the message (me vs contact).

### `FilterPanel.jsx` Component
The UI layer for controlling filters.
*   **Quick Toggles:** One-click buttons for common filters like "Unread" or "Archived".
*   **Advanced Popover:** A dropdown containing detailed controls like date pickers and select inputs.
*   **Visual Feedback:** Shows a badge count of active filters.

## 3. Integration Guide

### Basic Usage