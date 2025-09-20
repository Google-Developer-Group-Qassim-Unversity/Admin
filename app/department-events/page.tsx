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
import { Badge } from "@/components/ui/badge"

const BaseUrl = "http://localhost:7001";

interface ApiAction {
  id: number
  "action name": string
  "action arabic name": string
  "action type": string
  "action description": string
  points: number
}

interface ApiActionsResponse {
  "composite action": ApiAction[]
  "department action": ApiAction[]
  "member action": ApiAction[]
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
    { id: 1, name: "John Smith", email: "john.smith@university.edu", uni_id: "U001", department: "Computer Science" },
    { id: 2, name: "Sarah Johnson", email: "sarah.johnson@university.edu", uni_id: "U002", department: "Engineering" },
    { id: 3, name: "Michael Brown", email: "michael.brown@university.edu", uni_id: "U003", department: "Business" },
    { id: 4, name: "Emily Davis", email: "emily.davis@university.edu", uni_id: "U004", department: "Mathematics" },
    { id: 5, name: "David Wilson", email: "david.wilson@university.edu", uni_id: "U005", department: "Physics" },
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
  show_link_popup: boolean
  link_input: string
  link_validating: boolean
  link_error: string
}

export default function AddNewEventPage() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
  }>({
    composite_actions: [],
    department_actions: [],
    member_actions: [],
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

      const transformedActions = {
        composite_actions: apiData["composite action"].map((action) => ({
          id: action.id,
          name: action["action description"],
          points: action.points,
          requires_attendance: true,
          participation_types: ["Participant"],
        })),
        department_actions: apiData["department action"].map((action) => ({
          id: action.id,
          name: action["action description"],
          points: action.points,
          requires_attendance: false,
          participation_types: ["Participant"],
        })),
        member_actions: apiData["member action"].map((action) => ({
          id: action.id,
          name: action["action description"],
          points: action.points,
          requires_attendance: true,
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
        return 4
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
    })
  }

  const addOrganizer = () => {
    setNewEventForm({
      ...newEventForm,
      organizers: [
        ...newEventForm.organizers,
        {
          name: "",
          email: "",
          phone_number: "",
          uni_id: "",
          participation_type: "",
        },
      ],
    })
  }

  const removeOrganizer = (index: number) => {
    setNewEventForm({
      ...newEventForm,
      organizers: newEventForm.organizers.filter((_, i) => i !== index),
    })
  }

  const updateOrganizer = (index: number, field: string, value: string) => {
    const updatedOrganizers = [...newEventForm.organizers]
    updatedOrganizers[index] = { ...updatedOrganizers[index], [field]: value }
    setNewEventForm({ ...newEventForm, organizers: updatedOrganizers })
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

  const handleAddNewMember = () => {
    // In a real app, this would make an API call to add the member
    console.log("Adding new member:", newEventForm.new_member_name)

    // Reset the form and hide the add member form
    setNewEventForm({
      ...newEventForm,
      show_add_member_form: false,
      selected_existing_member: null,
      new_member_name: "",
      new_member_email: "",
      new_member_phone: "",
      new_member_uni_id: "",
      new_member_organizer_type: "volunteer",
    })

    toast({
      title: "Success",
      description: "New member added successfully",
    })
  }

  const handleSelectExistingMember = (member: any) => {
    setNewEventForm({
      ...newEventForm,
      selected_existing_member: member,
      show_add_member_form: true,
      new_member_name: member.name,
      new_member_email: member.email,
      new_member_phone: member.phone_number || "",
      new_member_uni_id: member.uni_id,
      new_member_organizer_type: "",
    })
  }

  const handleAddAsOrganizer = () => {
    let newOrganizer

    if (newEventForm.selected_existing_member) {
      // Adding existing member
      newOrganizer = {
        name: newEventForm.new_member_name,
        email: newEventForm.new_member_email,
        phone_number: newEventForm.new_member_phone,
        uni_id: newEventForm.new_member_uni_id,
        participation_type: newEventForm.new_member_organizer_type,
      }
    } else {
      // Adding new member
      newOrganizer = {
        name: newEventForm.new_member_name,
        email: newEventForm.new_member_email,
        phone_number: newEventForm.new_member_phone,
        uni_id: newEventForm.new_member_uni_id,
        participation_type: newEventForm.new_member_organizer_type,
      }
    }

    // Check if organizer already exists
    const exists = newEventForm.organizers.some((org) => org.uni_id === newOrganizer.uni_id)

    if (exists) {
      toast({
        title: "Member already added",
        description: "This member is already in the organizers list.",
        variant: "destructive",
      })
      return
    }

    setNewEventForm({
      ...newEventForm,
      organizers: [...newEventForm.organizers, newOrganizer],
      show_add_member_form: false,
      selected_existing_member: null,
      new_member_name: "",
      new_member_email: "",
      new_member_phone: "",
      new_member_uni_id: "",
      new_member_organizer_type: "volunteer",
    })

    toast({
      title: "Organizer added",
      description: `${newOrganizer.name} has been added as a ${newOrganizer.participation_type}.`,
    })
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
      

      if (true) {
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
          link_error: `${errorData.error}:
          \n\n${errorData.detail}`,
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
        Organizers: newEventForm.organizers.length > 0 ? newEventForm.organizers : null
      }

      let eventData;

      switch (newEventForm.action_category) {
        case "composite":
          eventData = {
            ...baseEventData,
            action: "composite",
            action_id: newEventForm.action_id,
            department_id: newEventForm.department_id,
            members_link: newEventForm.attendants_link,
          }
          break;
        
        case "department":
          eventData = {
            ...baseEventData,
            action: "department",
            action_id: parseInt(newEventForm.action_id),
            department_id: parseInt(newEventForm.department_id),
          }
          break;

        case "member":
          eventData = {
            ...baseEventData,
            action: "member",
            action_id: parseInt(newEventForm.action_id),
            member_id: newEventForm.selected_member_id,
          }
          break;

        case "custom_member":
          eventData = {
            ...baseEventData,
            action: "custom_member",
            member_id: newEventForm.selected_member_id,
            points: parseInt(newEventForm.custom_points_awarded),
          }
          break;

        case "custom_department":
          eventData = {
            ...baseEventData,
            action: "custom_department",
            department_id: parseInt(newEventForm.department_id),
            points: parseInt(newEventForm.custom_points_awarded),
          }
          break;

        default:
          throw new Error("Invalid action category")
      }
      console.log("Submitting event data...", JSON.stringify(eventData, null, 2))
      const response = await fetch(`${BaseUrl}/events`, {
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
        show_link_popup: false,
        link_input: "",
        link_validating: false,
        link_error: "",
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

                  {(newEventForm.action_category === "custom_member" ||
                    newEventForm.action_category === "custom_department") && (
                    <div className="space-y-4">
                      <Label>Event Selection *</Label>
                      <RadioGroup
                        value={newEventForm.event_selection_type}
                        onValueChange={(value: "new" | "existing") =>
                          setNewEventForm({ ...newEventForm, event_selection_type: value })
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="new-event" />
                          <Label htmlFor="new-event">Create New Event</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing-event" />
                          <Label htmlFor="existing-event">Select Existing Event</Label>
                        </div>
                      </RadioGroup>

                      {newEventForm.event_selection_type === "existing" && (
                        <div className="space-y-2">
                          <Label>Choose Existing Event *</Label>
                          <Select
                            value={newEventForm.selected_existing_event_id}
                            onValueChange={(value) =>
                              setNewEventForm({ ...newEventForm, selected_existing_event_id: value })
                            }
                          >
                            <SelectTrigger className="enhanced-select">
                              <SelectValue placeholder="Select an existing event" />
                            </SelectTrigger>
                            <SelectContent>
                              {EXTENDED_MOCK_DATA.existing_events.map((event) => (
                                <SelectItem key={event.id} value={event.id.toString()}>
                                  {event.title} - {event.date}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {(newEventForm.event_selection_type === "new" ||
                    (newEventForm.action_category !== "custom_member" &&
                      newEventForm.action_category !== "custom_department")) && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Title *</Label>
                        <Input
                          placeholder="Enter event title"
                          value={newEventForm.event_title}
                          onChange={(e) => setNewEventForm({ ...newEventForm, event_title: e.target.value })}
                          className="enhanced-input"
                        />
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
                                onChange={(e) => setNewEventForm({ ...newEventForm, event_date: e.target.value })}
                                className="enhanced-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={newEventForm.event_end_date}
                                onChange={(e) => setNewEventForm({ ...newEventForm, event_end_date: e.target.value })}
                                className="enhanced-input"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {newEventStep === 3 && newEventForm.action_category === "member" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Step 3: Add Members</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Member Selection Method *</Label>
                      <RadioGroup
                        value={newEventForm.member_selection_type || "single"}
                        onValueChange={(value: "single" | "bulk") =>
                          setNewEventForm({ ...newEventForm, member_selection_type: value })
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single" id="single-member" />
                          <Label htmlFor="single-member" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Add Single Member
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bulk" id="bulk-members" />
                          <Label htmlFor="bulk-members" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Add Bulk Members
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {(newEventForm.member_selection_type || "single") === "single" && (
                      <div className="space-y-2">
                        <Label>Select Member *</Label>
                        <MemberSelector
                          onMemberSelect={(member) =>
                            setNewEventForm({ ...newEventForm, selected_member_id: member.id.toString() })
                          }
                          selectedMemberId={newEventForm.selected_member_id}
                          participationTypes={getSelectedAction()?.participation_types || []}
                          eventDate={newEventForm.event_date}
                        />
                      </div>
                    )}

                    {newEventForm.member_selection_type === "bulk" && (
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
                            Add a Google Sheets link with output=csv parameter containing member data
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {newEventStep === 3 && newEventForm.action_category === "custom_member" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Step 3: Select Member and Award Points</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Member *</Label>
                      <MemberSelector
                        onMemberSelect={(member) =>
                          setNewEventForm({ ...newEventForm, selected_member_id: member.id.toString() })
                        }
                        selectedMemberId={newEventForm.selected_member_id}
                        participationTypes={[]}
                        eventDate={newEventForm.custom_points_date}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Points Awarded *</Label>
                      <Input
                        type="number"
                        placeholder="Enter points value"
                        value={newEventForm.custom_points_awarded}
                        onChange={(e) => setNewEventForm({ ...newEventForm, custom_points_awarded: e.target.value })}
                        className="enhanced-input"
                      />
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
                      <Label>Points Awarded *</Label>
                      <Input
                        type="number"
                        placeholder="Enter points value"
                        value={newEventForm.custom_points_awarded}
                        onChange={(e) => setNewEventForm({ ...newEventForm, custom_points_awarded: e.target.value })}
                        className="enhanced-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newEventStep === 3 &&
                (newEventForm.action_category === "composite" || newEventForm.action_category === "department") && (
                  <div className="space-y-4">
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

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or add members individually</span>
                      </div>
                    </div>

                    {/* Member Search and Selection */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Search Members</Label>
                        <Input
                          placeholder="Search by name, email, ID, or department..."
                          value={newEventForm.member_search_query}
                          onChange={(e) => setNewEventForm({ ...newEventForm, member_search_query: e.target.value })}
                          className="enhanced-input"
                        />
                      </div>

                      {/* Member Preview List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Available Members (showing {Math.min(5, getFilteredMembers().length)} of{" "}
                            {getFilteredMembers().length})
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setNewEventForm({
                                ...newEventForm,
                                show_add_member_form: !newEventForm.show_add_member_form,
                              })
                            }
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Member
                          </Button>
                        </div>

                        <div className="grid gap-3 max-h-80 overflow-y-auto">
                          {getFilteredMembers()
                            .slice(0, 5)
                            .map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-primary">
                                        {member.name
                                          .split(" ")
                                          .map((n: any) => n[0])
                                          .join("")}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{member.name}</p>
                                      <p className="text-xs text-muted-foreground">{member.email}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                          {member.uni_id}
                                        </span>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                          {member.department}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Button type="button" size="sm" onClick={() => handleSelectExistingMember(member)}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            ))}
                        </div>

                        {getFilteredMembers().length > 5 && (
                          <p className="text-sm text-muted-foreground text-center">
                            {getFilteredMembers().length - 5} more members available. Use search to find specific
                            members.
                          </p>
                        )}

                        {getFilteredMembers().length === 0 && newEventForm.member_search_query && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No members found matching "{newEventForm.member_search_query}"</p>
                            <p className="text-sm">Try a different search term or add a new member</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add New Member Form */}
                    {newEventForm.show_add_member_form && (
                      <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {newEventForm.selected_existing_member
                              ? "Add Existing Member as Organizer"
                              : "Add New Member"}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setNewEventForm({
                                ...newEventForm,
                                show_add_member_form: false,
                                selected_existing_member: null,
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Full Name *"
                            value={newEventForm.new_member_name}
                            onChange={(e) =>
                              setNewEventForm({
                                ...newEventForm,
                                new_member_name: e.target.value,
                              })
                            }
                            className="enhanced-input"
                            readOnly={!!newEventForm.selected_existing_member}
                            disabled={!!newEventForm.selected_existing_member}
                          />
                          <Input
                            placeholder="University ID *"
                            value={newEventForm.new_member_uni_id}
                            onChange={(e) =>
                              setNewEventForm({
                                ...newEventForm,
                                new_member_uni_id: e.target.value,
                              })
                            }
                            className="enhanced-input"
                            readOnly={!!newEventForm.selected_existing_member}
                            disabled={!!newEventForm.selected_existing_member}
                          />
                          <Input
                            type="email"
                            placeholder="Email *"
                            value={newEventForm.new_member_email}
                            onChange={(e) =>
                              setNewEventForm({
                                ...newEventForm,
                                new_member_email: e.target.value,
                              })
                            }
                            className="enhanced-input"
                            readOnly={!!newEventForm.selected_existing_member}
                            disabled={!!newEventForm.selected_existing_member}
                          />
                          <Input
                            placeholder="Phone Number"
                            value={newEventForm.new_member_phone}
                            onChange={(e) =>
                              setNewEventForm({
                                ...newEventForm,
                                new_member_phone: e.target.value,
                              })
                            }
                            className="enhanced-input"
                            readOnly={!!newEventForm.selected_existing_member}
                            disabled={!!newEventForm.selected_existing_member}
                          />
                        </div>
                        <Select
                          value={newEventForm.new_member_organizer_type}
                          onValueChange={(value) =>
                            setNewEventForm({
                              ...newEventForm,
                              new_member_organizer_type: value,
                            })
                          }
                        >
                          <SelectTrigger className="enhanced-select">
                            <SelectValue placeholder="Select Organizer Type *" />
                          </SelectTrigger>
                          <SelectContent>
                            {contributorActions.map((action) => (
                              <SelectItem key={action.id} value={action.id.toString()}>
                                {action["action name"]} ({action.points} pts)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={handleAddAsOrganizer}
                          disabled={
                            newEventForm.selected_existing_member
                              ? !newEventForm.new_member_organizer_type
                              : !newEventForm.new_member_name ||
                                !newEventForm.new_member_email ||
                                !newEventForm.new_member_uni_id ||
                                !newEventForm.new_member_organizer_type
                          }
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {newEventForm.selected_existing_member ? "Add as Organizer" : "Add Member"}
                        </Button>
                      </div>
                    )}

                    {/* Current Organizers List */}
                    {newEventForm.organizers.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Added Organizers ({newEventForm.organizers.length})
                          </Label>
                        </div>

                        <div className="space-y-3">
                          {newEventForm.organizers.map((organizer, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-muted/20">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="capitalize">
                                    {organizer.participation_type}
                                  </Badge>
                                  <span className="font-medium">{organizer.name}</span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeOrganizer(index)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>Email: {organizer.email}</div>
                                <div>Phone: {organizer.phone_number}</div>
                                <div>University ID: {organizer.uni_id}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                        (newEventForm.action_category === "custom_member" ||
                          newEventForm.action_category === "custom_department") &&
                        newEventForm.event_selection_type === "existing" &&
                        !newEventForm.selected_existing_event_id) ||
                      (newEventStep === 2 &&
                        (newEventForm.event_selection_type === "new" ||
                          (newEventForm.action_category !== "custom_member" &&
                            newEventForm.action_category !== "custom_department")) &&
                        (!newEventForm.event_title ||
                          !newEventForm.event_date ||
                          (newEventForm.date_type === "range" && !newEventForm.event_end_date))) ||
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
                        (!newEventForm.custom_points_awarded ||
                          (newEventForm.action_category === "custom_member" && !newEventForm.selected_member_id) ||
                          (newEventForm.action_category === "custom_department" && !newEventForm.department_id)))
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
                      (newEventForm.action_category === "composite" && !newEventForm.attendants_link)
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
