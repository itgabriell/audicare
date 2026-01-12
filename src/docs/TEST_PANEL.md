# Validation Test Panel Guide

The **Validation Test Panel** is an advanced debugging tool designed to ensure the stability and correctness of the AudiCare messaging system. It provides a visual interface for running automated tests, viewing history, and analyzing results.

## Features

*   **Test Execution:** Run individual tests or the entire suite with one click.
*   **Categorization:** Tests are grouped by `Security`, `Network`, `Messaging`, `Data`, and `Performance`.
*   **Filtering:** Search tests by name or filter by category.
*   **Detailed Logs:** View input, output, and error stacks for every test run.
*   **History:** Automatically saves execution history to local storage (up to 50 runs).
*   **Analytics:** Visual charts showing pass/fail trends over time.
*   **Export:** Download test reports in JSON format for external analysis or bug reporting.

## How to Use

1.  **Access:** Click the **"Validação"** button (Bug icon) in the top right of the Inbox page.
2.  **Run Tests:**
    *   Click **"Executar Todos"** to run the full suite.
    *   Click the **Play** icon next to a specific test to run just that one.
3.  **View Details:** Click the arrow (`>`) on a test row to expand it and see detailed JSON output or error messages.
4.  **Analyze:** Switch to the **Analytics** tab to see if the system stability is improving or degrading over time.

## Available Tests

| Test Name | Description |
| :--- | :--- |
| **Autenticação JWT** | Verifies current session and token expiration. |
| **Conectividade Backend** | Pings the backend API to ensure it is reachable. |
| **Supabase Realtime** | Checks if the WebSocket connection for webhooks is active. |
| **Listagem de Contatos** | Validates the data structure returned by the contacts endpoint. |
| **Latência de API** | Benchmarks the response time of critical endpoints. |

## Troubleshooting

*   **Tests Failing:** Expand the test detail to see the error message. Common issues include `Timeout` (network lag) or `Auth Error` (session expired).
*   **Exporting:** Use the "Exportar" button to save a snapshot of the current state before reporting a bug.