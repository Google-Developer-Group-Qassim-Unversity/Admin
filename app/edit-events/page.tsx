"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Edit, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react"
import Link from "next/link"
import { type Department, MOCK_DATA } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { MemberSelector } from "@/components/member-selector"

const EXTENDED_MOCK_DATA = {
  ...MOCK_DATA,
  actions: [
    {
      id: 1,
      name: "Attend Event",
      points: 10,
      requires_attendance: true,
      participation_types: ["Attendee", "Volunteer"],
    },
    { id: 2, name: "Create Event", points: 25, requires_attendance: false, participation_types: ["Organizer"] },
    {
      id: 3,
      name: "Lead Workshop",
      points: 50,
      requires_attendance: true,
      participation_types: ["Facilitator", "Co-facilitator", "Assistant"],
    },
    {
      id: 4,
      name: "Complete Training",
      points: 15,
      requires_attendance: true,
      participation_types: ["Participant", "Observer"],
    },
  ],
  existingEvents: [
    {
      id: 1,
      name: "Annual Conference 2024",
      date: "2024-03-15",
      department: "Engineering",
      action: "Attend Event",
      members: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          phone_number: "123-456-7890",
          uni_id: "UNI001",
          participation_type: "Attendee",
          attendance_date: "2024-03-15",
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          phone_number: "123-456-7891",
          uni_id: "UNI002",
          participation_type: "Volunteer",
          attendance_date: "2024-03-15",
        },
      ],
    },
    {
      id: 2,
      name: "Team Building Workshop",
      date: "2024-04-20",
      department: "Marketing",
      action: "Lead Workshop",
      members: [
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          phone_number: "123-456-7892",
          uni_id: "UNI003",
          participation_type: "Facilitator",
          attendance_date: "2024-04-20",
        },
      ],
    },
  ],
}

interface EditEventForm {
  id: number
  name: string
  date: string
  department_id: string
  action_id: string
  members: Array<{
    id: number
    name: string
    email: string
    phone_number: string
    uni_id: string
    participation_type: string
    attendance_date: string
  }>
}

export default function EditEventsPage() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [existingEvents, setExistingEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Edit Event State
  const [selectedEventId, setSelectedEventId] = useState("")
  const [editEventForm, setEditEventForm] = useState<EditEventForm | null>(null)
  const [expandedMembers, setExpandedMembers] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setDepartments(EXTENDED_MOCK_DATA.departments)
      setActions(EXTENDED_MOCK_DATA.actions)
      setExistingEvents(EXTENDED_MOCK_DATA.existingEvents)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditEventSelect = (eventId: string) => {
    const event = existingEvents.find((e) => e.id.toString() === eventId)
    if (event) {
      setEditEventForm({
        id: event.id,
        name: event.name,
        date: event.date,
        department_id: departments.find((d) => d.name === event.department)?.id.toString() || "",
        action_id: actions.find((a) => a.name === event.action)?.id.toString() || "",
        members: event.members,
      })
    }
    setSelectedEventId(eventId)
  }

  const handleMemberSelect = (member: any) => {
    if (editEventForm) {
      setEditEventForm({
        ...editEventForm,
        members: [...editEventForm.members, member],
      })
    }
  }

  const removeMemberFromEvent = (memberId: number) => {
    if (editEventForm) {
      setEditEventForm({
        ...editEventForm,
        members: editEventForm.members.filter((m) => m.id !== memberId),
      })
    }
  }

  const updateEventMember = (memberId: number, field: string, value: string) => {
    if (editEventForm) {
      const updatedMembers = editEventForm.members.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member,
      )
      setEditEventForm({ ...editEventForm, members: updatedMembers })
    }
  }

  const handleEditEventSubmit = async () => {
    setSubmitting(true)
    try {
      console.log("Updating event:", editEventForm)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      toast({
        title: "Success",
        description: "Event updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!editEventForm) return

    setSubmitting(true)
    try {
      console.log("Deleting event:", editEventForm.id)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      toast({
        title: "Success",
        description: "Event deleted successfully",
      })

      setEditEventForm(null)
      setSelectedEventId("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
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
              <h1 className="text-2xl font-heading font-bold text-secondary">Edit Existing Events</h1>
              <p className="text-sm text-muted-foreground">Select and modify existing events</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-secondary">
                <Edit className="h-5 w-5" />
                Edit Existing Event
              </CardTitle>
              <CardDescription>Select and modify existing events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Event Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Select Event to Edit</h3>
                <Select value={selectedEventId} onValueChange={handleEditEventSelect}>
                  <SelectTrigger className="enhanced-select">
                    <SelectValue placeholder="Search and select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name} - {event.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Event Editor */}
              {editEventForm && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Event Name</Label>
                      <Input
                        value={editEventForm.name}
                        onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value })}
                        className="enhanced-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Event Date</Label>
                      <Input
                        type="date"
                        value={editEventForm.date}
                        onChange={(e) => setEditEventForm({ ...editEventForm, date: e.target.value })}
                        className="enhanced-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select
                        value={editEventForm.department_id}
                        onValueChange={(value) => setEditEventForm({ ...editEventForm, department_id: value })}
                      >
                        <SelectTrigger className="enhanced-select">
                          <SelectValue />
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
                      <Label>Action</Label>
                      <Select
                        value={editEventForm.action_id}
                        onValueChange={(value) => setEditEventForm({ ...editEventForm, action_id: value })}
                      >
                        <SelectTrigger className="enhanced-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actions.map((action) => (
                            <SelectItem key={action.id} value={action.id.toString()}>
                              {action.name} ({action.points} points)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setExpandedMembers(!expandedMembers)}
                        className="p-0 h-auto font-medium"
                      >
                        Members List ({editEventForm.members.length})
                        {expandedMembers ? (
                          <ChevronUp className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                      <MemberSelector
                        onMemberSelect={handleMemberSelect}
                        participationTypes={
                          actions.find((a) => a.id.toString() === editEventForm.action_id)?.participation_types || []
                        }
                        eventDate={editEventForm.date}
                      />
                    </div>

                    {expandedMembers && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {editEventForm.members.map((member) => (
                          <div key={member.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{member.participation_type || "No Type"}</Badge>
                              <Button
                                type="button"
                                onClick={() => removeMemberFromEvent(member.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Name"
                                value={member.name}
                                onChange={(e) => updateEventMember(member.id, "name", e.target.value)}
                                className="enhanced-input"
                              />
                              <Input
                                placeholder="University ID"
                                value={member.uni_id}
                                onChange={(e) => updateEventMember(member.id, "uni_id", e.target.value)}
                                className="enhanced-input"
                              />
                              <Input
                                type="email"
                                placeholder="Email"
                                value={member.email}
                                onChange={(e) => updateEventMember(member.id, "email", e.target.value)}
                                className="enhanced-input"
                              />
                              <Input
                                placeholder="Phone"
                                value={member.phone_number}
                                onChange={(e) => updateEventMember(member.id, "phone_number", e.target.value)}
                                className="enhanced-input"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Select
                                value={member.participation_type}
                                onValueChange={(value) => updateEventMember(member.id, "participation_type", value)}
                              >
                                <SelectTrigger className="enhanced-select">
                                  <SelectValue placeholder="Participation type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {actions
                                    .find((a) => a.id.toString() === editEventForm.action_id)
                                    ?.participation_types?.map((type: string) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="date"
                                value={member.attendance_date}
                                onChange={(e) => updateEventMember(member.id, "attendance_date", e.target.value)}
                                className="enhanced-input"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="destructive" onClick={handleDeleteEvent} disabled={submitting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Event
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditEventForm(null)
                          setSelectedEventId("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleEditEventSubmit}
                        disabled={submitting}
                        className="bg-secondary hover:bg-secondary/90"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
