# Leave Management System - Complete Implementation Documentation

This document provides a comprehensive overview of the Leave Management System implementation from Phase 1 to Phase 7.

---

## Table of Contents

1. [System Flow and Workflows](#system-flow-and-workflows)
2. [Phase 1: Database Design and Models](#phase-1-database-design-and-models)
3. [Phase 2: Backend API Endpoints](#phase-2-backend-api-endpoints)
4. [Phase 3: Controller Logic](#phase-3-controller-logic)
5. [Phase 4: Validation and Middleware](#phase-4-validation-and-middleware)
6. [Phase 5: Business Logic Helpers](#phase-5-business-logic-helpers)
7. [Phase 6: Integration with Attendance System](#phase-6-integration-with-attendance-system)
8. [Phase 7: Frontend Components](#phase-7-frontend-components)
9. [API Endpoints Summary](#api-endpoints-summary)
10. [Database Schema](#database-schema)
11. [Testing and Usage](#testing-and-usage)

---

## System Flow and Workflows

This section explains how the Leave Management System works from different user perspectives and system operations.

### 1. Employee Leave Request Flow

#### Step 1: Employee Registration & Balance Initialization
```
Employee Registers → Admin Initializes Leave Balance → Employee Can Request Leave
```

**Details:**
1. Employee creates account through registration
2. **Admin Action Required**: Admin must manually initialize leave balances for the new employee
   - Admin can set different allocations per leave type (e.g., Annual: 18 days, Sick: 12 days)
   - Balances are year-specific (2024, 2025, etc.)
3. Once balance is initialized, employee can request leave

#### Step 2: Employee Submits Leave Request
```
Employee Fills Form → System Validates → Request Created → Status: PENDING
```

**Process:**
1. Employee navigates to Leave Request page (`/leave`)
2. Employee fills out leave request form:
   - Selects leave type (Annual, Sick, Casual, etc.)
   - Chooses start and end dates
   - Provides reason (minimum 10 characters)
   - Optionally uploads attachments
3. **System Validations:**
   - ✅ Start date cannot be in the past
   - ✅ End date must be after start date
   - ✅ Calculates working days (excludes weekends)
   - ✅ Checks if employee has sufficient leave balance
   - ✅ Checks for overlapping approved/pending leaves
4. If all validations pass:
   - Leave request is created with status: `pending`
   - History record is created (`action: 'requested'`)
   - Balance is **NOT deducted yet** (only deducted on approval)
5. Employee sees request in "My Leave Records" with status "Pending"

#### Step 3: Admin Reviews Request
```
Admin Views Dashboard → Sees Pending Requests → Reviews Details → Makes Decision
```

**Admin Actions:**
1. Admin navigates to Admin Dashboard (`/dashboard/admin`)
   - Can see "Pending Requests" count in metrics
   - Can see "Recent Leave Requests" section
2. Admin can view detailed leave requests:
   - Employee name and details
   - Leave type and duration
   - Reason provided
   - Dates requested
3. Admin can:
   - **Approve**: Leave is approved, balance deducted, status changes to `approved`
   - **Reject**: Must provide rejection reason, status changes to `rejected`, balance not affected
   - **Bulk Actions**: Select multiple requests and approve/reject in bulk

#### Step 4: Request Approval Flow
```
Admin Approves → Balance Deducted → Status: APPROVED → Visible in Calendar
```

**When Admin Approves:**
1. System validates again:
   - Checks balance availability (re-validation)
   - Checks for overlapping leaves
2. If validations pass:
   - Status updated to `approved`
   - `approvedBy` set to admin's user ID
   - `approvedAt` timestamp recorded
   - **Leave balance deducted**:
     - `usedDays` increased
     - `remainingDays` decreased
   - History record created (`action: 'approved'`)
3. Employee sees status change to "Approved"
4. Leave appears in calendar view
5. Leave days are considered in attendance calculations

#### Step 5: Request Rejection Flow
```
Admin Rejects → Rejection Reason Recorded → Status: REJECTED → Balance Unchanged
```

**When Admin Rejects:**
1. Admin must provide rejection reason (minimum 10 characters)
2. Status updated to `rejected`
3. `rejectedBy` and `rejectedAt` recorded
4. `rejectionReason` stored
5. **Balance is NOT deducted** (request never consumed balance)
6. History record created (`action: 'rejected'`)
7. Employee sees rejection with reason

### 2. Admin Leave Management Flow

#### Flow 1: Manual Leave Creation
```
Admin Clicks "Add Leave" → Selects Employee → Fills Details → Leave Created → Status: APPROVED
```

**Process:**
1. Admin navigates to Leave Management (`/admin/leave`)
2. Clicks "Add Leave" button
3. Selects employee from dropdown
4. Fills leave details (same as employee request form)
5. Can set status directly (approved/pending)
6. If set to approved:
   - Balance is deducted immediately
   - Leave is active right away
7. Use cases:
   - Employee forgot to request
   - Backdating leave
   - Verbal approval scenario
   - System corrections

#### Flow 2: Edit Leave Request
```
Admin Views Leave → Clicks Edit → Modifies Details → System Adjusts Balance → Updates Saved
```

**Process:**
1. Admin can edit any leave request:
   - Change dates
   - Change leave type
   - Change reason
   - Change status
2. **Balance Adjustments:**
   - If dates/type change, old balance is refunded and new balance is deducted
   - If status changes from approved to rejected, balance is refunded
   - If status changes from rejected to approved, balance is deducted
3. History record tracks all changes
4. Employee sees updated information

#### Flow 3: Cancel Approved Leave
```
Admin Cancels Approved Leave → Balance Refunded → Status: CANCELLED → History Recorded
```

**Process:**
1. Admin can cancel approved leaves
2. Must provide cancellation reason
3. Balance is automatically refunded:
   - `usedDays` decreased
   - `remainingDays` increased
4. Status changed to `cancelled`
5. History record created

#### Flow 4: Adjust Leave Balance
```
Admin Views Employee → Selects Leave Balance → Adjusts Days → Reason Recorded → Balance Updated
```

**Process:**
1. Admin can manually adjust any employee's leave balance
2. Can add or subtract days:
   - Positive adjustment: Adds days (e.g., +5 days)
   - Negative adjustment: Removes days (e.g., -2 days)
3. Must provide reason for adjustment
4. Balance updated immediately
5. History record created
6. Use cases:
   - Bonus leave days
   - Correction of errors
   - Promotional benefits
   - Policy changes

#### Flow 5: Bulk Operations
```
Admin Selects Multiple Requests → Chooses Action → System Processes Each → Results Summary
```

**Process:**
1. Admin can select multiple leave requests using checkboxes
2. Choose bulk action:
   - Approve selected
   - Reject selected (requires reason)
3. System processes each request individually:
   - Validates each request
   - Performs action if valid
   - Records errors for invalid requests
4. Returns summary:
   - Number approved/rejected
   - List of errors (if any)

#### Flow 6: Export Leave Data
```
Admin Clicks Export → Selects Filters → System Generates Data → Downloads File
```

**Process:**
1. Admin clicks "Export" button
2. Can filter by:
   - Date range
   - Status
   - Leave type
3. Can export in:
   - CSV format (spreadsheet)
   - JSON format (data export)
4. File downloaded with all leave data

### 3. Public Holidays Management Flow

#### Flow 1: Create Holiday
```
Admin Navigates to Holidays → Clicks Add → Fills Details → Holiday Created
```

**Process:**
1. Admin can create public holidays
2. Provides:
   - Holiday name
   - Date
   - Description (optional)
   - Recurring flag (if repeats every year)
3. Holiday is stored by year
4. Holidays are excluded from working days calculation
5. Visible in calendar view

#### Flow 2: Manage Holidays
```
Admin Views Holidays → Edits/Deletes → Changes Saved
```

**Process:**
1. Admin can view all holidays for a year
2. Can edit holiday details
3. Can delete holidays
4. Changes reflected in leave calculations

### 4. Leave Balance Management Flow

#### Flow 1: Initialize Balance for New Employee
```
Employee Registers → Admin Initializes Balance → Default Allocations Set → Employee Can Use
```

**Process:**
1. When new employee joins:
   - Admin must manually initialize balance
   - Can use default allocations or custom values
   - Creates balance records for each leave type
2. Default allocations (can be customized):
   - Annual Leave: 18 days
   - Sick Leave: 12 days
   - Casual Leave: 12 days
   - Others: 0 days (unless specified)
3. Balance created for current year
4. Employee can now request leave

#### Flow 2: Year-End Balance Reset
```
Year Ends → Admin Creates New Year Balances → Old Balances Archived → New Year Starts
```

**Process:**
1. At start of new year:
   - Admin creates new balance records for new year
   - Old year balances remain for historical reference
2. **Note**: Currently, balances don't auto-carry forward
   - Admin can manually add carry-forward days if needed
   - Future enhancement: Auto carry-forward rules
3. New allocations set for new year

### 5. System Integration Flows

#### Flow 1: Leave and Attendance Integration
```
Employee on Leave → Attendance System Checks → Shows "On Leave" → Not Counted as Absent
```

**Process:**
1. When employee is on approved leave:
   - Attendance system checks leave status daily
   - If employee has approved leave for today:
     - Status shows "On Leave"
     - Not marked as absent
     - Leave days counted separately
2. Dashboard statistics:
   - Attendance percentage calculated excluding leave days
   - Leave days shown separately
   - Total working days = Present + Leave + Absent

#### Flow 2: Calendar Integration
```
Approved Leaves → Calendar View → Visual Representation → Team Availability
```

**Process:**
1. Approved leaves automatically appear in calendar
2. Calendar shows:
   - All employees' leaves
   - Leave types (color-coded)
   - Public holidays
   - Current date marker
3. Team availability shows:
   - Who is available today
   - Who is on leave
   - Leave type for those on leave

### 6. Leave Request Status Flow Diagram

```
                    [NEW EMPLOYEE]
                          ↓
                    [Balance Initialized]
                          ↓
                    [Employee Requests Leave]
                          ↓
                    ┌─────────────────┐
                    │   PENDING       │ ← Status when created
                    └─────────────────┘
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
    [Admin Approves]          [Admin Rejects]
              ↓                       ↓
    ┌─────────────────┐       ┌─────────────────┐
    │   APPROVED      │       │   REJECTED      │
    │ Balance Deducted│       │ Balance Unchanged│
    │ Visible in Cal  │       │ Can Request Again│
    └─────────────────┘       └─────────────────┘
              ↓
    [Admin Can Cancel]
              ↓
    ┌─────────────────┐
    │   CANCELLED     │
    │ Balance Refunded│
    └─────────────────┘
```

### 7. Daily System Operations

#### Morning: Check Today's Leaves
```
System Startup → Checks Today's Date → Queries Approved Leaves → Updates Statuses
```

**Process:**
1. System automatically checks daily
2. Identifies employees on leave today:
   - Queries approved leaves where today falls between startDate and endDate
3. Updates:
   - Team availability
   - Dashboard statistics
   - Employee status

#### Real-time: Balance Validation
```
Every Request → Check Balance → Check Overlaps → Validate Dates → Process
```

**Process:**
1. Every leave request (create/edit):
   - Real-time balance check
   - Overlap detection
   - Date validation
   - Working days calculation
2. If any validation fails:
   - Request rejected with specific error message
   - No balance deducted
3. If all pass:
   - Request processed
   - Balance updated (if approved)

### 8. Error Handling and Edge Cases

#### Edge Case 1: Overlapping Leaves
```
Employee Requests Leave → System Checks Existing → Overlap Detected → Request Rejected
```

**Process:**
- System prevents overlapping approved/pending leaves
- Checks date ranges: (startDate1 <= endDate2) AND (endDate1 >= startDate2)
- Employee must choose different dates

#### Edge Case 2: Insufficient Balance
```
Employee Requests 5 Days → Only 3 Days Available → Request Rejected → Error Message Shown
```

**Process:**
- System checks available balance before approval
- Shows exact available days in error message
- Employee can request fewer days or wait for balance reset

#### Edge Case 3: Past Date Requests
```
Employee Tries Past Date → System Validates → Request Rejected → Must Use Future Dates
```

**Process:**
- System prevents requesting leave for past dates
- Only future dates allowed (or today)
- Exception: Admin can create backdated leaves manually

#### Edge Case 4: Weekend Calculations
```
Employee Requests Mon-Fri → System Calculates → Excludes Weekends → Returns 5 Days
```

**Process:**
- Working days calculation excludes Saturday and Sunday
- Public holidays also excluded
- Total days = Working days only

### 9. User Roles and Permissions

#### Employee Role
**Can Do:**
- ✅ View own leave balance
- ✅ Request leave
- ✅ View own leave history
- ✅ Cancel own pending requests
- ✅ View team availability (only themselves)

**Cannot Do:**
- ❌ View other employees' leaves
- ❌ Approve/reject requests
- ❌ Edit leaves
- ❌ Adjust balances
- ❌ Create holidays

#### Admin Role
**Can Do:**
- ✅ All employee permissions
- ✅ View all employees' leaves
- ✅ Approve/reject requests
- ✅ Create leave manually
- ✅ Edit any leave request
- ✅ Cancel approved leaves
- ✅ Adjust leave balances
- ✅ Bulk operations
- ✅ Export data
- ✅ Manage public holidays
- ✅ View all statistics
- ✅ Initialize balances

### 10. Complete Workflow Example

**Scenario**: Employee wants to take 3 days annual leave

```
1. Employee Action:
   - Navigates to /leave
   - Clicks "Request a Leave"
   - Selects: Leave Type = "Annual"
   - Selects: Start Date = Dec 15, 2024
   - Selects: End Date = Dec 17, 2024
   - Enters reason: "Family vacation"
   - Clicks "Submit Request"

2. System Processing:
   - Validates dates (future dates ✓)
   - Calculates working days (3 days ✓)
   - Checks balance (has 10 days available ✓)
   - Checks overlaps (none found ✓)
   - Creates leave request (status: pending)
   - Creates history record

3. Employee Sees:
   - Request appears in "My Leave Records"
   - Status: "Pending"
   - Can cancel if needed

4. Admin Action:
   - Logs into admin dashboard
   - Sees "Pending Requests: 1" in metrics
   - Views "Recent Leave Requests"
   - Clicks on request to view details
   - Reviews dates and reason
   - Clicks "Approve"

5. System Processing:
   - Validates balance again ✓
   - Updates status to "approved"
   - Records approver (admin ID)
   - Deducts 3 days from annual leave balance
   - Updates: usedDays: +3, remainingDays: -3
   - Creates history record

6. Employee Sees:
   - Status changed to "Approved" (notification)
   - Balance updated: 10 → 7 days remaining
   - Leave appears in calendar

7. During Leave Period:
   - Dec 15-17: Employee on leave
   - Attendance system shows "On Leave"
   - Not marked as absent
   - Calendar shows leave days

8. After Leave:
   - Leave remains in history
   - Balance reflects used days
   - Can view in leave records
```

### 11. Key System Rules Summary

1. **Balance Rules:**
   - Balance is deducted only when leave is APPROVED
   - Balance is refunded when approved leave is CANCELLED
   - Balance is year-specific (separate for each year)
   - Balance can be manually adjusted by admin

2. **Date Rules:**
   - Start date cannot be in past (except admin manual creation)
   - End date must be after start date
   - Only working days counted (weekends excluded)
   - Public holidays excluded from calculations

3. **Overlap Rules:**
   - Cannot have overlapping approved/pending leaves
   - System checks before approval
   - Employee must cancel/change existing leave first

4. **Status Rules:**
   - Pending → Can be approved/rejected/cancelled by employee
   - Approved → Can be cancelled by admin (balance refunded)
   - Rejected → Cannot be changed, can request new leave
   - Cancelled → Final state, cannot be reactivated

5. **Permission Rules:**
   - Employees: Own data only
   - Admins: All data, all actions
   - Approval requires admin role

---

## Phase 1: Database Design and Models

### Overview
Created three new database models to support the leave management system:
- **LeaveBalance**: Tracks leave balances per user, leave type, and year
- **LeaveRequest**: Stores leave requests with approval workflow
- **LeaveHistory**: Audit trail for all leave-related actions

### Files Created

#### 1. `backend/models/LeaveBalance.js`
**Purpose**: Track leave balances for each user, organized by leave type and year.

**Fields**:
- `id` (INTEGER, Primary Key, Auto Increment)
- `userId` (INTEGER, Foreign Key → Users)
- `leaveType` (ENUM: 'sick', 'casual', 'annual', 'maternity', 'paternity', 'compensatory', 'unpaid')
- `totalDays` (DECIMAL(5,1)) - Total allocated days
- `usedDays` (DECIMAL(5,1)) - Days used/approved
- `remainingDays` (DECIMAL(5,1)) - Available days
- `year` (INTEGER) - Year for which balance is valid
- `notes` (TEXT, Optional) - Additional notes
- `timestamps` (createdAt, updatedAt)

**Key Features**:
- Unique constraint on `userId + leaveType + year`
- Supports decimal values for half-day leaves
- Year-based balance tracking

#### 2. `backend/models/LeaveRequest.js`
**Purpose**: Store leave requests with full approval workflow support.

**Fields**:
- `id` (INTEGER, Primary Key, Auto Increment)
- `userId` (INTEGER, Foreign Key → Users) - Employee requesting leave
- `leaveType` (ENUM: same as LeaveBalance)
- `startDate` (DATEONLY) - Start date of leave
- `endDate` (DATEONLY) - End date of leave
- `totalDays` (DECIMAL(5,1)) - Calculated working days
- `reason` (TEXT) - Reason for leave
- `status` (ENUM: 'pending', 'approved', 'rejected', 'cancelled')
- `approvedBy` (INTEGER, Foreign Key → Users, Nullable)
- `approvedAt` (DATE, Nullable)
- `rejectionReason` (TEXT, Nullable)
- `rejectedBy` (INTEGER, Foreign Key → Users, Nullable)
- `rejectedAt` (DATE, Nullable)
- `attachments` (JSON, Nullable) - File URLs for documents
- `timestamps` (createdAt, updatedAt)

**Indexes**:
- `userId`
- `status`
- `leaveType`
- `startDate, endDate`

#### 3. `backend/models/LeaveHistory.js`
**Purpose**: Complete audit trail for all leave request actions.

**Fields**:
- `id` (INTEGER, Primary Key, Auto Increment)
- `leaveRequestId` (INTEGER, Foreign Key → LeaveRequests)
- `userId` (INTEGER, Foreign Key → Users) - Employee
- `action` (ENUM: 'requested', 'approved', 'rejected', 'cancelled', 'modified')
- `performedBy` (INTEGER, Foreign Key → Users) - Who performed the action
- `notes` (TEXT, Optional)
- `previousStatus` (ENUM, Nullable) - Status before action
- `newStatus` (ENUM, Nullable) - Status after action
- `timestamps` (createdAt, updatedAt)

**Key Features**:
- Complete audit trail
- Tracks status changes
- Records who performed each action

### Model Associations (`backend/models/index.js`)

Updated to include relationships:

```javascript
// User - LeaveBalance (One-to-Many)
User.hasMany(LeaveBalance, { foreignKey: 'userId', as: 'leaveBalances' });
LeaveBalance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - LeaveRequest (Multiple relationships)
// Employee relationship
User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

// Approver relationship
User.hasMany(LeaveRequest, { foreignKey: 'approvedBy', as: 'approvedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Rejecter relationship
User.hasMany(LeaveRequest, { foreignKey: 'rejectedBy', as: 'rejectedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'rejectedBy', as: 'rejecter' });

// LeaveRequest - LeaveHistory (One-to-Many)
LeaveRequest.hasMany(LeaveHistory, { foreignKey: 'leaveRequestId', as: 'history' });
LeaveHistory.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId', as: 'leaveRequest' });

// User - LeaveHistory (Multiple relationships)
User.hasMany(LeaveHistory, { foreignKey: 'userId', as: 'leaveHistories' });
LeaveHistory.belongsTo(User, { foreignKey: 'userId', as: 'employee' });
User.hasMany(LeaveHistory, { foreignKey: 'performedBy', as: 'performedLeaveHistories' });
LeaveHistory.belongsTo(User, { foreignKey: 'performedBy', as: 'performer' });
```

---

## Phase 2: Backend API Endpoints

### File Created: `backend/routes/leaveRoutes.js`

All routes are prefixed with `/api/leave`

### Employee Routes (Require Authentication)

1. **POST `/api/leave/request`**
   - **Purpose**: Create a new leave request
   - **Auth**: Required
   - **Validation**: Request body validated (leaveType, dates, reason)
   - **Response**: Created leave request with employee details

2. **GET `/api/leave/my-requests`**
   - **Purpose**: Get all leave requests for the authenticated user
   - **Auth**: Required
   - **Query Parameters**: 
     - `status` (optional) - Filter by status
     - `leaveType` (optional) - Filter by leave type
     - `startDate` (optional) - Filter by start date range
     - `endDate` (optional) - Filter by end date range
     - `page` (optional, default: 1) - Pagination
     - `limit` (optional, default: 10) - Items per page
   - **Response**: Paginated list of leave requests

3. **GET `/api/leave/my-requests/:id`**
   - **Purpose**: Get a single leave request by ID
   - **Auth**: Required
   - **Response**: Leave request with full details including history

4. **PUT `/api/leave/my-requests/:id/cancel`**
   - **Purpose**: Cancel a pending leave request
   - **Auth**: Required
   - **Response**: Updated leave request

5. **GET `/api/leave/balance`**
   - **Purpose**: Get leave balance for the authenticated user
   - **Auth**: Required
   - **Query Parameters**: `year` (optional, default: current year)
   - **Response**: Leave balances for all leave types

6. **GET `/api/leave/stats`**
   - **Purpose**: Get leave statistics for the authenticated user
   - **Auth**: Required
   - **Query Parameters**: `year` (optional, default: current year)
   - **Response**: Statistics including totals, by type, by status

### Admin/Manager Routes (Require Admin Authentication)

7. **GET `/api/leave/pending`**
   - **Purpose**: Get all pending leave requests
   - **Auth**: Required (Admin only)
   - **Query Parameters**: 
     - `userId` (optional) - Filter by user
     - `leaveType` (optional) - Filter by leave type
     - `page`, `limit` - Pagination
   - **Response**: Paginated list of pending requests with employee details

8. **PUT `/api/leave/pending/:id/approve`**
   - **Purpose**: Approve a leave request
   - **Auth**: Required (Admin only)
   - **Response**: Updated leave request with approver details

9. **PUT `/api/leave/pending/:id/reject`**
   - **Purpose**: Reject a leave request
   - **Auth**: Required (Admin only)
   - **Validation**: Request body must include `rejectionReason`
   - **Response**: Updated leave request with rejection details

10. **GET `/api/leave/all`**
    - **Purpose**: Get all leave requests (admin view)
    - **Auth**: Required (Admin only)
    - **Query Parameters**: 
      - `status`, `userId`, `leaveType`, `startDate`, `endDate` - Filters
      - `page`, `limit` - Pagination
    - **Response**: Paginated list of all leave requests

11. **GET `/api/leave/stats/admin`**
    - **Purpose**: Get admin-level leave statistics
    - **Auth**: Required (Admin only)
    - **Query Parameters**: `year` (optional)
    - **Response**: Company-wide leave statistics

### Shared Routes

12. **GET `/api/leave/calendar`**
    - **Purpose**: Get leave calendar for date range
    - **Auth**: Required
    - **Query Parameters**: 
      - `startDate` (required)
      - `endDate` (required)
    - **Response**: Calendar data grouped by date with employee details

### Route Registration

Routes are registered in `backend/server.js`:
```javascript
app.use('/api/leave', require('./routes/leaveRoutes'));
```

---

## Phase 3: Controller Logic

### File Created: `backend/controllers/leaveController.js`

### Controller Functions

#### 1. `requestLeave`
- Validates dates (start date not in past, end date after start)
- Calculates working days (excluding weekends)
- Checks leave balance availability
- Checks for overlapping requests
- Creates leave request with status 'pending'
- Creates history record
- Returns created request with employee details

#### 2. `getMyLeaveRequests`
- Fetches all leave requests for authenticated user
- Applies filters (status, leaveType, date range)
- Includes pagination
- Returns requests with approver/rejecter details

#### 3. `getLeaveRequest`
- Fetches single leave request by ID
- Checks authorization (user owns request or is admin)
- Includes full history with performer details
- Returns complete request details

#### 4. `cancelLeaveRequest`
- Validates request exists and belongs to user
- Checks status is 'pending'
- Updates status to 'cancelled'
- Creates history record
- Returns updated request

#### 5. `getLeaveBalance`
- Fetches leave balances for user and year
- Recalculates balances to ensure accuracy
- Returns all leave types with total, used, remaining days

#### 6. `getPendingLeaveRequests` (Admin)
- Fetches all pending requests
- Applies filters
- Includes employee details
- Returns paginated results

#### 7. `approveLeaveRequest` (Admin)
- Validates request exists and is pending
- Re-checks leave balance before approval
- Updates request status to 'approved'
- Records approver and approval timestamp
- Deducts days from leave balance
- Creates history record
- Returns updated request

#### 8. `rejectLeaveRequest` (Admin)
- Validates request exists and is pending
- Requires rejection reason
- Updates request status to 'rejected'
- Records rejecter and rejection timestamp
- Stores rejection reason
- Creates history record
- Returns updated request

#### 9. `getAllLeaveRequests` (Admin)
- Fetches all leave requests
- Applies comprehensive filters
- Includes employee, approver, rejecter details
- Returns paginated results

#### 10. `getLeaveCalendar`
- Fetches approved leaves in date range
- Groups by date
- Includes employee details
- Returns calendar structure

#### 11. `getLeaveStatistics` (Employee)
- Calculates statistics for user
- Counts by status and leave type
- Calculates total days used
- Returns comprehensive statistics

#### 12. `getAdminLeaveStatistics` (Admin)
- Calculates company-wide statistics
- Counts by status and leave type
- Calculates totals and averages
- Returns admin-level statistics

---

## Phase 4: Validation and Middleware

### File: `backend/routes/leaveRoutes.js`

### Validation Rules

#### Request Leave Validation
- `leaveType`: Required, must be valid enum value
- `startDate`: Required, must be valid ISO8601 date
- `endDate`: Required, must be valid ISO8601 date, must be after startDate
- `reason`: Required, minimum 10 characters

#### Reject Leave Validation
- `rejectionReason`: Required, minimum 10 characters

### Middleware Usage

- `authenticate`: Applied to all routes (from `middleware/auth.js`)
- `isAdmin`: Applied to admin-only routes
- `handleValidationErrors`: Custom middleware to handle validation errors
- `validationResult`: From express-validator to check validation results

---

## Phase 5: Business Logic Helpers

### File Created: `backend/utils/leaveHelpers.js`

### Helper Functions

#### 1. `calculateWorkingDays(startDate, endDate, holidays = [])`
- **Purpose**: Calculate working days between two dates
- **Excludes**: Weekends (Saturday, Sunday)
- **Optional**: Excludes holidays if provided
- **Returns**: Number of working days

#### 2. `checkLeaveBalance(userId, leaveType, requestedDays, year)`
- **Purpose**: Check if user has sufficient leave balance
- **Returns**: Object with `hasBalance`, `available`, `balance`, `requested`, `message`
- **Handles**: Missing balance records

#### 3. `checkOverlappingRequests(userId, startDate, endDate, excludeRequestId)`
- **Purpose**: Check for overlapping approved/pending requests
- **Returns**: Object with `hasOverlap`, `overlappingRequest`
- **Excludes**: Cancelled/rejected requests
- **Optional**: Exclude specific request ID (for updates)

#### 4. `initializeLeaveBalance(userId, leaveAllocations, year)`
- **Purpose**: Initialize leave balances for a user
- **Default Allocations**: sick: 12, casual: 12, annual: 18
- **Returns**: Array of created balance records
- **Handles**: Existing balances (doesn't overwrite)

#### 5. `recalculateLeaveBalance(userId, leaveType, year)`
- **Purpose**: Recalculate leave balance based on approved requests
- **Calculates**: Used days from approved requests
- **Updates**: remainingDays = totalDays - usedDays
- **Returns**: Updated balance record

#### 6. `deductLeaveBalance(userId, leaveType, days, year)`
- **Purpose**: Deduct days from balance when request is approved
- **Updates**: usedDays += days, remainingDays -= days
- **Returns**: Updated balance record

#### 7. `refundLeaveBalance(userId, leaveType, days, year)`
- **Purpose**: Refund days to balance when request is cancelled/rejected
- **Updates**: usedDays -= days, remainingDays += days
- **Handles**: Boundaries (doesn't go below 0 or above totalDays)
- **Returns**: Updated balance record

---

## Phase 6: Integration with Attendance System

### Files Modified: `backend/controllers/attendanceController.js`

### Changes Made

#### 1. Updated Imports
```javascript
const { Attendance, User, LeaveRequest, LeaveBalance } = require('../models');
```

#### 2. Enhanced `getDashboardStats`
- Fetches leave balances for the user
- Calculates total leave balance across all types
- Fetches approved leaves in the period
- Calculates leave days in the period (excluding weekends)
- Adds `leaveDays` to statistics
- Replaces hardcoded `leaveBalance` with actual balance from database

**New Statistics Fields**:
- `leaveDays`: Number of leave days in the selected period
- `leaveBalance`: Total remaining leave balance (from LeaveBalance model)

#### 3. Enhanced `getTodayStatus`
- Checks if user is on approved leave today
- Fetches leave request that covers today's date
- Adds `onLeave` boolean to response
- Adds `leaveRequest` object with leave details if on leave

**New Response Fields**:
```javascript
{
  checkedIn: boolean,
  checkedOut: boolean,
  attendance: Object | null,
  onLeave: boolean,
  leaveRequest: {
    id: number,
    leaveType: string,
    startDate: string,
    endDate: string
  } | null
}
```

### Benefits
- Attendance dashboard now shows actual leave data
- Today's status indicates if employee is on leave
- Leave days are properly accounted for in statistics
- No more hardcoded values

---

## Phase 7: Frontend Components

### Files Created

#### 1. `frontend/app/leave/page.tsx`

**Purpose**: Main leave management page for employees

**Features**:
- Leave balance cards (shows all leave types with remaining/total days)
- Leave request form (create new requests)
- Leave requests list (view all requests with filters)
- Status badges (visual indicators for pending/approved/rejected/cancelled)
- Cancel functionality (cancel pending requests)
- Filtering (by status and leave type)
- Working days calculator (automatically calculates days when dates are selected)

**Components Included**:
- Request form with validation
- Balance display cards
- Requests table with status indicators
- Filter controls
- Cancel buttons for pending requests

**State Management**:
- `showRequestForm`: Toggle request form visibility
- `leaveRequests`: List of leave requests
- `leaveBalances`: Leave balance data
- `filters`: Filter state (status, leaveType)
- `requestForm`: Form data
- `calculatedDays`: Auto-calculated working days

**API Calls**:
- `GET /api/leave/my-requests` - Fetch leave requests
- `GET /api/leave/balance` - Fetch leave balances
- `POST /api/leave/request` - Submit leave request
- `PUT /api/leave/my-requests/:id/cancel` - Cancel request

### Files Modified

#### 1. `frontend/app/dashboard/page.tsx`
- Updated sidebar link from `/dashboard` to `/leave` for "Leave Request" menu item

---

## API Endpoints Summary

### Base URL: `/api/leave`

| Method | Endpoint | Auth | Admin | Description |
|--------|----------|------|-------|-------------|
| POST | `/request` | ✅ | ❌ | Create leave request |
| GET | `/my-requests` | ✅ | ❌ | Get my leave requests |
| GET | `/my-requests/:id` | ✅ | ❌ | Get single leave request |
| PUT | `/my-requests/:id/cancel` | ✅ | ❌ | Cancel leave request |
| GET | `/balance` | ✅ | ❌ | Get leave balance |
| GET | `/stats` | ✅ | ❌ | Get leave statistics |
| GET | `/pending` | ✅ | ✅ | Get pending requests (admin) |
| PUT | `/pending/:id/approve` | ✅ | ✅ | Approve leave request |
| PUT | `/pending/:id/reject` | ✅ | ✅ | Reject leave request |
| GET | `/all` | ✅ | ✅ | Get all leave requests (admin) |
| GET | `/calendar` | ✅ | ❌ | Get leave calendar |
| GET | `/stats/admin` | ✅ | ✅ | Get admin statistics |

---

## Database Schema

### LeaveBalances Table
```
- id (INTEGER, PK)
- userId (INTEGER, FK → Users)
- leaveType (ENUM)
- totalDays (DECIMAL(5,1))
- usedDays (DECIMAL(5,1))
- remainingDays (DECIMAL(5,1))
- year (INTEGER)
- notes (TEXT, nullable)
- createdAt (DATE)
- updatedAt (DATE)
- UNIQUE(userId, leaveType, year)
```

### LeaveRequests Table
```
- id (INTEGER, PK)
- userId (INTEGER, FK → Users)
- leaveType (ENUM)
- startDate (DATEONLY)
- endDate (DATEONLY)
- totalDays (DECIMAL(5,1))
- reason (TEXT)
- status (ENUM: pending/approved/rejected/cancelled)
- approvedBy (INTEGER, FK → Users, nullable)
- approvedAt (DATE, nullable)
- rejectionReason (TEXT, nullable)
- rejectedBy (INTEGER, FK → Users, nullable)
- rejectedAt (DATE, nullable)
- attachments (JSON, nullable)
- createdAt (DATE)
- updatedAt (DATE)
```

### LeaveHistories Table
```
- id (INTEGER, PK)
- leaveRequestId (INTEGER, FK → LeaveRequests)
- userId (INTEGER, FK → Users)
- action (ENUM)
- performedBy (INTEGER, FK → Users)
- notes (TEXT, nullable)
- previousStatus (ENUM, nullable)
- newStatus (ENUM, nullable)
- createdAt (DATE)
- updatedAt (DATE)
```

---

## Testing and Usage

### Initial Setup

1. **Database Tables**: Tables are created automatically when you start the backend server (Sequelize sync)

2. **Initialize Leave Balances**: You may need to initialize leave balances for existing users. You can create a script or use the helper function:
```javascript
const { initializeLeaveBalance } = require('./utils/leaveHelpers');
await initializeLeaveBalance(userId, {
  sick: 12,
  casual: 12,
  annual: 18
}, 2024);
```

### Usage Flow

1. **Employee Requests Leave**:
   - Navigate to `/leave`
   - Click "Request Leave"
   - Fill in the form (leave type, dates, reason)
   - Submit request
   - Request status is "pending"

2. **Admin Approves/Rejects**:
   - Admin navigates to pending requests (endpoint: `/api/leave/pending`)
   - Views request details
   - Approves or rejects with reason
   - If approved, balance is automatically deducted

3. **Employee Views Status**:
   - View all requests on `/leave` page
   - See current balances
   - Cancel pending requests if needed
   - View approval/rejection details

### Testing Checklist

- [ ] Create leave request with valid data
- [ ] Validate date ranges (start < end, not in past)
- [ ] Check balance validation (insufficient balance error)
- [ ] Check overlapping requests validation
- [ ] Approve leave request (balance deduction)
- [ ] Reject leave request (with reason)
- [ ] Cancel pending request
- [ ] View leave balance
- [ ] View leave statistics
- [ ] View leave calendar
- [ ] Check attendance integration (dashboard shows leave data)
- [ ] Check today's status shows onLeave flag

---

## Key Features Implemented

✅ **Complete Leave Management System**
- Request, approve, reject, cancel workflows
- Leave balance tracking
- Multiple leave types support
- Year-based balance management

✅ **Comprehensive Validation**
- Date validation
- Balance checking
- Overlapping request prevention
- Input validation

✅ **Audit Trail**
- Complete history tracking
- Status change tracking
- Action performer tracking

✅ **Integration with Attendance**
- Dashboard shows leave data
- Today's status indicates if on leave
- Leave days in statistics

✅ **User-Friendly Frontend**
- Balance cards
- Request form with auto-calculation
- Filterable requests list
- Status indicators
- Responsive design

✅ **Admin Features**
- View all pending requests
- Approve/reject with reasons
- Company-wide statistics
- Calendar view

---

## Future Enhancements (Optional)

- Multi-level approval workflow
- Email/SMS notifications
- Leave policy configuration
- Holiday calendar integration
- Leave attachments upload
- Export to PDF/Excel
- Leave calendar visualization
- Department-wise leave management
- Carry forward unused leaves
- Leave quota management per employee

---

## Notes

- Working days calculation excludes weekends (Saturday, Sunday)
- Holidays can be integrated by passing holiday array to `calculateWorkingDays`
- Leave balances are year-based
- All timestamps are stored in UTC
- Decimal values support half-day leaves
- Admin role is required for approval/rejection endpoints

---

**Document Version**: 2.0  
**Last Updated**: Added System Flow and Workflows documentation  
**Implementation Status**: ✅ Complete (Phases 1-7 + Admin Features)
