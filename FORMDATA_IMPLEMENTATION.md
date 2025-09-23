# FormData Implementation for Composite Actions

## Changes Made

### 1. Added FormData Helper Function
- Created `createCompositeFormData()` function to convert JSON data to FormData
- Maps all required fields according to API specification:
  - `action`: "string" 
  - `event_info`: JSON stringified object
  - `department_id`: number as string
  - `department_action_id`: number as string  
  - `member_action_id`: number as string
  - `bonus`: number as string
  - `discount`: number as string
  - `members link`: URL string (note: space in field name as per API spec)
  - `organizers`: JSON stringified array
  - `members_file`: **OMITTED when no file is uploaded** (only included when actual file exists)

### 2. Modified Composite Action Handling
- Added `useFormData` flag to distinguish between JSON and FormData requests
- Set `useFormData = true` only for composite actions
- Maintained original JSON structure for data consistency

### 3. Updated Fetch Request Logic
- Added conditional request preparation based on `useFormData` flag
- For FormData: removes `Content-Type` header (browser sets automatically)
- For JSON: maintains existing `application/json` content type
- Added debugging logs for FormData contents

### 4. Data Structure Preservation
- Original JSON structure remains unchanged
- Same data flows through the system until the final API call
- Only the transport format changes (JSON → FormData) for composite actions

## API Endpoint
- **URL**: `POST /events/composite`
- **Content-Type**: `multipart/form-data` (for composite actions)
- **Content-Type**: `application/json` (for other action types)

## Testing
- FormData structure matches API specification exactly
- All existing functionality for other action types remains unchanged
- `members_file` field is properly omitted when sending links only
- Ready for future file upload implementation

## Files Modified
- `app/department-events/page.tsx`: Main implementation
- `test-formdata.js`: Test script for verification (can be removed)

## Next Steps
When ready to implement file uploads:
1. Update the file input handling in the form
2. Modify `createCompositeFormData()` to conditionally append actual file: 
   ```javascript
   if (eventData.members_file) {
     formData.append('members_file', eventData.members_file);
   }
   ```
3. No other changes needed - the infrastructure is ready