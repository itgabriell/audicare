# Realtime Synchronization System

This document outlines the architecture and implementation of the real-time sync system used in the Inbox/WhatsApp module.

## 1. Overview
The system ensures that the inbox state (conversations, messages, unread counts) remains synchronized with the server and external WhatsApp provider (Z-API) in real-time, while optimizing for performance and battery life.

## 2. Architecture
The core logic resides in the `useRealtimeSync` hook, which centralizes:
- **Polling**: Periodic fetching of data.
- **Realtime Subscriptions**: Listening to Supabase database changes.
- **Visibility Awareness**: Adapting polling frequency based on user activity.
- **Connection Health**: Monitoring network and API status.

## 3. Sync Strategy

### A. Polling
The system uses a dual-interval polling strategy:
- **Active Mode (5s)**: When the tab is visible and online. Ensures rapid updates for active users.
- **Background Mode (60s)**: When the tab is hidden/minimized. Reduces server load and client resource usage.
- **Offline Mode (Paused)**: Polling stops completely when the browser detects no network connection.

### B. Supabase Realtime
We subscribe to the following Postgres changes via Supabase Realtime:
- `public:conversations` (UPDATE): Triggers a list refresh when unread counts or last messages change.
- `public:messages` (INSERT): Triggers a sync when a new message is inserted into the database.

### C. Conflict Resolution & Optimization
- **AbortController**: Before starting a new sync, any pending sync request is aborted to prevent race conditions and overlapping calls.
- **Smart Refetch**: The active conversation's messages are only re-fetched if a global sync indicates a change, or if the user manually triggers it.

## 4. Hook API (`useRealtimeSync`)