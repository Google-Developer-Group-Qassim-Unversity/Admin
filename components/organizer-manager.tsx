"use client"
import { useState, useEffect } from "react"
import validator from "validator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, User, X, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Organizer {
  name: string
  email: string
  phone_number: string
  uni_id: string
  participation_action_id: string
  gender: "Male" | "Female"
  attendance: string[]
}

interface OrganizerManagerProps {
  organizers: Organizer[]
  onOrganizersChange: (organizers: Organizer[]) => void
  members: any[]
  contributorActions: Array<{
    id: number
    "action name": string
    "action arabic name": string
    "action type": string
    "action description": string
    points: number
  }>
  eventDays: Date[]
  mode: "department" | "composite" // department = auto volunteer, composite = user chooses
  memberSearchQuery: string
  onMemberSearchChange: (query: string) => void
  onAddingMemberStateChange?: (isAdding: boolean) => void // New callback for adding member state
  skipAttendance?: boolean // New prop to skip attendance selection
}

export function OrganizerManager({
  organizers,
  onOrganizersChange,
  members,
  contributorActions,
  eventDays,
  mode,
  memberSearchQuery,
  onMemberSearchChange,
  onAddingMemberStateChange,
  skipAttendance = false,
}: OrganizerManagerProps) {
  const { toast } = useToast()
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [selectedExistingMember, setSelectedExistingMember] = useState<any | null>(null)
  const [editingOrganizerIndex, setEditingOrganizerIndex] = useState<number | null>(null)
  const [newMemberAttendance, setNewMemberAttendance] = useState<string[]>([])
  
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    phone: "",
    uni_id: "",
    organizer_type: "",
    gender: "" as "Male" | "Female" | "",
  })

  const [validationErrors, setValidationErrors] = useState({
    email: "",
    phone: "",
    uni_id: "",
  })

  // Notify parent when adding member state changes
  useEffect(() => {
    onAddingMemberStateChange?.(showAddMemberForm)
  }, [showAddMemberForm, onAddingMemberStateChange])

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    return validator.isEmail(email, {
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false,
      domain_specific_validation: true,
      blacklisted_chars: '',
      host_blacklist: []
    })
  }

  const isValidUniId = (uniId: string): boolean => {
    return /^\d{9}$/.test(uniId)
  }

  const isValidPhoneNumber = (phone: string): boolean => {
    return phone === "" || /^\d{10}$/.test(phone)
  }

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "email":
        if (!value) return ""
        if (!isValidEmail(value)) {
          return "Please enter a valid email address"
        }
        return ""
      case "uni_id":
        if (!value) return ""
        if (!isValidUniId(value)) {
          return "University ID must be exactly 9 digits"
        }
        return ""
      case "phone":
        if (!value) return ""
        if (!isValidPhoneNumber(value)) {
          return "Phone number must be exactly 10 digits"
        }
        return ""
      default:
        return ""
    }
  }

  const isNewMemberFormValid = (): boolean => {
    if (selectedExistingMember) {
      return mode === "composite" ? newMemberForm.organizer_type !== "" : true
    }
    
    const baseValidation = (
      newMemberForm.name.trim() !== "" &&
      isValidEmail(newMemberForm.email) &&
      isValidUniId(newMemberForm.uni_id) &&
      isValidPhoneNumber(newMemberForm.phone) &&
      newMemberForm.gender !== "" &&
      !validationErrors.email &&
      !validationErrors.phone &&
      !validationErrors.uni_id
    )

    return mode === "composite" 
      ? baseValidation && newMemberForm.organizer_type !== ""
      : baseValidation
  }

  const getFilteredMembers = () => {
    if (!memberSearchQuery) {
      return members
    }
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        (member.uni_id?.toLowerCase?.() || "").includes(memberSearchQuery.toLowerCase())
    )
  }

  const handleSelectExistingMember = (member: any) => {
    if (skipAttendance) {
      // For custom member points flow, add the member immediately without showing the form
      const attendance = eventDays.map(() => "present")
      
      // Get participation action ID
      let participationActionId: string
      if (mode === "department") {
        const volunteerAction = contributorActions.find(action => 
          action["action name"].toLowerCase() === "volunteer"
        )
        participationActionId = volunteerAction ? volunteerAction.id.toString() : "1"
      } else {
        participationActionId = "1" // Default fallback
      }
      
      const organizer: Organizer = {
        name: member.name,
        email: member.email,
        phone_number: member.phone_number || "",
        uni_id: member.uni_id,
        participation_action_id: participationActionId,
        gender: member.gender as "Male" | "Female",
        attendance,
      }

      // Check if member is already added
      const existingOrganizerIndex = organizers.findIndex(org => org.uni_id === member.uni_id)
      if (existingOrganizerIndex !== -1) {
        toast({
          title: "Warning",
          description: "This member is already added to the event",
          variant: "destructive",
        })
        return
      }

      // Add the member directly to the organizers list
      onOrganizersChange([...organizers, organizer])
      
      toast({
        title: "Success",
        description: `${member.name} has been added to the event`,
      })
    } else {
      // Original behavior for other flows
      setSelectedExistingMember(member)
      setShowAddMemberForm(true)
      setNewMemberForm({
        name: member.name,
        email: member.email,
        phone: member.phone_number || "",
        uni_id: member.uni_id,
        organizer_type: "",
        gender: member.gender || "",
      })
      setNewMemberAttendance(eventDays.map(() => "absent"))
    }
  }

  const handleAddAsOrganizer = () => {
    const attendance = skipAttendance 
      ? eventDays.map(() => "present") // Auto-set to present when skipping attendance selection
      : newMemberAttendance.length === eventDays.length 
        ? newMemberAttendance 
        : eventDays.map(() => "absent")
    
    // Get participation action ID
    let participationActionId: string
    if (mode === "department") {
      const volunteerAction = contributorActions.find(action => 
        action["action name"].toLowerCase() === "volunteer"
      )
      participationActionId = volunteerAction ? volunteerAction.id.toString() : "1"
    } else {
      participationActionId = newMemberForm.organizer_type
    }
    
    const organizer: Organizer = {
      name: newMemberForm.name,
      email: newMemberForm.email,
      phone_number: newMemberForm.phone,
      uni_id: newMemberForm.uni_id,
      participation_action_id: participationActionId,
      gender: newMemberForm.gender as "Male" | "Female",
      attendance,
    }

    // Check if we're editing an existing organizer
    if (editingOrganizerIndex !== null) {
      // Check if uni_id conflicts with other organizers (excluding the one being edited)
      const exists = organizers.some((org, index) => 
        index !== editingOrganizerIndex && org.uni_id === organizer.uni_id
      )

      if (exists) {
        toast({
          title: "Member already added",
          description: "This member is already in the organizers list.",
          variant: "destructive",
        })
        return
      }

      // Update existing organizer
      const updatedOrganizers = [...organizers]
      updatedOrganizers[editingOrganizerIndex] = organizer
      onOrganizersChange(updatedOrganizers)
      
      const actionName = mode === "department" 
        ? "organizer"
        : contributorActions.find(action => action.id.toString() === organizer.participation_action_id)?.["action name"] || organizer.participation_action_id
      
      toast({
        title: "Organizer updated",
        description: `${organizer.name} has been updated as ${actionName}.`,
      })
    } else {
      // Check if organizer already exists (for new additions)
      const exists = organizers.some((org) => org.uni_id === organizer.uni_id)

      if (exists) {
        toast({
          title: "Member already added",
          description: "This member is already in the organizers list.",
          variant: "destructive",
        })
        return
      }

      // Add new organizer
      onOrganizersChange([...organizers, organizer])
      
      const actionName = mode === "department" 
        ? "organizer"
        : contributorActions.find(action => action.id.toString() === organizer.participation_action_id)?.["action name"] || organizer.participation_action_id
      
      toast({
        title: "Organizer added",
        description: `${organizer.name} has been added as ${actionName}.`,
      })
    }

    resetForm()
  }

  const removeOrganizer = (index: number) => {
    onOrganizersChange(organizers.filter((_, i) => i !== index))
  }

  const editOrganizer = (index: number) => {
    const organizer = organizers[index]
    setEditingOrganizerIndex(index)
    setNewMemberForm({
      name: organizer.name,
      email: organizer.email,
      phone: organizer.phone_number || "",
      uni_id: organizer.uni_id,
      organizer_type: organizer.participation_action_id,
      gender: organizer.gender as "Male" | "Female",
    })
    setNewMemberAttendance(organizer.attendance || eventDays.map(() => "absent"))
    setShowAddMemberForm(true)
    setSelectedExistingMember(null)
  }

  const resetForm = () => {
    setShowAddMemberForm(false)
    setSelectedExistingMember(null)
    setEditingOrganizerIndex(null)
    setNewMemberForm({
      name: "",
      email: "",
      phone: "",
      uni_id: "",
      organizer_type: "",
      gender: "",
    })
    setValidationErrors({
      email: "",
      phone: "",
      uni_id: "",
    })
    setNewMemberAttendance([])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search Members</Label>
        <Input
          placeholder="Search by name, email, ID, or department..."
          value={memberSearchQuery}
          onChange={(e) => onMemberSearchChange(e.target.value)}
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
            onClick={() => {
              setShowAddMemberForm(!showAddMemberForm)
              setNewMemberAttendance(skipAttendance ? eventDays.map(() => "present") : eventDays.map(() => "absent"))
            }}
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
                      <User className="h-5 w-5 text-primary" />
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
            {getFilteredMembers().length - 5} more members available. Use search to find specific members.
          </p>
        )}

        {getFilteredMembers().length === 0 && memberSearchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No members found matching "{memberSearchQuery}"</p>
            <p className="text-sm">Try a different search term or add a new member</p>
          </div>
        )}
      </div>

      {/* Add New Member Form */}
      {showAddMemberForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {editingOrganizerIndex !== null 
                ? "Edit Organizer" 
                : selectedExistingMember 
                  ? "Add Existing Member as Organizer" 
                  : "Add New Member"
              }
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Full Name *"
              value={newMemberForm.name}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
              className="enhanced-input"
              readOnly={!!selectedExistingMember}
              disabled={!!selectedExistingMember}
            />
            <Input
              placeholder="University ID *"
              value={newMemberForm.uni_id}
              onChange={(e) => {
                setNewMemberForm({ ...newMemberForm, uni_id: e.target.value })
                const error = validateField("uni_id", e.target.value)
                setValidationErrors({ ...validationErrors, uni_id: error })
              }}
              className={`enhanced-input ${validationErrors.uni_id ? "border-red-500 focus:border-red-500" : ""}`}
              readOnly={!!selectedExistingMember}
              disabled={!!selectedExistingMember}
            />
            <Input
              type="email"
              placeholder="Email *"
              value={newMemberForm.email}
              onChange={(e) => {
                setNewMemberForm({ ...newMemberForm, email: e.target.value })
                const error = validateField("email", e.target.value)
                setValidationErrors({ ...validationErrors, email: error })
              }}
              className={`enhanced-input ${validationErrors.email ? "border-red-500 focus:border-red-500" : ""}`}
              readOnly={!!selectedExistingMember}
              disabled={!!selectedExistingMember}
            />
            <Input
              placeholder="Phone Number"
              value={newMemberForm.phone}
              onChange={(e) => {
                setNewMemberForm({ ...newMemberForm, phone: e.target.value })
                const error = validateField("phone", e.target.value)
                setValidationErrors({ ...validationErrors, phone: error })
              }}
              className={`enhanced-input ${validationErrors.phone ? "border-red-500 focus:border-red-500" : ""}`}
              readOnly={!!selectedExistingMember}
              disabled={!!selectedExistingMember}
            />
          </div>
          
          <Select
            value={newMemberForm.gender}
            onValueChange={(value: "Male" | "Female") => setNewMemberForm({ ...newMemberForm, gender: value })}
            disabled={!!selectedExistingMember}
          >
            <SelectTrigger className="enhanced-select">
              <SelectValue placeholder="Select Gender *" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>

          {/* Participation Type Selection (only for composite actions) */}
          {mode === "composite" && (
            <Select
              value={newMemberForm.organizer_type}
              onValueChange={(value) => setNewMemberForm({ ...newMemberForm, organizer_type: value })}
            >
              <SelectTrigger className="enhanced-select">
                <SelectValue placeholder="Select Participation Type *" />
              </SelectTrigger>
              <SelectContent>
                {contributorActions.map((action) => (
                  <SelectItem key={action.id} value={action.id.toString()}>
                    {action["action name"]} ({action.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Attendance checkboxes */}
          {!skipAttendance && (
            <div className="space-y-2 col-span-2">
              <Label>Attendance</Label>
              <div className="flex flex-wrap gap-6 mb-2">
                {eventDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 bg-white shadow-sm hover:border-primary cursor-pointer transition-all duration-150 ${
                      newMemberAttendance[idx] === "present" 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200"
                    }`}
                    style={{ minWidth: 90 }}
                    onClick={() => {
                      const updated = [...newMemberAttendance]
                      updated[idx] = updated[idx] === "present" ? "absent" : "present"
                      setNewMemberAttendance(updated)
                    }}
                  >
                    <span className="text-xs font-semibold mb-1">Day {idx + 1}</span>
                    <span className="text-xs mt-1 text-gray-500">{day.toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Validation Error Messages - Above the button, outside the grid */}
          {(validationErrors.email || validationErrors.uni_id || validationErrors.phone) && (
            <div className="space-y-1 p-3 bg-red-50 border border-red-200 rounded-lg">
              {validationErrors.email && (
                <p className="text-sm text-red-600">• {validationErrors.email}</p>
              )}
              {validationErrors.uni_id && (
                <p className="text-sm text-red-600">• {validationErrors.uni_id}</p>
              )}
              {validationErrors.phone && (
                <p className="text-sm text-red-600">• {validationErrors.phone}</p>
              )}
            </div>
          )}
          
          <Button
            type="button"
            onClick={handleAddAsOrganizer}
            disabled={!isNewMemberFormValid()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {editingOrganizerIndex !== null 
              ? "Update Organizer" 
              : selectedExistingMember 
                ? "Add as Organizer" 
                : "Add Member"
            }
          </Button>
        </div>
      )}

      {/* Current Organizers List */}
      {organizers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Added Organizers ({organizers.length})
            </Label>
          </div>

          <div className="space-y-3">
            {organizers.map((organizer, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {contributorActions.find(action => action.id.toString() === organizer.participation_action_id)?.["action name"] || organizer.participation_action_id}
                    </Badge>
                    <span className="font-medium">{organizer.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => editOrganizer(index)}
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Email: {organizer.email}</div>
                  <div>Phone: {organizer.phone_number || <span className="text-red-300 italic">empty</span>}</div>
                  <div>University ID: {organizer.uni_id}</div>
                  <div>Gender: {organizer.gender}</div>
                  <div>
                    Attendance: {organizer.attendance && organizer.attendance.length > 0 
                      ? organizer.attendance.map((a, i) => (
                          <span key={i} className={`${a === "present" ? "text-green-600" : "text-red-600"}`}>
                            Day {i + 1}: {a}
                          </span>
                        )).reduce((prev, curr, index) => (
                          <>
                            {prev}
                            {index > 0 && ", "}
                            {curr}
                          </>
                        ))
                      : <span className="text-red-300 italic">empty</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}