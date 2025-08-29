# Design Document: Optimistic Rendering with Request Queueing

## Introduction

The goal of this document is to propose a solution to improve the efficiency and reliability of data rendering in grid-based interfaces. Traditionally, rendering relied on a sequential and synchronous approach, which presented issues related to concurrent requests and inconsistent data states. This proposal introduces Optimistic Rendering combined with a Request Queueing mechanism to address these challenges.

## Motivation

The previous method of rendering in grid-based systems involved a series of steps that were prone to errors when handling multiple requests simultaneously. The main points of the original process were:

1. **Grid Update**: Users make changes to the grid.
2. **Project Save Request**: A request is sent to the server to save project data.
3. **Response Handling**: The system waits for the server's response.
4. **Calculation Request**: Sending request for calculating the results to be displayed
5. **Rendering**: The server's response is used to update the grid.

### Problem Description

The key issue with the previous system was related to synchronization:

- **Multiple Simultaneous Requests**: When multiple requests are sent before receiving a response for the first one, they share the same `etag` value. Once the first request is processed and the `etag` is updated, subsequent requests become invalid due to the outdated `etag`.

## Solution: Optimistic Rendering with Request Queueing

The proposed solution involves three critical changes:

1. **Optimistic Rendering**:

   - After a change is made in the grid, calculation request and subsequent grid update immediately without waiting for the server response for project save.
   - This approach reduces latency and enhances user experience by providing faster feedback.

2. **Request Queueing**:

   - Introduce a request queue that holds a maximum of one additional request if a previous request is still pending.
   - This approach allows for queuing next requests, ensuring that it is only processed after the first request has been completed and the server's response has been incorporated.

3. **Conflict Resolution Banner**:
   - If the `etag` has been updated by another user's request during the time the queue holds a request, a banner will display with options to either overwrite the server changes with the user's changes or discard the user's changes.

## Use Cases

### Use Case 1: Single User Interaction

- **Action**: User makes a change in the grid.
- **Outcome**: The grid is optimistically updated, and a request to save is sent to the server.
- **Success**: The server response confirms the change, and the grid state remains as rendered.

### Use Case 2: Multiple Sequential Changes

- **Action**: User makes multiple changes rapidly.
- **Outcome**: Each change updates the grid optimistically. Only last requests are enqueued.
- **Success**: Changes are processed sequentially as server responses return for project save; the queue ensures consistency.

### Use Case 3: Concurrent System Access

- **Action**: Multiple users attempt to update the grid simultaneously.
- **Outcome**: Optimistic updates occur locally for each user. Request queue manages outgoing requests.
- **Conflict**: If `etag` value changes due to concurrent access, a conflict resolution banner is displayed.
- **Resolution**: Users choose to either overwrite server data with local changes or discard local changes.

## Conclusion

The introduction of Optimistic Rendering paired with a Request Queueing mechanism addresses the shortcomings of the traditional approach by reducing latency and handling `etag` mismatch errors effectively.
