// Test script to verify FormData structure for composite action
// This demonstrates the data structure that will be sent to the API

const testEventData = {
  action: "composite",
  event_info: {
    event_title: "Test Event",
    start_date: "2024-03-15",
    end_date: "2024-03-15"
  },
  department_id: 1,
  department_action_id: 5,
  member_action_id: 10,
  bonus: 50,
  discount: 10,
  members_link: "https://docs.google.com/spreadsheets/d/example",
  organizers: [
    {
      name: "John Doe",
      email: "john@example.com",
      phone_number: "123456789",
      uni_id: "U001",
      participation_action_id: "5",
      gender: "Male",
      attendance: ["present"]
    }
  ]
};

// Helper function to create FormData from composite event data
const createCompositeFormData = (eventData) => {
  const formData = new FormData();
  
  // Add scalar fields as strings
  formData.append('action', eventData.action);
  formData.append('event_info', JSON.stringify(eventData.event_info));
  formData.append('department_id', eventData.department_id.toString());
  formData.append('department_action_id', eventData.department_action_id.toString());
  formData.append('member_action_id', eventData.member_action_id.toString());
  formData.append('bonus', eventData.bonus.toString());
  formData.append('discount', eventData.discount.toString());
  formData.append('members link', eventData.members_link || '');
  formData.append('organizers', JSON.stringify(eventData.organizers));
  
  // Only include members_file if there's actually a file to upload
  // For now, since we're only sending links, we omit this field entirely
  // When file upload is implemented, add: if (eventData.members_file) formData.append('members_file', eventData.members_file);
  
  return formData;
};

// Test the FormData creation
const formData = createCompositeFormData(testEventData);

console.log("FormData structure for composite action:");
console.log("=====================================");

// Display all form data entries
for (let [key, value] of formData.entries()) {
  console.log(`${key}: ${value}`);
}

console.log("\nThis FormData will be sent to POST /events/composite endpoint");
console.log("Content-Type: multipart/form-data (automatically set by browser)");