# 🔍 Advanced Search System Documentation

**Version:** 1.0.0
**Scope:** Inbox Module (Conversations & Messages)

## 1. Overview
The advanced search system provides real-time filtering, full-text search highlighting, search history persistence, and keyboard navigation support. It is designed to work with both the conversation list (left panel) and message history (chat window).

## 2. Architecture

### `useSearch.js` Hook
A powerful, reusable React hook that encapsulates all search logic.

**Features:**
*   **Debouncing:** Prevents UI lag by delaying state updates by 300ms (configurable).
*   **History Management:** Automatically saves the last 10 distinct search terms to `localStorage`.
*   **Client-Side Filtering:** Efficiently filters arrays of objects based on multiple keys.
*   **Highlighting Helper:** Provides utility to split text into matched/unmatched segments for UI rendering.

**Usage:**