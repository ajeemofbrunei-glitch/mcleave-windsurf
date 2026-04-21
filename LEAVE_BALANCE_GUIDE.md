# Leave Balance Customization Guide

## Overview
The McLeave system now supports customizable annual leave balances for each crew member. By default, all crew members start with 14 days (Malaysian standard), but you can customize this individually or in bulk.

## Features Added

### 1. Individual Leave Balance Customization

**How to customize:**
1. Go to **👥 Crew List** tab in admin panel
2. Click on any crew member to open their profile
3. Click **✏️ Edit Profile**
4. Find the **"Annual Leave Balance (Days)"** field
5. Enter the custom number of days (0-365)
6. Click **Save Changes**

The crew member will now see their updated balance in their header when they log in.

### 2. Bulk Leave Balance Reset

**How to reset all balances at once:**
1. Go to **👥 Crew List** tab in admin panel
2. Click the **🔄 Reset All Balances** button (yellow button in the filter bar)
3. Enter the new balance amount (e.g., 14 for annual reset)
4. Click **Reset All Balances**
5. All crew members will have their balance updated to the specified amount

**Common use cases:**
- Annual leave balance renewal at the start of the year
- Adjusting balances for part-time vs full-time crew
- Special allowances for senior crew members

### 3. Leave Balance Tracking

**The system automatically:**
- Deducts days when "Annual Leave" or "Birthday Leave" requests are approved
- Does NOT deduct for "Off Day", "Morning Shift", or "Afternoon Shift" (these don't count against annual leave)
- Prevents crew from requesting more days than they have available
- Shows remaining balance in the crew's header and profile

### 4. Visual Indicators

**Where you can see leave balances:**
- **Crew List Table**: New "Leave Balance" column shows remaining days for each crew
- **Crew Profile Modal**: Displays current balance prominently
- **Crew Header** (when logged in): Shows "X days left" next to their name

## Balance Calculation

- Initial balance: 14 days (or custom amount set by admin)
- When leave is approved:
  - Annual Leave: Deducts days from balance
  - Birthday Leave: Deducts days from balance
  - Off Day: Does NOT deduct
  - Morning/Afternoon Shift: Does NOT deduct

## Examples

### Example 1: Part-Time Crew
Part-time crew might only get 7 days per year:
1. Edit their profile
2. Set "Annual Leave Balance" to 7
3. Save

### Example 2: Annual Reset (New Year)
At the start of the year, reset everyone to 14 days:
1. Click "Reset All Balances"
2. Enter 14
3. Confirm

### Example 3: Senior Crew Member
Give a senior crew member extra days (e.g., 21 days):
1. Edit their profile
2. Set "Annual Leave Balance" to 21
3. Save

## Notes

- The system uses Malaysian employment standards (14 days) as default
- Balances can be set from 0 to 365 days
- Changes are saved immediately to the database
- Crew members see their updated balance instantly when they log in
