# Environment Configuration Guide

This document provides a comprehensive guide to correctly configuring the `VITE_API_BASE_URL` for the Audicare Clinic System, ensuring proper communication with the backend API in both development and production environments.

## 1. What is `VITE_API_BASE_URL` and Why It Matters?

`VITE_API_BASE_URL` is an environment variable used by Vite (our build tool) to define the base URL for all API requests made from the frontend application. It acts as the prefix for all your backend API endpoints.

**Why it matters:**
*   **Connectivity:** Without the correct base URL, your frontend application cannot locate and communicate with the backend services, leading to broken functionality and data retrieval issues.
*   **Environment Specificity:** It allows you to easily switch between different backend environments (e.g., local development server, staging server, production server) without modifying the application's source code.
*   **Maintainability:** Centralizing the API base URL in an environment variable makes the application easier to maintain and update.

## 2. Current Incorrect Value (`localhost`) and Why It Fails in Production

The current configuration might point `VITE_API_BASE_URL` to `http://localhost:3000` or a similar local address.

**Why this is incorrect for production:**
*   `localhost` refers to the user's own machine. When your application is deployed to a production server (e.g., `audicarefono.com.br`), `localhost` on a user's browser refers to *their* machine, not the backend server.
*   The backend API is hosted at a specific public domain, `https://api.audicarefono.com.br`. The frontend application must be configured to send requests to this public domain, not to a `localhost` address that only exists during local development.
*   Deployment to any environment other than your local machine with a `localhost` API URL will result in network errors (e.g., "Failed to fetch") because the browser will attempt to connect to an API server that does not exist at `localhost` for the end-user.

## 3. Correct Production Value (`https://api.audicarefono.com.br`)

For the production environment, `VITE_API_BASE_URL` **must** be set to: