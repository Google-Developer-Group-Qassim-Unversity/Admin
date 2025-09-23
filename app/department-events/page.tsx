"use client"
import { useState, useEffect } from "react"
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

const BaseUrl = process.env.NEXT_PUBLIC_DEV_HOST || process.env.NEXT_PUBLIC_HOST || "http://178.128.205.239:7001";
console.log(`Using BaseUrl: \x1b[32m${BaseUrl}\x1b[0m`);

// List of action IDs that should be hidden from the user interface
const HIDDEN_ACTION_IDS = {
  member_actions: [76, 77, 78, 79, 80, 64],
  department_actions: [],
  composite_actions: [],
  custom_actions: []
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
  attendants_link: string | null // Changed from attendants_file to attendants_link
  attendants_link_validated: boolean // Added validation status
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
  show_link_popup: boolean
  link_input: string
  link_validating: boolean
  link_error: string
}

export default function AddNewEventPage() {
  // Local state for new member attendance before adding
  const [newMemberAttendance, setNewMemberAttendance] = useState<string[]>([])
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [existingEventNames, setExistingEventNames] = useState<string[]>([])
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
    attendants_link: null, // Changed from attendants_file
    attendants_link_validated: false,
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
    show_link_popup: false,
    link_input: "",
    link_validating: false,
    link_error: "",
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

      // Load existing event names
      const eventsResponse = await fetch(`${BaseUrl}/events`)
      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch existing events")
      }
      const eventsData: string[] = await eventsResponse.json()
      setExistingEventNames(eventsData)

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
        return 5 // Added organizer step
      case "department":
        return 3
      case "member":
        return 3 // Updated from 2 to 3 to include member selection step
      case "custom_member":
      case "custom_department":
        return 3 // Step 1: Choose type, Step 2: Event details, Step 3: Department/Member + Points
      default:
        return 4
    }
  }

  const isEventNameTaken = (eventTitle: string): boolean => {
    if (!eventTitle.trim()) return false
    return existingEventNames.some(name => 
      name.toLowerCase().trim() === eventTitle.toLowerCase().trim()
    )
  }

  const handleActionSelect = (actionId: string, category: "composite" | "department" | "member") => {
    setNewEventForm({
      ...newEventForm,
      action_id: actionId,
      action_category: category,
    })
  }

  const handleCustomPointsSelect = (category: "custom_member" | "custom_department") => {
    setNewEventForm({
      ...newEventForm,
      action_id: "custom",
      action_category: category,
      event_selection_type: "new", // Always set to "new" since we removed existing event option for custom departments
    })
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

  const handleLinkValidation = async () => {
    if (!newEventForm.link_input.trim()) {
      setNewEventForm({ ...newEventForm, link_error: "Please enter a link" })
      return
    }

    if (!validateGoogleSheetsLink(newEventForm.link_input)) {
      setNewEventForm({
        ...newEventForm,
        link_error: "Please enter a valid Google Sheets link with output=csv parameter",
      })
      return
    }
    setNewEventForm({ ...newEventForm, link_validating: true, link_error: "" })
    try {
      const data = JSON.stringify({ url: newEventForm.link_input, start_date: newEventForm.event_date, end_date:newEventForm.date_type === "single" ? newEventForm.event_date : newEventForm.event_end_date })
        const response = await fetch(`${BaseUrl}/validate/sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data
      })
      console.log(data);
      

      if (response.ok) {
        setNewEventForm({
          ...newEventForm,
          attendants_link: newEventForm.link_input,
          attendants_link_validated: true,
          show_link_popup: false,
          link_input: "",
          link_validating: false,
          link_error: "",
        })
        toast({
          title: "Success",
          description: "Google Sheets link validated successfully",
        })
      } else {
        const errorData = await response.json()
        console.log(errorData);
        
        setNewEventForm({
          ...newEventForm,
          link_validating: false,
          link_error: `${errorData.detail.error}:\n ${errorData.detail.details}`,
        })
      }
    } catch (error) {
      setNewEventForm({
        ...newEventForm,
        link_validating: false,
        link_error: "Network error occurred during validation",
      })
    }
  }

  const closeLinkPopup = () => {
    setNewEventForm({
      ...newEventForm,
      show_link_popup: false,
      link_input: "",
      link_error: "",
      link_validating: false,
    })
  }

  const handleNewEventSubmit = async () => {
    setSubmitting(true)
    try {
      const baseEventData = {
        event_info: {
          event_title: newEventForm.event_title,
          start_date: newEventForm.event_date,
          end_date: newEventForm.date_type === "single" ? newEventForm.event_date : newEventForm.event_end_date,
        },
        bonus: parseInt(newEventForm.bonus) || 0,
        discount: parseInt(newEventForm.discount) || 0,
      }

      let eventData;
      let endpoint;

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
            department_id: newEventForm.department_id,
            members_link: newEventForm.attendants_link,
            Organizers: newEventForm.organizers.length > 0 ? newEventForm.organizers : null
          }
          endpoint = `${BaseUrl}/events/compose`
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
          
          eventData = {
            event_info: {
              event_title: newEventForm.event_title,
              start_date: new Date(newEventForm.event_date).toISOString(),
              end_date: new Date(newEventForm.event_date).toISOString()
            },
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        console.log("Response not ok:", await response.json());
        throw new Error("Failed to create event")
      }

      const responseData = await response.json();
      console.log(responseData);

      toast({
        title: "Success",
        description: "Event created successfully",
      })

      // Reset form
      setNewEventForm({
        action_id: "",
        action_category: "",
        department_id: "",
        event_title: "",
        event_date: "",
        event_end_date: "",
        date_type: "single",
        attendants_link: null, // Changed from attendants_file
        attendants_link_validated: false,
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
        // Reset renamed new_member fields
        new_member_name: "",
        new_member_email: "",
        new_member_phone: "",
        new_member_uni_id: "",
        new_member_organizer_type: "volunteer",
        new_member_gender: "",
        show_link_popup: false,
        link_input: "",
        link_validating: false,
        link_error: "",
        bonus: "0",
        discount: "0",
      })
      setNewEventStep(1)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
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

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <Button
                      variant={newEventForm.action_category === "custom_member" ? "default" : "outline"}
                      className="h-12 justify-start gap-3 border-2 hover:border-primary/50"
                      onClick={() => handleCustomPointsSelect("custom_member")}
                    >
                      <Sparkles className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Add Custom Member Points</div>
                        <div className="text-xs text-muted-foreground">Award points to individual member</div>
                      </div>
                    </Button>
                    <Button
                      variant={newEventForm.action_category === "custom_department" ? "default" : "outline"}
                      className="h-12 justify-start gap-3 border-2 hover:border-primary/50"
                      onClick={() => handleCustomPointsSelect("custom_department")}
                    >
                      <Building2 className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Add Custom Department Points</div>
                        <div className="text-xs text-muted-foreground">Award points to department members</div>
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
                            className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
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
                            className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
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
                            className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                              newEventForm.action_id === action.id.toString()
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
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
                    {/* Composite Actions - Bulk Upload Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Google Sheets Link</Label>
                        {!newEventForm.attendants_link ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewEventForm({ ...newEventForm, show_link_popup: true })}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Link
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">Link validated and ready</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setNewEventForm({
                                  ...newEventForm,
                                  attendants_link: null,
                                  attendants_link_validated: false,
                                })
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Add a Google Sheets link with output=csv parameter containing attendant data
                        </p>
                      </div>
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
                        (!newEventForm.event_title || !newEventForm.event_date || isEventNameTaken(newEventForm.event_title))) ||
                      (newEventStep === 2 &&
                        (newEventForm.event_selection_type === "new" ||
                          (newEventForm.action_category !== "custom_member" &&
                            newEventForm.action_category !== "custom_department")) &&
                        newEventForm.action_category !== "custom_member" &&
                        newEventForm.action_category !== "custom_department" &&
                        (!newEventForm.event_title ||
                          !newEventForm.event_date ||
                          (newEventForm.date_type === "range" && !newEventForm.event_end_date) ||
                          isEventNameTaken(newEventForm.event_title))) ||
                      (newEventStep === 3 &&
                        newEventForm.action_category === "member" &&
                        (newEventForm.member_selection_type || "single") === "single" &&
                        !newEventForm.selected_member_id) ||
                      (newEventForm.member_selection_type === "bulk" && !newEventForm.attendants_link_validated) || // Updated validation to check link validation
                      (newEventStep === 3 &&
                        (newEventForm.action_category === "composite" ||
                          newEventForm.action_category === "department") &&
                        !newEventForm.department_id) ||
                      (newEventStep === 3 &&
                        (newEventForm.action_category === "custom_member" ||
                          newEventForm.action_category === "custom_department") &&
                        ((!newEventForm.bonus ||
                          (newEventForm.action_category === "custom_member" && newEventForm.organizers.length === 0) ||
                          (newEventForm.action_category === "custom_department" && !newEventForm.department_id)))) ||
                      (newEventStep === 4 &&
                        newEventForm.action_category === "composite" &&
                        !newEventForm.attendants_link_validated)
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
                      (newEventForm.action_category === "composite" && !newEventForm.attendants_link) ||
                      (newEventForm.action_category === "department" && !newEventForm.department_id) ||
                      ((newEventForm.action_category === "member" || newEventForm.action_category === "custom_member") && newEventForm.organizers.length === 0)
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
                        Create Event
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {newEventForm.show_link_popup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Google Sheets Link</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeLinkPopup}
                disabled={newEventForm.link_validating}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Google Sheets URL</Label>
                <Input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?output=csv"
                  value={newEventForm.link_input}
                  onChange={(e) =>
                    setNewEventForm({
                      ...newEventForm,
                      link_input: e.target.value,
                      link_error: "",
                    })
                  }
                  disabled={newEventForm.link_validating}
                  className="enhanced-input"
                />
                <p className="text-xs text-muted-foreground">Make sure the link includes the "output=csv" parameter</p>
              </div>

              {newEventForm.link_error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{newEventForm.link_error}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleLinkValidation}
                disabled={newEventForm.link_validating || !newEventForm.link_input.trim()}
                className="w-full"
              >
                {newEventForm.link_validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
