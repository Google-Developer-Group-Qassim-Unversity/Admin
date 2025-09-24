"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Save,
  Calendar,
  Users,
  User,
  Sparkles,
  Building2,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { type Department, MOCK_DATA } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { MemberSelector } from "@/components/member-selector"
import { OrganizerManager } from "@/components/organizer-manager"

const BaseUrl = process.env.NEXT_PUBLIC_DEV_HOST || process.env.NEXT_PUBLIC_HOST 
console.log(`Using BaseUrl: \x1b[32m${BaseUrl}\x1b[0m`);

// List of action IDs that should be hidden from the user interface
const HIDDEN_ACTION_IDS = {
  member_actions: [76, 77, 78, 79, 80, 64],
  department_actions: [] as number[],
  composite_actions: [] as number[],
  custom_actions: [] as number[]
};
 

interface ApiAction {
  id: number
  "action name": string
  "action arabic name": string
  "action type": string
  "action description": string
  points: number
}

interface ApiActionsResponse {
  "composite action": [ApiAction, ApiAction][]  // Array of pairs of actions [display action, submission action]
  "department action": ApiAction[]
  "member action": ApiAction[]
  "custom action": ApiAction[]
}

const EXTENDED_MOCK_DATA = {
  ...MOCK_DATA,
  existing_events: [
    { id: 1, title: "Annual Conference 2024", date: "2024-03-15" },
    { id: 2, title: "Team Building Workshop", date: "2024-02-20" },
    { id: 3, title: "Leadership Summit", date: "2024-04-10" },
    { id: 4, title: "Innovation Day", date: "2024-05-05" },
  ],
  preview_members: [
    { id: 1, name: "John Smith", email: "john.smith@university.edu", uni_id: "U001", department: "Computer Science", gender: "Male" },
    { id: 2, name: "Sarah Johnson", email: "sarah.johnson@university.edu", uni_id: "U002", department: "Engineering", gender: "Female" },
    { id: 3, name: "Michael Brown", email: "michael.brown@university.edu", uni_id: "U003", department: "Business", gender: "Male" },
    { id: 4, name: "Emily Davis", email: "emily.davis@university.edu", uni_id: "U004", department: "Mathematics", gender: "Female" },
    { id: 5, name: "David Wilson", email: "david.wilson@university.edu", uni_id: "U005", department: "Physics", gender: "Male" },
  ],
}

interface NewEventForm {
  action_id: string
  action_category: "composite" | "department" | "member" | "custom_member" | "custom_department" | ""
  department_id: string
  event_title: string
  event_date: string
  event_end_date: string
  date_type: "single" | "range"
  attendants_link: string | null // Google Sheets link
  attendants_file: File | null // Uploaded file
  attendants_source: "link" | "file" | null // Which source user chose
  attendants_validated: boolean // Validation status for either source
  organizers: Array<{
    name: string
    email: string
    phone_number: string
    uni_id: string
    participation_action_id: string
    gender: "Male" | "Female"
    attendance: string[] // Array of "present"/"absent" for each event day
  }>
  custom_points_awarded: string
  custom_points_date: string
  selected_member_id: string
  event_selection_type: "new" | "existing"
  selected_existing_event_id: string
  member_selection_type?: "single" | "bulk"
  member_search_query: string
  bonus: string
  discount: string
  show_add_member_form: boolean
  selected_existing_member: any | null
  // Renamed new_member fields to be more specific
  new_member_name: string
  new_member_email: string
  new_member_phone: string
  new_member_uni_id: string
  new_member_organizer_type: string
  new_member_gender: "Male" | "Female" | ""
  validation_error: string // Combined validation error for both link and file
  validating: boolean // Combined validation status
}

export default function AddNewEventPage() {
  // Local state for new member attendance before adding
  const [newMemberAttendance, setNewMemberAttendance] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [existingEvents, setExistingEvents] = useState<Array<{id: number, name: string}>>([])
  const [eventCreated, setEventCreated] = useState(false)
  const [contributorActions, setContributorActions] = useState<Array<{
    id: number;
    "action name": string;
    "action arabic name": string;
    "action type": string;
    "action description": string;
    points: number;
  }>>([])

  const [actions, setActions] = useState<{
    composite_actions: Array<{
      id: number
      name: string
      points: number
      requires_attendance: boolean
      participation_types: string[]
      member_action_id: number
      member_points: number
    }>
    department_actions: Array<{
      id: number
      name: string
      points: number
      requires_attendance: boolean
      participation_types: string[]
    }>
    member_actions: Array<{
      id: number
      name: string
      points: number
      requires_attendance: boolean
      participation_types: string[]
    }>
    custom_actions: Array<{
      id: number
      name: string
      points: number
      requires_attendance: boolean
      participation_types: string[]
    }>
  }>({
    composite_actions: [],
    department_actions: [],
    member_actions: [],
    custom_actions: [],
  })

  const [newEventStep, setNewEventStep] = useState(1)
  const [newEventForm, setNewEventForm] = useState<NewEventForm>({
    action_id: "",
    action_category: "",
    department_id: "",
    event_title: "",
    event_date: "",
    event_end_date: "",
    date_type: "single",
    attendants_link: null, // Google Sheets link
    attendants_file: null, // Uploaded file
    attendants_source: null, // Which source user chose
    attendants_validated: false,
    organizers: [],
    custom_points_awarded: "",
    custom_points_date: new Date().toISOString().split("T")[0],
    selected_member_id: "",
    event_selection_type: "new",
    selected_existing_event_id: "",
    member_selection_type: "single",
    member_search_query: "",
    show_add_member_form: false,
    selected_existing_member: null,
    // Initialized renamed new_member fields
    new_member_name: "",
    new_member_email: "",
    new_member_phone: "",
    new_member_uni_id: "",
    new_member_organizer_type: "volunteer",
    new_member_gender: "",
    validation_error: "",
    validating: false,
    bonus: "0",
    discount: "0",
  })
  

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load departments from API
      const deptResponse = await fetch(`${BaseUrl}/departments`)
      if (!deptResponse.ok) {
        throw new Error("Failed to fetch departments")
      }
      const deptData = await deptResponse.json()
      setDepartments(deptData)

      // Load members from API
      const memberResponse = await fetch(`${BaseUrl}/members`)
      if (!memberResponse.ok) {
        throw new Error("Failed to fetch members")
      }
      const memberData = await memberResponse.json()
      setMembers(memberData)

      // Load actions
      const response = await fetch(`${BaseUrl}/actions`)
      if (!response.ok) {
        throw new Error("Failed to fetch actions")
      }

      const apiData: ApiActionsResponse = await response.json()

      // Load contributor actions
      const contributorResponse = await fetch(`${BaseUrl}/actions/contributers`)
      if (!contributorResponse.ok) {
        throw new Error("Failed to fetch contributor actions")
      }
      const contributorData = await contributorResponse.json()
      setContributorActions(contributorData)

      // Load existing events
      const eventsResponse = await fetch(`${BaseUrl}/events`)
      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch existing events")
      }
      const eventsData: Array<{id: number, name: string}> = await eventsResponse.json()
      setExistingEvents(eventsData)

      const transformedActions = {
        composite_actions: apiData["composite action"]
          .filter(([displayAction, submissionAction]) => 
            !HIDDEN_ACTION_IDS.composite_actions.includes(displayAction.id)
          )
          .map(([displayAction, submissionAction]) => ({
            id: displayAction.id,
            name: displayAction["action description"],
            points: displayAction.points,
            requires_attendance: true,
            participation_types: ["Participant"],
            member_action_id: submissionAction.id, // Store the submission action ID
            member_points: submissionAction.points, // Store the member action points
          })),
        department_actions: apiData["department action"]
          .filter((action) => !HIDDEN_ACTION_IDS.department_actions.includes(action.id))
          .map((action) => ({
            id: action.id,
            name: action["action description"],
            points: action.points,
            requires_attendance: false,
            participation_types: ["Participant"],
          })),
        member_actions: apiData["member action"]
          .filter((action) => !HIDDEN_ACTION_IDS.member_actions.includes(action.id))
          .map((action) => ({
            id: action.id,
            name: action["action description"],
            points: action.points,
            requires_attendance: true,
            participation_types: ["Participant"],
          })),
        custom_actions: apiData["custom action"]
          .filter((action) => !HIDDEN_ACTION_IDS.custom_actions.includes(action.id))
          .map((action) => ({
            id: action.id,
            name: action["action description"],
            points: action.points,
            requires_attendance: false,
            participation_types: ["Participant"],
          })),
      }

      setActions(transformedActions)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load data from server",
        variant: "destructive",
      })

      setActions({
        composite_actions: [],
        department_actions: [],
        member_actions: [],
        custom_actions: [],
      })
    } finally {
      setLoading(false)
    }
  }



  const getSelectedAction = () => {
    const allActions = [...actions.composite_actions, ...actions.department_actions, ...actions.member_actions]
    return allActions.find((action) => action.id.toString() === newEventForm.action_id)
  }

  const getMaxSteps = () => {
    switch (newEventForm.action_category) {
      case "composite":
        return 6 // Added summary step
      case "department":
        return 4 // Added summary step
      case "member":
        return 4 // Added summary step
      case "custom_member":
      case "custom_department":
        return 4 // Added summary step
      default:
        return 5
    }
  }

  const isEventNameTaken = (eventTitle: string): boolean => {
    if (!eventTitle.trim()) return false
    return existingEvents.some(event => 
      event.name.toLowerCase().trim() === eventTitle.toLowerCase().trim()
    )
  }

  const handleActionSelect = (actionId: string, category: "composite" | "department" | "member") => {
    setNewEventForm({
      ...newEventForm,
      action_id: actionId,
      action_category: category,
    })
  }

  // Helper function to auto-add members for department actions with single day events
  const handleDepartmentSelect = (departmentId: string) => {
    setNewEventForm(prev => ({ 
      ...prev, 
      department_id: departmentId 
    }))

    // Auto-add all members from the department if it's a single day event
    if (newEventForm.action_category === "department" && 
        newEventForm.event_date && 
        (newEventForm.date_type === "single" || 
         (newEventForm.date_type === "range" && newEventForm.event_date === newEventForm.event_end_date))) {
      
      const departmentMembers = members.filter(member => 
        member.department_id?.toString() === departmentId
      )
      
      const autoOrganizers = departmentMembers.map(member => ({
        name: member.name,
        email: member.email,
        phone_number: member.phone_number || "",
        uni_id: member.uni_id,
        participation_action_id: contributorActions[0]?.id?.toString() || "",
        gender: member.gender as "Male" | "Female",
        attendance: ["present"] // Auto-set to present for single day
      }))

      setNewEventForm(prev => ({
        ...prev,
        organizers: autoOrganizers
      }))

      if (departmentMembers.length > 0) {
        toast({
          title: "Members Auto-Added",
          description: `${departmentMembers.length} members from the selected department have been automatically added with "present" attendance for this single-day event.`,
        })
      }
    }
  }

  // Function to fetch existing events from the API
  const fetchExistingEvents = async () => {
    try {
      const eventsResponse = await fetch(`${BaseUrl}/events`)
      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch existing events")
      }
      const eventsData: Array<{id: number, name: string}> = await eventsResponse.json()
      setExistingEvents(eventsData)
    } catch (error) {
      console.error("Error fetching existing events:", error)
      toast({
        title: "Error",
        description: "Failed to fetch existing events. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCustomPointsSelect = async (category: "custom_member" | "custom_department") => {
    setNewEventForm({
      ...newEventForm,
      action_id: "custom",
      action_category: category,
      event_selection_type: "new", // Default to "new" for both custom member and department
    })

    // Refresh existing events when Custom Department Points is selected
    if (category === "custom_department") {
      await fetchExistingEvents()
    }
  }

  // Helper to get event days as array of dates
  const getEventDays = () => {
    const start = new Date(newEventForm.event_date)
    const end = newEventForm.date_type === "range" ? new Date(newEventForm.event_end_date) : start
    const days = []
    let current = new Date(start)
    while (current <= end) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const getFilteredMembers = () => {
    if (!newEventForm.member_search_query) {
      return members
    }
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(newEventForm.member_search_query.toLowerCase()) ||
        member.email.toLowerCase().includes(newEventForm.member_search_query.toLowerCase()) ||
        (member.uni_id?.toLowerCase?.() || null).includes(newEventForm.member_search_query.toLowerCase())
    )
  }

  const validateGoogleSheetsLink = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      const isGoogleSheets = urlObj.hostname === "docs.google.com" && urlObj.pathname.includes("/spreadsheets/")
      const hasOutputCsv = urlObj.searchParams.get("output") === "csv"
      return isGoogleSheets && hasOutputCsv
    } catch {
      return false
    }
  }

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize
  }

  const handleValidation = async () => {
    // Reset validation state
    setNewEventForm(prev => ({ ...prev, validating: true, validation_error: "" }))

    try {
      const formData = new FormData()
      
      // Add event dates - ensure we have valid dates
      const startDate = newEventForm.event_date ? new Date(newEventForm.event_date) : new Date()
      const endDate = newEventForm.date_type === "single" 
        ? startDate 
        : newEventForm.event_end_date 
          ? new Date(newEventForm.event_end_date) 
          : startDate
      
      formData.append('start date', startDate.toISOString())
      formData.append('end date', endDate.toISOString())
      
      console.log("Validation dates:", {
        "start date": startDate.toISOString(),
        "end date": endDate.toISOString(),
        event_date: newEventForm.event_date,
        event_end_date: newEventForm.event_end_date,
        date_type: newEventForm.date_type
      })
      
      // Add either URL or file based on user choice
      if (newEventForm.attendants_source === "link") {
        if (!newEventForm.attendants_link?.trim()) {
          setNewEventForm(prev => ({ ...prev, validation_error: "Please enter a link", validating: false }))
          return
        }
        if (!validateGoogleSheetsLink(newEventForm.attendants_link)) {
          setNewEventForm(prev => ({ 
            ...prev, 
            validation_error: "Please enter a valid Google Sheets link with output=csv parameter", 
            validating: false 
          }))
          return
        }
        formData.append('url', newEventForm.attendants_link)
      } else if (newEventForm.attendants_source === "file") {
        if (!newEventForm.attendants_file) {
          setNewEventForm(prev => ({ ...prev, validation_error: "Please select a file", validating: false }))
          return
        }
        if (!validateFile(newEventForm.attendants_file)) {
          setNewEventForm(prev => ({ 
            ...prev, 
            validation_error: "Please select a valid CSV or Excel file (max 5MB)", 
            validating: false 
          }))
          return
        }
        formData.append('file', newEventForm.attendants_file)
      }

      const response = await fetch(`${BaseUrl}/validate/sheet`, {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        setNewEventForm(prev => ({
          ...prev,
          attendants_validated: true,
          validating: false,
          validation_error: "",
        }))
        toast({
          title: "Success",
          description: `${newEventForm.attendants_source === "link" ? "Google Sheets link" : "File"} validated successfully`,
        })
      } else {
        let errorMessage = "Validation failed"
        
        try {
          const errorData = await response.json()
          console.log("Validation error response:", errorData)
          
          if (response.status === 422) {
            // Handle 422 validation errors
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const errors = errorData.detail.map((err: any) => {
                const location = Array.isArray(err.loc) ? err.loc.join(' -> ') : 'Unknown field'
                return `${location}: ${err.msg || 'Validation error'}`
              }).join('\n')
              errorMessage = `Validation errors:\n${errors}`
            } else {
              errorMessage = "Validation failed: Invalid request format"
            }
          } else if (response.status === 400) {
            // Handle 400 errors - format: {detail: {error: str, details: str | list | str[]}}
            if (errorData.detail?.error && errorData.detail?.details) {
              const details = Array.isArray(errorData.detail.details) 
                ? errorData.detail.details.join(', ')
                : errorData.detail.details
              errorMessage = `${errorData.detail.error}: ${details}`
            } else if (errorData.detail?.error) {
              errorMessage = errorData.detail.error
            } else {
              errorMessage = "Bad request"
            }
          } else {
            // Handle other error formats
            if (errorData.detail?.error && errorData.detail?.details) {
              errorMessage = `${errorData.detail.error}: ${errorData.detail.details}`
            } else if (errorData.detail) {
              errorMessage = typeof errorData.detail === 'string' 
                ? errorData.detail 
                : JSON.stringify(errorData.detail)
            } else if (errorData.message) {
              errorMessage = errorData.message
            } else {
              errorMessage = `Validation failed (Status: ${response.status})`
            }
          }
        } catch (parseError) {
          console.error("Error parsing validation response:", parseError)
          errorMessage = `Validation failed (Status: ${response.status})`
        }
        
        setNewEventForm(prev => ({
          ...prev,
          validating: false,
          validation_error: errorMessage,
        }))
      }
    } catch (error) {
      console.error("Validation error:", error)
      setNewEventForm(prev => ({
        ...prev,
        validating: false,
        validation_error: "Network error occurred during validation",
      }))
    }
  }

  // Helper function to create FormData from composite event data
  const createCompositeFormData = (eventData: any) => {
    const formData = new FormData();
    
    // Add scalar fields as strings
    formData.append('action', eventData.action);
    formData.append('event_info', JSON.stringify(eventData.event_info));
    formData.append('department_id', eventData.department_id.toString());
    formData.append('department_action_id', eventData.department_action_id.toString());
    formData.append('member_action_id', eventData.member_action_id.toString());
    formData.append('bonus', eventData.bonus.toString());
    formData.append('discount', eventData.discount.toString());
    formData.append('organizers', JSON.stringify(eventData.organizers));
    
    // Add either members link or members file based on user choice
    if (newEventForm.attendants_source === "link" && newEventForm.attendants_link) {
      formData.append('members link', newEventForm.attendants_link);
    } else if (newEventForm.attendants_source === "file" && newEventForm.attendants_file) {
      formData.append('members_file', newEventForm.attendants_file);
    }
    
    // Log FormData contents for debugging
    console.log("FormData contents:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    return formData;
  };

  const handleNewEventSubmit = async () => {
    setSubmitting(true)
    try {
      const baseEventData = {
        event_info: {
          event_title: newEventForm.event_title,
          start_date: newEventForm.event_date ? new Date(newEventForm.event_date).toISOString() : new Date().toISOString(),
          end_date: newEventForm.date_type === "single" 
            ? (newEventForm.event_date ? new Date(newEventForm.event_date).toISOString() : new Date().toISOString())
            : (newEventForm.event_end_date ? new Date(newEventForm.event_end_date).toISOString() : new Date().toISOString()),
        },
        bonus: parseInt(newEventForm.bonus) || 0,
        discount: parseInt(newEventForm.discount) || 0,
      }

      let eventData;
      let endpoint;
      let useFormData = false;

      switch (newEventForm.action_category) {
        case "composite":
          const selectedCompositeAction = actions.composite_actions.find(action => action.id.toString() === newEventForm.action_id)
          if (!selectedCompositeAction) {
            throw new Error("Selected composite action not found")
          }
          eventData = {
            ...baseEventData,
            action: "composite",
            department_action_id: selectedCompositeAction.id,
            member_action_id: selectedCompositeAction.member_action_id,
            department_id: parseInt(newEventForm.department_id),
            organizers: newEventForm.organizers.length > 0 ? newEventForm.organizers : []
          }
          endpoint = `${BaseUrl}/events/composite`
          useFormData = true;
          break;
        
        case "department":
          eventData = {
            action: "department",
            event_info: baseEventData.event_info,
            department_id: parseInt(newEventForm.department_id),
            organizers: newEventForm.organizers.length > 0 ? newEventForm.organizers : [],
            action_id: parseInt(newEventForm.action_id),
            bonus: baseEventData.bonus,
            discount: baseEventData.discount,
          }
          endpoint = `${BaseUrl}/events/departments`
          break;

        case "member":
          // Transform organizers to members format
          const membersData = newEventForm.organizers.map(organizer => ({
            id: parseInt(organizer.uni_id) || 0, // Use uni_id as id or 0 if not a number
            name: organizer.name,
            email: organizer.email,
            "phone number": organizer.phone_number,
            uni_id: organizer.uni_id,
            gender: organizer.gender
          }))

          eventData = {
            event_info: {
              event_title: newEventForm.event_title,
              start_date: new Date(newEventForm.event_date).toISOString(),
              end_date: new Date(newEventForm.date_type === "single" ? newEventForm.event_date : newEventForm.event_end_date).toISOString()
            },
            members: membersData,
            bonus: parseInt(newEventForm.bonus) || 0,
            discount: parseInt(newEventForm.discount) || 0,
            action_id: parseInt(newEventForm.action_id)
          }
          endpoint = `${BaseUrl}/events/members`
          break;

        case "custom_member":
          // Find the "Bonus" action ID
          const bonusAction = actions.custom_actions?.find(action => 
            action.name === "Bonus" || action.name.toLowerCase().includes("bonus")
          );
          
          // Transform organizers to Members format
          const customMembersData = newEventForm.organizers.map(organizer => ({
            name: organizer.name,
            email: organizer.email,
            phone_number: organizer.phone_number,
            uni_id: organizer.uni_id,
            gender: organizer.gender
          }));

          // Create event info for new event
          const eventInfo = {
            event_title: newEventForm.event_title,
            start_date: new Date(newEventForm.event_date).toISOString(),
            end_date: new Date(newEventForm.event_date).toISOString()
          };

          eventData = {
            event_info: eventInfo,
            bonus: parseInt(newEventForm.bonus) || 0,
            members: customMembersData,
            action_id: bonusAction?.id || 1 // fallback to 1 if bonus action not found
          }
          endpoint = `${BaseUrl}/events/custom/members`
          break;

        case "custom_department":
          // Find the "Bonus" action ID from custom actions
          const bonusActionDept = actions.custom_actions?.find(action => 
            action.name === "Bonus" || action.name.toLowerCase().includes("bonus")
          );
          
          // Determine event_info based on selection type
          let customDeptEventInfo;
          if (newEventForm.event_selection_type === "existing" && newEventForm.selected_existing_event_id) {
            // Find the selected event and use its name as string
            const selectedEvent = existingEvents.find(event => event.id.toString() === newEventForm.selected_existing_event_id);
            customDeptEventInfo = selectedEvent?.name || "Unknown Event";
          } else {
            // Create new event info object
            customDeptEventInfo = {
              event_title: newEventForm.event_title,
              start_date: new Date(newEventForm.event_date).toISOString(),
              end_date: new Date(newEventForm.event_date).toISOString()
            };
          }
          
          eventData = {
            event_info: customDeptEventInfo,
            department_id: parseInt(newEventForm.department_id),
            bonus: parseInt(newEventForm.custom_points_awarded) || 0,
            action_id: bonusActionDept?.id || 1 // fallback to 1 if bonus action not found
          }
          endpoint = `${BaseUrl}/events/custom/departments`
          break;

        default:
          throw new Error("Invalid action category")
      }
      
      console.log("Submitting event data...", JSON.stringify(eventData, null, 2))
      
      // Prepare request options based on whether we're using FormData or JSON
      let requestOptions;
      if (useFormData) {
        const formData = createCompositeFormData(eventData);
        requestOptions = {
          method: 'POST',
          body: formData,
        };
        console.log("Using FormData for composite action");
      } else {
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        };
      }
      
      const response = await fetch(endpoint, requestOptions);

      if (response.status === 201) {
        const responseData = await response.json();
        console.log(responseData);

        // Show success state
        setEventCreated(true)
      } else if (response.status >= 400) {
        const errorData = await response.json();
        console.log("Error response:", errorData);
        
        toast({
          title: "Error",
          description: "Something went wrong while creating the event. Please try again.",
          variant: "destructive",
        })
      } else {
        throw new Error("Unexpected response status")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Something went wrong while creating the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (eventCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        {/* Header */}
        <header className="border-b border-border bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary">Event Created Successfully</h1>
                <p className="text-sm text-muted-foreground">Your event has been created and points have been awarded</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-green-700">Event Created Successfully!</h2>
                  <p className="text-green-600">
                    Your event "{newEventForm.event_title}" has been created and all points have been awarded to the respective participants.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200 w-full">
                  <h3 className="font-semibold text-green-700 mb-2">Event Summary:</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Title:</span> {newEventForm.event_title}</p>
                    <p><span className="font-medium">Type:</span> {newEventForm.action_category?.replace('_', ' ')}</p>
                    <p><span className="font-medium">Date:</span> {
                      newEventForm.date_type === "single" 
                        ? new Date(newEventForm.event_date).toLocaleDateString()
                        : `${new Date(newEventForm.event_date).toLocaleDateString()} - ${new Date(newEventForm.event_end_date).toLocaleDateString()}`
                    }</p>
                    {newEventForm.action_category === "composite" && (
                      <p><span className="font-medium">Department:</span> {departments.find(d => d.id.toString() === newEventForm.department_id)?.name}</p>
                    )}
                    {(newEventForm.action_category === "member" || newEventForm.action_category === "custom_member") && (
                      <p><span className="font-medium">Members:</span> {newEventForm.organizers.length} participant(s)</p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => router.push('/')}
                  className="bg-primary hover:bg-primary/90 min-w-[200px]"
                  size="lg"
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const maxSteps = getMaxSteps()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-heading font-bold text-primary">Add New Event</h1>
              <p className="text-sm text-muted-foreground">Step-by-step wizard to create a new event</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-primary">
                <Plus className="h-5 w-5" />
                Add New Event
              </CardTitle>
              <CardDescription>Step-by-step wizard to create a new event</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                {Array.from({ length: maxSteps }, (_, i) => i + 1).map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === newEventStep
                        ? "bg-primary text-white"
                        : step < newEventStep
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {newEventStep === 1 && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step 1: Choose Action Type</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button
                      variant="outline"
                      className={`custom-action-button h-16 justify-start gap-4 border-2 transition-all duration-300 relative overflow-hidden group ${
                        newEventForm.action_category === "custom_member" 
                          ? "border-primary bg-primary/10 shadow-lg" 
                          : "border-gray-200 hover:border-amber-400 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:shadow-lg"
                      }`}
                      onClick={() => handleCustomPointsSelect("custom_member")}
                    >
                      <div className={`p-2 rounded-full transition-all duration-300 ${
                        newEventForm.action_category === "custom_member" 
                          ? "bg-primary text-white" 
                          : "bg-amber-100 text-amber-600 group-hover:bg-amber-200 group-hover:scale-110"
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-base">Custom Member Points</div>
                        <div className="text-xs text-muted-foreground">Award custom points to individual members</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className={`custom-action-button h-16 justify-start gap-4 border-2 transition-all duration-300 relative overflow-hidden group ${
                        newEventForm.action_category === "custom_department" 
                          ? "border-primary bg-primary/10 shadow-lg" 
                          : "border-gray-200 hover:border-emerald-400 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:shadow-lg"
                      }`}
                      onClick={() => handleCustomPointsSelect("custom_department")}
                    >
                      <div className={`p-2 rounded-full transition-all duration-300 ${
                        newEventForm.action_category === "custom_department" 
                          ? "bg-primary text-white" 
                          : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 group-hover:scale-110"
                      }`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-base">Custom Department Points</div>
                        <div className="text-xs text-muted-foreground">Award custom points to entire department</div>
                      </div>
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or choose existing action</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Composite Actions */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px bg-gradient-to-r from-blue-500 to-purple-500 flex-1"></div>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          COMPOSITE ACTIONS
                        </span>
                        <div className="h-px bg-gradient-to-r from-purple-500 to-blue-500 flex-1"></div>
                      </div>
                      <div className="space-y-1">
                        {actions.composite_actions.map((action) => (
                          <button
                            key={action.id}
                            className={`custom-action-button w-full p-3 rounded-lg border text-left transition-all duration-300 hover:shadow-md ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                            }`}
                            onClick={() => handleActionSelect(action.id.toString(), "composite")}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{action.name}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                {action.points} pts
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Department Actions */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px bg-gradient-to-r from-green-500 to-emerald-500 flex-1"></div>
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          DEPARTMENT ACTIONS
                        </span>
                        <div className="h-px bg-gradient-to-r from-emerald-500 to-green-500 flex-1"></div>
                      </div>
                      <div className="space-y-1">
                        {actions.department_actions.map((action) => (
                          <button
                            key={action.id}
                            className={`custom-action-button w-full p-3 rounded-lg border text-left transition-all duration-300 hover:shadow-md ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                            }`}
                            onClick={() => handleActionSelect(action.id.toString(), "department")}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{action.name}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                {action.points} pts
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Member Actions */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px bg-gradient-to-r from-orange-500 to-red-500 flex-1"></div>
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                          MEMBER ACTIONS
                        </span>
                        <div className="h-px bg-gradient-to-r from-red-500 to-orange-500 flex-1"></div>
                      </div>
                      <div className="space-y-1">
                        {actions.member_actions.map((action) => (
                          <button
                            key={action.id}
                            className={`custom-action-button w-full p-3 rounded-lg border text-left transition-all duration-300 hover:shadow-md ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-gray-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50"
                            }`}
                            onClick={() => handleActionSelect(action.id.toString(), "member")}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{action.name}</span>
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                                {action.points} pts
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {newEventStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Step 2: Event Details</h3>



                  {newEventForm.action_category === "custom_member" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Title *</Label>
                        <Input
                          placeholder="Enter event title"
                          value={newEventForm.event_title}
                          onChange={(e) => setNewEventForm({ ...newEventForm, event_title: e.target.value })}
                          className={`enhanced-input ${isEventNameTaken(newEventForm.event_title) ? 'border-red-500' : ''}`}
                        />
                        {isEventNameTaken(newEventForm.event_title) && (
                          <p className="text-sm text-red-500">Event Already exists</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Event Date *</Label>
                        <Input
                          type="date"
                          value={newEventForm.event_date}
                          onChange={(e) => setNewEventForm({ ...newEventForm, event_date: e.target.value, event_end_date: e.target.value, date_type: "single" })}
                          className="enhanced-input"
                        />
                      </div>
                    </div>
                  )}

                  {newEventForm.action_category === "custom_department" && (
                    <div className="space-y-4">
                      {/* Event Selection Type for custom department */}
                      <div className="space-y-3">
                        <Label>Event Type *</Label>
                        <RadioGroup
                          value={newEventForm.event_selection_type}
                          onValueChange={(value: "new" | "existing") =>
                            setNewEventForm({ 
                              ...newEventForm, 
                              event_selection_type: value,
                              // Clear fields based on selection
                              selected_existing_event_id: value === "new" ? "" : newEventForm.selected_existing_event_id,
                              event_title: value === "existing" ? "" : newEventForm.event_title,
                              event_date: value === "existing" ? "" : newEventForm.event_date,
                              event_end_date: value === "existing" ? "" : newEventForm.event_end_date,
                            })
                          }
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="new-event-custom-dept" />
                            <Label htmlFor="new-event-custom-dept" className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create New Event
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="existing" id="existing-event-custom-dept" />
                            <Label htmlFor="existing-event-custom-dept" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Use Existing Event
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Existing Event Selection */}
                      {newEventForm.event_selection_type === "existing" && (
                        <div className="space-y-2">
                          <Label>Select Existing Event *</Label>
                          <Select
                            value={newEventForm.selected_existing_event_id}
                            onValueChange={(value) => setNewEventForm({ ...newEventForm, selected_existing_event_id: value })}
                          >
                            <SelectTrigger className="enhanced-input">
                              <SelectValue placeholder="Choose an existing event" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingEvents.map((event) => (
                                <SelectItem key={event.id} value={event.id.toString()}>
                                  {event.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* New Event Fields */}
                      {newEventForm.event_selection_type === "new" && (
                        <>
                          <div className="space-y-2">
                            <Label>Event Title *</Label>
                            <Input
                              placeholder="Enter event title"
                              value={newEventForm.event_title}
                              onChange={(e) => setNewEventForm({ ...newEventForm, event_title: e.target.value })}
                              className={`enhanced-input ${isEventNameTaken(newEventForm.event_title) ? 'border-red-500' : ''}`}
                            />
                            {isEventNameTaken(newEventForm.event_title) && (
                              <p className="text-sm text-red-500">Event Already exists</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Event Date *</Label>
                            <Input
                              type="date"
                              value={newEventForm.event_date}
                              onChange={(e) => setNewEventForm({ ...newEventForm, event_date: e.target.value, event_end_date: e.target.value, date_type: "single" })}
                              className="enhanced-input"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {(newEventForm.event_selection_type === "new" ||
                    (newEventForm.action_category !== "custom_member" &&
                      newEventForm.action_category !== "custom_department")) && 
                    newEventForm.action_category !== "custom_member" && 
                    newEventForm.action_category !== "custom_department" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Title *</Label>
                        <Input
                          placeholder="Enter event title"
                          value={newEventForm.event_title}
                          onChange={(e) => setNewEventForm({ ...newEventForm, event_title: e.target.value })}
                          className={`enhanced-input ${isEventNameTaken(newEventForm.event_title) ? 'border-red-500' : ''}`}
                        />
                        {isEventNameTaken(newEventForm.event_title) && (
                          <p className="text-sm text-red-500">Event Already exists</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bonus Points</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter bonus points"
                            value={newEventForm.bonus}
                            onChange={(e) => setNewEventForm({ ...newEventForm, bonus: e.target.value })}
                            className="enhanced-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Discount Points</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter discount points"
                            value={newEventForm.discount}
                            onChange={(e) => setNewEventForm({ ...newEventForm, discount: e.target.value })}
                            className="enhanced-input"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Event Date *</Label>
                        <RadioGroup
                          value={newEventForm.date_type}
                          onValueChange={(value: "single" | "range") =>
                            setNewEventForm({ ...newEventForm, date_type: value })
                          }
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="single" id="single" />
                            <Label htmlFor="single" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Single Day
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="range" id="range" />
                            <Label htmlFor="range" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Multiple Days
                            </Label>
                          </div>
                        </RadioGroup>

                        {newEventForm.date_type === "single" ? (
                          <Input
                            type="date"
                            value={newEventForm.event_date}
                            onChange={(e) => setNewEventForm({ ...newEventForm, event_date: e.target.value })}
                            className="enhanced-input"
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input
                                type="date"
                                value={newEventForm.event_date}
                                onChange={(e) => {
                                  const startDate = new Date(e.target.value)
                                  const maxEndDate = new Date(startDate)
                                  maxEndDate.setDate(maxEndDate.getDate() + 30)
                                  
                                  let endDate = newEventForm.event_end_date
                                  if (newEventForm.event_end_date && new Date(newEventForm.event_end_date) > maxEndDate) {
                                    endDate = maxEndDate.toISOString().split('T')[0]
                                  }
                                  
                                  setNewEventForm({ 
                                    ...newEventForm, 
                                    event_date: e.target.value,
                                    event_end_date: endDate
                                  })
                                }}
                                className="enhanced-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={newEventForm.event_end_date}
                                min={newEventForm.event_date}
                                max={newEventForm.event_date ? (() => {
                                  const maxDate = new Date(newEventForm.event_date)
                                  maxDate.setDate(maxDate.getDate() + 30)
                                  return maxDate.toISOString().split('T')[0]
                                })() : undefined}
                                onChange={(e) => setNewEventForm({ ...newEventForm, event_end_date: e.target.value })}
                                className="enhanced-input"
                              />
                              {newEventForm.event_date && (
                                <p className="text-xs text-muted-foreground">
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {newEventStep === 3 && newEventForm.action_category === "member" && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step 3: Add Members</h3>
                  <OrganizerManager
                    organizers={newEventForm.organizers}
                    onOrganizersChange={(organizers) => setNewEventForm({ ...newEventForm, organizers })}
                    members={members}
                    contributorActions={contributorActions}
                    eventDays={getEventDays()}
                    mode="department"
                    memberSearchQuery={newEventForm.member_search_query}
                    onMemberSearchChange={(query) => setNewEventForm({ ...newEventForm, member_search_query: query })}
                    onAddingMemberStateChange={setIsAddingMember}
                    skipAttendance={getEventDays().length === 1}
                  />
                  {newEventForm.organizers.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-600">At least one member must be selected to create the event.</p>
                    </div>
                  )}
                </div>
              )}

              {newEventStep === 3 && newEventForm.action_category === "custom_member" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Step 3: Award Points to Members</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Points to be awarded *</Label>
                      <Input
                        type="number"
                        placeholder="Enter points value"
                        value={newEventForm.bonus}
                        onChange={(e) => setNewEventForm({ ...newEventForm, bonus: e.target.value })}
                        className="enhanced-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Members *</Label>
                      <OrganizerManager
                        organizers={newEventForm.organizers}
                        onOrganizersChange={(organizers) => setNewEventForm({ ...newEventForm, organizers })}
                        members={members}
                        contributorActions={[]}
                        eventDays={[new Date(newEventForm.event_date || new Date().toISOString().split('T')[0])]}
                        mode="department"
                        memberSearchQuery={newEventForm.member_search_query}
                        onMemberSearchChange={(query) => setNewEventForm({ ...newEventForm, member_search_query: query })}
                        onAddingMemberStateChange={setIsAddingMember}
                        skipAttendance={true}
                      />
                      {newEventForm.organizers.length === 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-600">At least one member must be selected to create the event.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {newEventStep === 3 && newEventForm.action_category === "custom_department" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Step 3: Select Department and Award Points</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select
                        value={newEventForm.department_id}
                        onValueChange={(value) => setNewEventForm({ ...newEventForm, department_id: value })}
                      >
                        <SelectTrigger className="enhanced-select">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points to be awarded *</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter points to be awarded"
                        value={newEventForm.custom_points_awarded}
                        onChange={(e) => setNewEventForm({ ...newEventForm, custom_points_awarded: e.target.value })}
                        className="enhanced-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newEventStep === 3 &&
                newEventForm.action_category === "department" && (
                  <div className="space-y-6">
                    <h3 className="font-medium text-lg">Step 3: Select Department</h3>
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select
                        value={newEventForm.department_id}
                        onValueChange={(value) => handleDepartmentSelect(value)}
                      >
                        <SelectTrigger className="enhanced-select">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Organizer selection UI for department actions */}
                    <OrganizerManager
                      organizers={newEventForm.organizers}
                      onOrganizersChange={(organizers) => setNewEventForm({ ...newEventForm, organizers })}
                      members={members}
                      contributorActions={contributorActions}
                      eventDays={getEventDays()}
                      mode="department"
                      memberSearchQuery={newEventForm.member_search_query}
                      onMemberSearchChange={(query) => setNewEventForm({ ...newEventForm, member_search_query: query })}
                      onAddingMemberStateChange={setIsAddingMember}
                    />
                  </div>
                )}

              {newEventStep === 3 && newEventForm.action_category === "composite" && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step 3: Select Department</h3>
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select
                      value={newEventForm.department_id}
                      onValueChange={(value) => setNewEventForm({ ...newEventForm, department_id: value })}
                    >
                      <SelectTrigger className="enhanced-select">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {newEventStep === 4 && newEventForm.action_category === "composite" && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step 4: Add Members</h3>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Choose how to provide member data *</Label>
                      
                      {/* Source Selection */}
                      <RadioGroup
                        value={newEventForm.attendants_source || ""}
                        onValueChange={(value: "link" | "file") => {
                          setNewEventForm({
                            ...newEventForm,
                            attendants_source: value,
                            attendants_validated: false,
                            validation_error: "",
                            attendants_link: value === "link" ? newEventForm.attendants_link : null,
                            attendants_file: value === "file" ? newEventForm.attendants_file : null,
                          })
                        }}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                          <RadioGroupItem value="link" id="link-option" />
                          <Label htmlFor="link-option" className="cursor-pointer">
                            <div>
                              <div className="font-medium">Google Sheets Link</div>
                              <div className="text-sm text-muted-foreground">Use a shared Google Sheets URL</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                          <RadioGroupItem value="file" id="file-option" />
                          <Label htmlFor="file-option" className="cursor-pointer">
                            <div>
                              <div className="font-medium">Upload File</div>
                              <div className="text-sm text-muted-foreground">Upload CSV or Excel file</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* Google Sheets Link Input */}
                      {newEventForm.attendants_source === "link" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            <Label>Google Sheets URL *</Label>
                            <Input
                              type="url"
                              placeholder="https://docs.google.com/spreadsheets/d/.../edit?output=csv"
                              value={newEventForm.attendants_link || ""}
                              onChange={(e) =>
                                setNewEventForm({
                                  ...newEventForm,
                                  attendants_link: e.target.value,
                                  attendants_validated: false,
                                  validation_error: "",
                                })
                              }
                              disabled={newEventForm.validating}
                              className="enhanced-input"
                            />
                            <p className="text-xs text-muted-foreground">
                              Make sure the link includes the "output=csv" parameter and the sheet is publicly accessible
                            </p>
                          </div>
                        </div>
                      )}

                      {/* File Upload Input */}
                      {newEventForm.attendants_source === "file" && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            <Label>Upload Members File *</Label>
                            <Input
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null
                                setNewEventForm({
                                  ...newEventForm,
                                  attendants_file: file,
                                  attendants_validated: false,
                                  validation_error: "",
                                })
                              }}
                              disabled={newEventForm.validating}
                              className="enhanced-input"
                            />
                            <p className="text-xs text-muted-foreground">
                              Accepted formats: CSV, Excel (.xlsx, .xls). Max size: 5MB
                            </p>
                            {newEventForm.attendants_file && (
                              <div className="text-sm text-green-600">
                                Selected: {newEventForm.attendants_file.name} ({Math.round(newEventForm.attendants_file.size / 1024)} KB)
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Validation Button */}
                      {newEventForm.attendants_source && (
                        <div className="space-y-4">
                          <Button
                            type="button"
                            onClick={handleValidation}
                            disabled={
                              newEventForm.validating ||
                              (newEventForm.attendants_source === "link" && !newEventForm.attendants_link?.trim()) ||
                              (newEventForm.attendants_source === "file" && !newEventForm.attendants_file)
                            }
                            className="w-full"
                            variant={newEventForm.attendants_validated ? "outline" : "default"}
                          >
                            {newEventForm.validating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Validating...
                              </>
                            ) : newEventForm.attendants_validated ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Re-validate
                              </>
                            ) : (
                              `Validate ${newEventForm.attendants_source === "link" ? "Link" : "File"}`
                            )}
                          </Button>

                          {/* Validation Status */}
                          {newEventForm.attendants_validated && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center text-green-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">
                                  {newEventForm.attendants_source === "link" ? "Google Sheets link" : "File"} validated successfully
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Validation Error */}
                          {newEventForm.validation_error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-red-700">Validation Failed</p>
                                  <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{newEventForm.validation_error}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions */}
                      {!newEventForm.attendants_source && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700">
                            Please choose how you want to provide the member data. You can either upload a file or provide a Google Sheets link.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {newEventStep === 5 && newEventForm.action_category === "composite" && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step 5: Add Organizers</h3>
                  <OrganizerManager
                    mode="composite"
                    organizers={newEventForm.organizers}
                    onOrganizersChange={(updatedOrganizers) => setNewEventForm({ ...newEventForm, organizers: updatedOrganizers })}
                    members={members}
                    contributorActions={contributorActions}
                    eventDays={getEventDays()}
                    memberSearchQuery={newEventForm.member_search_query}
                    onMemberSearchChange={(query) => setNewEventForm({ ...newEventForm, member_search_query: query })}
                    onAddingMemberStateChange={setIsAddingMember}
                  />
                </div>
              )}

              {/* Summary Step - Final step for all action types */}
              {newEventStep === maxSteps && (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Step {maxSteps}: Review & Confirm</h3>
                  
                  <div className="bg-muted/30 p-6 rounded-lg space-y-4">
                    <h4 className="font-semibold text-primary">Event Summary</h4>
                    
                    {/* Basic Event Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Event Title</Label>
                        <p className="font-medium">{newEventForm.event_title}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Action Type</Label>
                        <p className="font-medium capitalize">{newEventForm.action_category?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Event Date</Label>
                        <p className="font-medium">
                          {newEventForm.date_type === "single" 
                            ? new Date(newEventForm.event_date).toLocaleDateString()
                            : `${new Date(newEventForm.event_date).toLocaleDateString()} - ${new Date(newEventForm.event_end_date).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                      {(newEventForm.bonus !== "0" || newEventForm.discount !== "0") && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Bonus/Discount</Label>
                          <p className="font-medium">
                            {newEventForm.bonus !== "0" && `+${newEventForm.bonus} bonus`}
                            {newEventForm.bonus !== "0" && newEventForm.discount !== "0" && ", "}
                            {newEventForm.discount !== "0" && `-${newEventForm.discount} discount`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action-specific information */}
                    {newEventForm.action_category === "composite" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Selected Action</Label>
                          <p className="font-medium">{getSelectedAction()?.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                          <p className="font-medium">
                            {departments.find(d => d.id.toString() === newEventForm.department_id)?.name || "Not selected"}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Department Points</Label>
                            <p className="font-medium text-green-600">
                              +{getSelectedAction()?.points || 0} points
                              {parseInt(newEventForm.bonus) > 0 && ` (+${newEventForm.bonus} bonus)`}
                              {parseInt(newEventForm.discount) > 0 && ` (-${newEventForm.discount} discount)`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Member Points (Each)</Label>
                            <p className="font-medium text-blue-600">
                              +{(() => {
                                // Find the selected composite action and get member points directly
                                const selectedComposite = actions.composite_actions.find(action => 
                                  action.id.toString() === newEventForm.action_id
                                );
                                return selectedComposite?.member_points || 0;
                              })()} points
                              {parseInt(newEventForm.bonus) > 0 && ` (+${newEventForm.bonus} bonus)`}
                              {parseInt(newEventForm.discount) > 0 && ` (-${newEventForm.discount} discount)`}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Attendants Data Source</Label>
                          <p className="font-medium">
                            {newEventForm.attendants_validated 
                              ? newEventForm.attendants_source === "link" 
                                ? "Google Sheets Link (Validated)" 
                                : `File: ${newEventForm.attendants_file?.name} (Validated)`
                              : "Not provided"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Organizers</Label>
                          <p className="font-medium">{newEventForm.organizers.length} organizer(s) added</p>
                        </div>
                      </div>
                    )}

                    {newEventForm.action_category === "department" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Selected Action</Label>
                          <p className="font-medium">{getSelectedAction()?.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Points per Member</Label>
                          <p className="font-semibold text-blue-600 text-lg">{getSelectedAction()?.points} points</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                          <p className="font-medium">
                            {departments.find(d => d.id.toString() === newEventForm.department_id)?.name || "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Organizers</Label>
                          <p className="font-medium">{newEventForm.organizers.length} organizer(s) added</p>
                        </div>
                      </div>
                    )}

                    {newEventForm.action_category === "member" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Selected Action</Label>
                          <p className="font-medium">{getSelectedAction()?.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Points per Member</Label>
                          <p className="font-semibold text-blue-600 text-lg">{getSelectedAction()?.points} points</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Members</Label>
                          <p className="font-medium">{newEventForm.organizers.length} member(s) selected</p>
                        </div>
                      </div>
                    )}

                    {newEventForm.action_category === "custom_member" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Points to Award</Label>
                          <p className="font-semibold text-green-600 text-lg">{newEventForm.bonus} points</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Members</Label>
                          <p className="font-medium">{newEventForm.organizers.length} member(s) selected</p>
                        </div>
                      </div>
                    )}

                    {newEventForm.action_category === "custom_department" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                          <p className="font-medium">
                            {departments.find(d => d.id.toString() === newEventForm.department_id)?.name || "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Points to Award</Label>
                          <p className="font-semibold text-green-600 text-lg">{newEventForm.custom_points_awarded} points</p>
                        </div>
                      </div>
                    )}

                    {/* Members/Organizers Details */}
                    {newEventForm.organizers.length > 0 && newEventForm.action_category !== "custom_department" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {newEventForm.action_category === "member" || newEventForm.action_category === "custom_member" 
                            ? "Selected Members" 
                            : "Organizers"}
                        </Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {newEventForm.organizers.map((organizer, index) => (
                            <div key={index} className="text-sm bg-background p-2 rounded border">
                              <span className="font-medium">{organizer.name}</span>
                              <span className="text-muted-foreground ml-2">({organizer.email})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Please review all information carefully.</strong> Once you create the event, 
                      the data will be submitted to the system and points will be awarded accordingly.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewEventStep(Math.max(1, newEventStep - 1))}
                  disabled={newEventStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {newEventStep < maxSteps ? (
                  <Button
                    type="button"
                    onClick={() => setNewEventStep(newEventStep + 1)}
                    disabled={
                      (newEventStep === 1 && !newEventForm.action_id) ||
                      (newEventStep === 2 &&
                        newEventForm.action_category === "custom_member" &&
                        (!newEventForm.event_title || !newEventForm.event_date || isEventNameTaken(newEventForm.event_title))) ||
                      (newEventStep === 2 &&
                        newEventForm.action_category === "custom_department" &&
                        (
                          (newEventForm.event_selection_type === "new" &&
                            (!newEventForm.event_title || !newEventForm.event_date || isEventNameTaken(newEventForm.event_title))) ||
                          (newEventForm.event_selection_type === "existing" &&
                            !newEventForm.selected_existing_event_id)
                        )) ||
                      (newEventStep === 2 &&
                        newEventForm.action_category !== "custom_member" &&
                        newEventForm.action_category !== "custom_department" &&
                        (!newEventForm.event_title ||
                          !newEventForm.event_date ||
                          (newEventForm.date_type === "range" && !newEventForm.event_end_date) ||
                          isEventNameTaken(newEventForm.event_title))) ||
                      (newEventStep === 3 &&
                        newEventForm.action_category === "member" &&
                        newEventForm.organizers.length === 0) ||
                      (newEventForm.member_selection_type === "bulk" && !newEventForm.attendants_validated) || // Updated validation to check validation status
                      (newEventStep === 3 &&
                        (newEventForm.action_category === "composite" ||
                          newEventForm.action_category === "department") &&
                        !newEventForm.department_id) ||
                      (newEventStep === 3 &&
                        newEventForm.action_category === "custom_member" &&
                        (!newEventForm.bonus || parseInt(newEventForm.bonus) <= 0 || newEventForm.organizers.length === 0)) ||
                      (newEventStep === 3 &&
                        newEventForm.action_category === "custom_department" &&
                        (!newEventForm.department_id || !newEventForm.custom_points_awarded || parseInt(newEventForm.custom_points_awarded) <= 0)) ||
                      (newEventStep === 4 &&
                        newEventForm.action_category === "composite" &&
                        !newEventForm.attendants_validated) ||
                      (newEventStep === 3 &&
                        newEventForm.action_category === "member" &&
                        newEventForm.organizers.length === 0) ||
                      (newEventStep === 4 &&
                        newEventForm.action_category === "department" &&
                        !newEventForm.department_id) ||
                      (newEventStep === 5 &&
                        newEventForm.action_category === "composite" &&
                        !newEventForm.attendants_validated) ||
                      isAddingMember
                    }
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNewEventSubmit}
                    disabled={
                      submitting || 
                      isAddingMember || // Disable when user is adding a member
                      (newEventForm.action_category === "composite" && !newEventForm.attendants_validated) ||
                      (newEventForm.action_category === "department" && !newEventForm.department_id) ||
                      ((newEventForm.action_category === "member" || newEventForm.action_category === "custom_member") && newEventForm.organizers.length === 0) ||
                      (newEventForm.action_category === "custom_department" && (!newEventForm.department_id || !newEventForm.custom_points_awarded || parseInt(newEventForm.custom_points_awarded) <= 0))
                    }
                    className="bg-primary hover:bg-primary/90"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create New Event
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  )
}
