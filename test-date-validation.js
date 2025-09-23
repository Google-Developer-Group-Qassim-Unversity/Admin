// Test script to verify date handling in validation
console.log("Testing date handling for validation:");

// Test case 1: Single day event
const testForm1 = {
  event_date: "2024-03-15",
  date_type: "single",
  event_end_date: ""
};

const startDate1 = testForm1.event_date ? new Date(testForm1.event_date) : new Date();
const endDate1 = testForm1.date_type === "single" 
  ? startDate1 
  : testForm1.event_end_date 
    ? new Date(testForm1.event_end_date) 
    : startDate1;

console.log("Single day event:");
console.log("  'start date':", startDate1.toISOString());
console.log("  'end date':", endDate1.toISOString());

// Test case 2: Date range event
const testForm2 = {
  event_date: "2024-03-15",
  date_type: "range",
  event_end_date: "2024-03-17"
};

const startDate2 = testForm2.event_date ? new Date(testForm2.event_date) : new Date();
const endDate2 = testForm2.date_type === "single" 
  ? startDate2 
  : testForm2.event_end_date 
    ? new Date(testForm2.event_end_date) 
    : startDate2;

console.log("\nDate range event:");
console.log("  'start date':", startDate2.toISOString());
console.log("  'end date':", endDate2.toISOString());

// Test FormData creation
console.log("\nFormData fields test:");
const formData = new FormData();
formData.append('start date', startDate1.toISOString());
formData.append('end date', endDate1.toISOString());
formData.append('url', 'https://example.com');

console.log("FormData entries:");
for (let [key, value] of formData.entries()) {
  console.log(`  "${key}": ${value}`);
}

// Test case 3: Error handling for 422 response with corrected field names
const mockError422 = {
  "detail": [
    {
      "loc": ["body", "start date"],
      "msg": "Field required",
      "type": "value_error.missing"
    },
    {
      "loc": ["body", "end date"],
      "msg": "Field required", 
      "type": "value_error.missing"
    }
  ]
};

console.log("\n422 Error handling test (corrected field names):");
const errors = mockError422.detail.map((err) => {
  const location = Array.isArray(err.loc) ? err.loc.join(' -> ') : 'Unknown field';
  return `${location}: ${err.msg || 'Validation error'}`;
}).join('\n');
console.log("Formatted errors:", errors);

// Test case 4: Error handling for 400 response (corrected format)
const mockError400 = {
  "detail": {
    "error": "Invalid sheet format",
    "details": "Missing required columns: name, email"
  }
};

console.log("\n400 Error handling test (corrected format):");
console.log("Formatted error:", `${mockError400.detail.error}: ${mockError400.detail.details}`);

// Test case 5: Error handling for 400 response with array details
const mockError400Array = {
  "detail": {
    "error": "Validation failed",
    "details": ["Missing column: name", "Missing column: email", "Invalid date format"]
  }
};

console.log("\n400 Error handling test (array details):");
const arrayDetails = Array.isArray(mockError400Array.detail.details) 
  ? mockError400Array.detail.details.join(', ')
  : mockError400Array.detail.details;
console.log("Formatted error:", `${mockError400Array.detail.error}: ${arrayDetails}`);